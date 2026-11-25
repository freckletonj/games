"""One durable queue consumer. Subprocess groups keep cancellation responsive."""
import json
import os
from pathlib import Path
import signal
import subprocess
import time

import httpx
from PIL import Image

from . import hyworld, store


def stop_process(process):
    if process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()


def launch(argv, cwd, env, log):
    return subprocess.Popen(argv, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)


def run_stage(config, job_id, stage, env, log, active, service=None):
    store.update_job(config, job_id, stage=stage['name'])
    log.write(('\n' + json.dumps({'stage': stage['name'], 'argv': stage['argv']}) + '\n').encode())
    log.flush()
    process = launch(stage['argv'], stage['cwd'], {**env, 'CUDA_VISIBLE_DEVICES': ','.join(stage['gpus'])}, log)
    active.append(process)
    started = time.monotonic()
    try:
        while process.poll() is None:
            if store.one(config, 'jobs', job_id)['cancel']:
                stop_process(process)
                return {'stage': stage['name'], 'cancelled': True, 'seconds': time.monotonic() - started}
            if service is not None and service.poll() is not None:
                raise RuntimeError('Planning VLM stopped during a stage; inspect job.log')
            time.sleep(.2)
        if process.returncode != 0:
            raise RuntimeError(f"{stage['name']} exited with status {process.returncode}; inspect job.log")
        missing = [name for name in stage['expected'] if not Path(name).is_file()]
        if missing:
            raise RuntimeError(f"{stage['name']} exited successfully but expected outputs are missing: {missing}")
        return {'stage': stage['name'], 'returncode': process.returncode, 'seconds': time.monotonic() - started}
    finally:
        stop_process(process)
        active.remove(process)


def start_vlm(config, spec, env, log, active):
    port = config.get('vlm_port', 18080)
    import socket
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise RuntimeError(f'VLM port {port} is already in use; stop the other service or change vlm_port')
    command = hyworld.vlm_command(config, spec['seed'])
    process = launch(command, hyworld.runtime(config), {**env, 'CUDA_VISIBLE_DEVICES': config['gpu_ids'][0]}, log)
    active.append(process)
    deadline = time.monotonic() + config.get('vlm_start_timeout', 600)
    with httpx.Client(timeout=2, trust_env=False) as client:
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError('Planning VLM failed to start; inspect job.log')
            if store.one(config, 'jobs', spec['id'])['cancel']:
                return process
            # Connection refusal is expected only while the local server starts.
            try:
                response = client.get(f'http://127.0.0.1:{port}/health')
            except httpx.TransportError:
                response = None
            if response is not None and response.status_code == 200:
                return process
            time.sleep(.5)
    raise RuntimeError('Planning VLM startup timed out; inspect job.log')


def prepare_inputs(config, job_id, spec, directory):
    inputs = directory / 'input'
    inputs.mkdir()
    (directory / 'output').mkdir()
    import shutil
    for index, identity in enumerate(spec['inputs']):
        artifact = store.one(config, 'artifacts', identity)
        if store.digest(artifact['path']) != artifact['sha256']:
            raise RuntimeError('Input bytes changed after upload')
        if spec['task'] == 'transfer':
            shutil.copyfile(artifact['path'], inputs / f'{index:04d}-{artifact["filename"]}')
        else:
            with Image.open(artifact['path']) as image:
                image.convert('RGB').save(inputs / f'{index:04d}.png')
    if spec['task'] == 'environment':
        (directory / 'scene').mkdir()
        shutil.copyfile(inputs / '0000.png', directory / 'scene/panorama.png')


def collect(config, job_id, directory):
    for path in sorted(directory.rglob('*')):
        if path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(directory.resolve()):
            store.record_artifact(config, path, str(path.relative_to(directory)), job_id)


def execute_job(config, job, active=None):
    active = active if active is not None else []
    identity = job['id']
    spec = json.loads(job['spec'])
    directory = config['state_dir'] / 'jobs' / identity
    directory.mkdir()
    manifest = {'request': spec, 'job_id': identity, 'started': store.now(), 'stages': [],
                'installation': hyworld.installation_status(config),
                'note': 'GPU execution and artistic quality require operator validation. No automatic int8 quantization.'}
    vlm = None
    try:
        prepare_inputs(config, identity, spec, directory)
        stages = hyworld.plan(config, spec, directory)
        manifest['plan'] = stages
        store.write_json(directory / 'manifest.json', manifest)
        env = {**hyworld.environment(config), 'ASSET_JOB_ID': identity}
        with (directory / 'job.log').open('ab', buffering=0) as log:
            for stage in stages:
                if store.one(config, 'jobs', identity)['cancel']:
                    break
                if stage['requires_vlm'] and vlm is None:
                    store.update_job(config, identity, stage='vlm_startup')
                    vlm = start_vlm(config, {**spec, 'id': identity}, env, log, active)
                if not stage['requires_vlm'] and vlm is not None:
                    stop_process(vlm)
                    active.remove(vlm)
                    vlm = None
                if store.one(config, 'jobs', identity)['cancel']:
                    break
                result = run_stage(config, identity, stage, env, log, active, service=vlm)
                manifest['stages'].append(result)
                store.write_json(directory / 'manifest.json', manifest)
        cancelled = bool(store.one(config, 'jobs', identity)['cancel'])
        if not cancelled and not any((directory / 'output').rglob('*')):
            raise RuntimeError('Pipeline produced no final output files')
        store.update_job(config, identity, status='cancelled' if cancelled else 'succeeded')
    except Exception as error:
        # The queue boundary records failed work instead of losing the worker or reporting success.
        store.update_job(config, identity, status='failed', error=str(error))
    finally:
        for process in active[:]:
            stop_process(process)
            active.remove(process)
        manifest['finished'] = store.now()
        manifest['status'] = store.one(config, 'jobs', identity)['status']
        manifest['error'] = store.one(config, 'jobs', identity)['error']
        store.write_json(directory / 'manifest.json', manifest)
        collect(config, identity, directory)


def recover_interrupted(config):
    with store.database(config) as db:
        db.execute("UPDATE jobs SET status='failed',error='Worker interrupted; inspect retained files before resubmission',updated=? WHERE status='running'", (store.now(),))


def run_worker(config, once=False):
    store.initialize(config)
    active = []
    def shutdown(signum, frame):
        for process in active[:]:
            stop_process(process)
        raise SystemExit(0)
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    with store.lock(config, 'worker'):
        recover_interrupted(config)
        while True:
            with store.database(config) as db:
                db.execute('BEGIN IMMEDIATE')
                row = db.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created LIMIT 1").fetchone()
                if row:
                    db.execute("UPDATE jobs SET status='running',updated=? WHERE id=?", (store.now(), row['id']))
            if row:
                execute_job(config, dict(row), active)
            if once:
                return
            time.sleep(.2)
