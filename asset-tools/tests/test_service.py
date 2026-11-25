import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image
from asset_service.api import create_app
from asset_service import deploy, git_ops, hyworld, store, worker

TOKEN = 'test-secret-' * 4


def run(*args, cwd=None):
    return subprocess.check_output(list(args), cwd=cwd, text=True, stderr=subprocess.DEVNULL).strip()


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.remote, self.seed = self.root / 'remote.git', self.root / 'seed'
        run('git', 'init', '--bare', '--initial-branch=main', str(self.remote))
        run('git', 'init', '--initial-branch=main', str(self.seed))
        run('git', 'config', 'user.name', 'Test', cwd=self.seed)
        run('git', 'config', 'user.email', 'test@localhost', cwd=self.seed)
        (self.seed / 'README.md').write_text('initial\n')
        (self.seed / '.gitignore').write_text('ignored/\n')
        (self.seed / 'link').symlink_to(self.root, target_is_directory=True)
        run('git', 'add', '.', cwd=self.seed)
        run('git', 'commit', '-m', 'initial', cwd=self.seed)
        run('git', 'remote', 'add', 'origin', str(self.remote), cwd=self.seed)
        run('git', 'push', 'origin', 'main', cwd=self.seed)
        self.config = {'state_dir': self.root / 'state', 'repository_url': str(self.remote),
                       'protected_branches': ['main'], 'enable_lfs': True, 'chunk_bytes': 32, 'max_upload_bytes': 1024 * 1024,
                       'gpu_ids': ['0', '1'], 'enable_reconstruction': False, 'enable_environment': False}
        store.initialize(self.config)
        git_ops.initialize_repo(self.config)
        self.env = patch.dict(os.environ, {'ASSET_API_TOKEN': TOKEN})
        self.env.start()
        self.client = TestClient(create_app(self.config), headers={'Authorization': f'Bearer {TOKEN}'})

    def tearDown(self):
        self.client.close()
        self.env.stop()
        self.temp.cleanup()

    def upload(self, data=b'\x00\xffbinary\r\n\x80', filename='test.bin'):
        response = self.client.post('/v1/uploads', json={'filename': filename, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        self.assertEqual(response.status_code, 201, response.text)
        identity = response.json()['id']
        for offset in range(0, len(data), 32):
            response = self.client.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': str(offset)}, content=data[offset:offset + 32])
            self.assertEqual(response.status_code, 200, response.text)
        response = self.client.post(f'/v1/uploads/{identity}/complete')
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def branch(self):
        response = self.client.post('/v1/repo/branches', json={'name': 'assets/test'})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()['sha']

    def publication(self, artifact, head, key='publish-1', path='ignored/new.bin'):
        return {'request_key': key, 'branch': 'assets/test', 'expected_head': head,
                'files': [{'artifact_id': artifact['id'], 'path': path}], 'message': 'Publish exact bytes'}

    def submit(self, artifact, key='job-1', task='transfer', **extra):
        return self.client.post('/v1/jobs', json={'request_key': key, 'task': task, 'inputs': [artifact['id']], **extra})

    def test_authentication(self):
        self.assertEqual(self.client.get('/health', headers={'Authorization': 'Bearer wrong'}).status_code, 401)
        result = self.client.get('/v1/capabilities').json()
        self.assertFalse(result['tasks']['environment']['enabled'])
        self.assertFalse(result['hyworld']['installed'])
        self.assertTrue(result['git']['initialized'])
        self.assertNotIn(TOKEN, json.dumps(result))
        self.assertIn('/v1/jobs', self.client.get('/v1/schema').json()['paths'])

    def test_upload_resume_range_and_finalize(self):
        data = bytes(range(100))
        identity = self.client.post('/v1/uploads', json={'filename': 'data.bin', 'size': 100, 'sha256': hashlib.sha256(data).hexdigest()}).json()['id']
        self.client.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': '0'}, content=data[:32])
        with TestClient(create_app(self.config), headers={'Authorization': f'Bearer {TOKEN}'}) as other:
            self.assertEqual(other.get(f'/v1/uploads/{identity}').json()['offset'], 32)
            self.assertEqual(other.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': '0'}, content=b'x').status_code, 409)
            self.assertEqual(other.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': '32'}, content=b'x' * 33).status_code, 413)
            self.assertEqual(other.get(f'/v1/uploads/{identity}').json()['offset'], 32)
            for offset in range(32, 100, 32):
                self.assertEqual(other.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': str(offset)}, content=data[offset:offset + 32]).status_code, 200)
            self.assertEqual(other.post(f'/v1/uploads/{identity}/complete').status_code, 200)
            self.assertEqual(other.post(f'/v1/uploads/{identity}/complete').status_code, 200)
            response = other.get(f'/v1/artifacts/{identity}', headers={'Range': 'bytes=10-19'})
            self.assertEqual(response.status_code, 206)
            self.assertEqual(response.content, data[10:20])
            self.assertEqual(other.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': '100'}, content=b'').status_code, 409)

    def test_upload_rejects_checksum_and_paths(self):
        self.assertEqual(self.client.post('/v1/uploads', json={'filename': '../bad', 'size': 0, 'sha256': '0' * 64}).status_code, 422)
        identity = self.client.post('/v1/uploads', json={'filename': 'wrong.bin', 'size': 1, 'sha256': '0' * 64}).json()['id']
        self.client.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': '0'}, content=b'x')
        self.assertEqual(self.client.post(f'/v1/uploads/{identity}/complete').status_code, 422)
        self.assertEqual(self.client.get(f'/v1/artifacts/{identity}').status_code, 404)

    def test_cpu_job_to_git_roundtrip(self):
        image = BytesIO()
        Image.new('RGB', (16, 8), 'orange').save(image, format='PNG')
        data = image.getvalue()
        source = self.upload(data, 'source.png')
        response = self.submit(source)
        self.assertEqual(response.status_code, 202)
        identity = response.json()['id']
        self.assertEqual(self.submit(source).json()['id'], identity)
        self.assertEqual(self.submit(source, seed=99).status_code, 409)
        worker.run_worker(self.config, once=True)
        self.assertEqual(self.client.get(f'/v1/jobs/{identity}').json()['status'], 'succeeded')
        outputs = self.client.get(f'/v1/jobs/{identity}/artifacts').json()
        result = next(item for item in outputs if item['filename'].startswith('output/'))
        self.assertEqual(result['sha256'], source['sha256'])
        self.assertEqual(self.client.get(f'/v1/artifacts/{result["id"]}').content, data)
        self.assertIn('Copied input bytes', self.client.get(f'/v1/jobs/{identity}/logs').json()['text'])
        head = self.branch()
        spec = self.publication(result, head)
        response = self.client.post('/v1/publications', json=spec)
        self.assertEqual(response.status_code, 200, response.text)
        receipt = response.json()
        actual = subprocess.check_output(['git', '--git-dir', str(self.remote), 'show', f'{receipt["commit_sha"]}:ignored/new.bin'])
        self.assertEqual(actual, data)
        self.assertEqual(self.client.post('/v1/publications', json=spec).json(), receipt)
        self.assertEqual(self.client.post('/v1/publications', json={**spec, 'message': 'different'}).status_code, 409)
        self.assertEqual(self.client.post('/v1/publications', json={**spec, 'request_key': 'stale'}).status_code, 409)
        self.assertEqual(self.client.get('/v1/repo/file', params={'ref': 'refs/remotes/origin/assets/test', 'path': 'ignored/new.bin'}).content, data)
        diff = self.client.get('/v1/repo/diff', params={'base': head, 'head': receipt['commit_sha']}).json()
        self.assertIn('ignored/new.bin', diff['diff'])

    def test_git_paths_and_deletion(self):
        artifact, head = self.upload(), self.branch()
        for index, path in enumerate(['../escape', '/absolute', 'a/.git/config', '.git/config', 'link/escape', 'a\\b']):
            spec = self.publication(artifact, head, key=f'bad-{index}', path=path)
            self.assertEqual(self.client.post('/v1/publications', json=spec).status_code, 409, path)
        spec = self.publication(artifact, head, key='protected')
        spec['branch'] = 'main'
        self.assertEqual(self.client.post('/v1/publications', json=spec).status_code, 409)
        self.assertEqual(self.client.post('/v1/repo/branches', json={'name': '--bad'}).status_code, 409)
        spec = self.publication(artifact, head, key='delete')
        spec['delete'] = ['README.md']
        response = self.client.post('/v1/publications', json=spec)
        self.assertEqual(response.status_code, 200, response.text)
        files = self.client.get('/v1/repo/tree', params={'ref': response.json()['commit_sha']}).json()['files']
        self.assertFalse(any(line.endswith('\tREADME.md') for line in files))

    def test_unsupported_jobs_and_cancel_queued(self):
        artifact = self.upload()
        self.assertEqual(self.submit(artifact, task='environment').status_code, 409)
        self.assertEqual(self.submit(artifact, task='object').status_code, 422)
        self.assertEqual(self.submit(artifact, quantization='int8').status_code, 422)
        self.assertEqual(self.client.get('/v1/jobs/unknown').status_code, 404)
        identity = self.submit(artifact).json()['id']
        self.assertEqual(self.client.post(f'/v1/jobs/{identity}/cancel').json()['status'], 'cancelled')
        worker.run_worker(self.config, once=True)
        self.assertEqual(self.client.get(f'/v1/jobs/{identity}').json()['status'], 'cancelled')

    def test_running_cancel_terminates_process(self):
        identity = self.submit(self.upload()).json()['id']
        store.update_job(self.config, identity, status='running')
        active = []
        directory = self.config['state_dir'] / 'jobs' / identity
        stage = hyworld.stage('sleep', [sys.executable, '-c', 'import time; print("started",flush=True); time.sleep(60)'], directory, [])
        with patch('asset_service.hyworld.plan', return_value=[stage]):
            thread = threading.Thread(target=worker.execute_job, args=(self.config, store.one(self.config, 'jobs', identity), active))
            thread.start()
            deadline = time.monotonic() + 5
            while not active and time.monotonic() < deadline:
                time.sleep(.02)
            self.assertTrue(active)
            process = active[0]
            self.client.post(f'/v1/jobs/{identity}/cancel')
            thread.join(timeout=5)
            self.assertFalse(thread.is_alive())
            self.assertIsNotNone(process.poll())
        self.assertEqual(self.client.get(f'/v1/jobs/{identity}').json()['status'], 'cancelled')

    def test_failed_stage_retains_diagnostics(self):
        identity = self.submit(self.upload()).json()['id']
        store.update_job(self.config, identity, status='running')
        directory = self.config['state_dir'] / 'jobs' / identity
        stage = hyworld.stage('broken', [sys.executable, '-c', 'print("diagnostic"); raise SystemExit(3)'], directory, [])
        with patch('asset_service.hyworld.plan', return_value=[stage]):
            worker.execute_job(self.config, store.one(self.config, 'jobs', identity))
        self.assertEqual(self.client.get(f'/v1/jobs/{identity}').json()['status'], 'failed')
        outputs = self.client.get(f'/v1/jobs/{identity}/artifacts').json()
        self.assertIn('job.log', [item['filename'] for item in outputs])
        self.assertEqual(self.client.post('/v1/publications', json=self.publication(outputs[0], self.branch())).status_code, 409)

    def test_worker_restart_and_lock(self):
        identity = self.submit(self.upload()).json()['id']
        store.update_job(self.config, identity, status='running')
        with store.lock(self.config, 'worker'):
            with self.assertRaises(BlockingIOError):
                worker.run_worker(self.config, once=True)
        worker.run_worker(self.config, once=True)
        result = self.client.get(f'/v1/jobs/{identity}').json()
        self.assertEqual(result['status'], 'failed')
        self.assertIn('interrupted', result['error'])

    def test_model_commands(self):
        directory = self.root / 'job'
        recon = hyworld.plan(self.config, {'task': 'reconstruction', 'seed': 1}, directory)
        self.assertIn('--no_interactive', recon[0]['argv'])
        self.assertEqual(recon[0]['gpus'], ['0'])
        stages = hyworld.plan(self.config, {'task': 'environment', 'seed': 7}, directory)
        self.assertEqual([item['requires_vlm'] for item in stages], [True, True, False, False, False])
        for flag in ['--standalone', '--fsdp', '--local_files_only', '--nproc_per_node=2']:
            self.assertIn(flag, stages[2]['argv'])
        self.assertNotIn('ASSET_API_TOKEN', list(hyworld.environment(self.config)))
        commands = deploy.installation_commands(self.root, 'worldgen')
        self.assertTrue(any('torch==2.7.1' in argv for argv, cwd in commands))
        self.assertTrue(any('vllm==0.11.2' in argv for argv, cwd in commands))
        self.assertFalse(any('HY-Pano' in str(argv) for argv, cwd in commands))


    def test_git_attributes_cannot_change_published_bytes(self):
        (self.seed / '.gitattributes').write_text('normalize.txt text eol=lf\n')
        run('git', 'add', '.gitattributes', cwd=self.seed)
        run('git', 'commit', '-m', 'attributes', cwd=self.seed)
        run('git', 'push', 'origin', 'main', cwd=self.seed)
        head = self.branch()
        artifact = self.upload(b'one\r\ntwo\r\n', 'normalize.txt')
        response = self.client.post('/v1/publications', json=self.publication(artifact, head, path='normalize.txt'))
        self.assertEqual(response.status_code, 409, response.text)
        self.assertIn('bytes differ', response.text)
        remote = run('git', '--git-dir', str(self.remote), 'rev-parse', 'refs/heads/assets/test')
        self.assertEqual(remote, head)

    def test_concurrent_remote_change_is_not_overwritten(self):
        artifact, head = self.upload(), self.branch()
        original = git_ops.git
        advanced = []
        def race(config, *args, **kwargs):
            if args[0] == 'push' and args[1].startswith('--force-with-lease'):
                run('git', 'fetch', 'origin', cwd=self.seed)
                run('git', 'checkout', '-b', 'assets/test', 'origin/assets/test', cwd=self.seed)
                (self.seed / 'concurrent.txt').write_text('someone else\n')
                run('git', 'add', 'concurrent.txt', cwd=self.seed)
                run('git', 'commit', '-m', 'concurrent', cwd=self.seed)
                run('git', 'push', 'origin', 'assets/test', cwd=self.seed)
                advanced.append(run('git', 'rev-parse', 'HEAD', cwd=self.seed))
            return original(config, *args, **kwargs)
        with patch('asset_service.git_ops.git', side_effect=race):
            response = self.client.post('/v1/publications', json=self.publication(artifact, head))
        self.assertEqual(response.status_code, 409)
        remote = run('git', '--git-dir', str(self.remote), 'rev-parse', 'refs/heads/assets/test')
        self.assertEqual(remote, advanced[0])

    def test_panorama_validation(self):
        self.config['enable_environment'] = True
        image = BytesIO()
        Image.new('RGB', (16, 8), 'orange').save(image, format='PNG')
        artifact = self.upload(image.getvalue(), 'panorama.png')
        with patch('asset_service.hyworld.check_installation'):
            self.assertEqual(self.submit(artifact, task='environment').status_code, 422)
            response = self.submit(artifact, task='environment', panorama_confirmed=True)
            self.assertEqual(response.status_code, 202, response.text)
            invalid = self.upload(b'invalid', 'invalid.png')
            self.assertEqual(self.submit(invalid, key='invalid', task='environment', panorama_confirmed=True).status_code, 422)

    def test_success_exit_without_expected_output_is_failure(self):
        identity = self.submit(self.upload()).json()['id']
        store.update_job(self.config, identity, status='running')
        directory = self.config['state_dir'] / 'jobs' / identity
        stage = hyworld.stage('empty', [sys.executable, '-c', 'print("no asset")'], directory, [], expected=[directory / 'output/required.ply'])
        with patch('asset_service.hyworld.plan', return_value=[stage]):
            worker.execute_job(self.config, store.one(self.config, 'jobs', identity))
        job = self.client.get(f'/v1/jobs/{identity}').json()
        self.assertEqual(job['status'], 'failed')
        self.assertIn('expected outputs', job['error'])


    def test_lfs_publication_uploads_and_resolves_exact_object(self):
        data = bytes(range(200))
        artifact, head = self.upload(data), self.branch()
        spec = self.publication(artifact, head, path='Adventure Town/assets/large object.bin')
        spec['files'][0]['lfs'] = True
        response = self.client.post('/v1/publications', json=spec)
        self.assertEqual(response.status_code, 200, response.text)
        receipt = response.json()
        self.assertTrue(receipt['files'][0]['lfs'])
        self.assertIn('.gitattributes', receipt['paths'])
        pointer = subprocess.check_output(['git', '--git-dir', str(self.remote), 'show', f'{receipt["commit_sha"]}:{spec["files"][0]["path"]}'])
        self.assertEqual(git_ops.lfs_pointer(pointer), {'sha256': artifact['sha256'], 'size': len(data)})
        remote_objects = list((self.remote / 'lfs/objects').rglob(artifact['sha256']))
        self.assertEqual(len(remote_objects), 1)
        self.assertEqual(remote_objects[0].read_bytes(), data)
        git_ops.lfs_location(self.config, artifact['sha256']).unlink()
        result = self.client.get('/v1/repo/file', params={'ref': receipt['commit_sha'], 'path': spec['files'][0]['path'], 'resolve_lfs': True})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.content, data)



    def test_lfs_tracking_does_not_follow_attribute_symlink(self):
        outside = self.root / 'outside-attributes'
        outside.write_text('unchanged\n')
        (self.seed / '.gitattributes').symlink_to(outside)
        run('git', 'add', '.gitattributes', cwd=self.seed)
        run('git', 'commit', '-m', 'attribute symlink', cwd=self.seed)
        run('git', 'push', 'origin', 'main', cwd=self.seed)
        artifact, head = self.upload(), self.branch()
        spec = self.publication(artifact, head)
        spec['files'][0]['lfs'] = True
        response = self.client.post('/v1/publications', json=spec)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(outside.read_text(), 'unchanged\n')

    def test_lfs_file_above_regular_git_limit(self):
        path = self.root / 'large.bin'
        with path.open('wb') as handle:
            block = b'asset-probe-0123!' * 65536
            for index in range(101):
                handle.write(block)
        self.assertGreater(path.stat().st_size, 100 * 1024**2)
        artifact = store.record_artifact(self.config, path, 'large.bin')
        head = self.branch()
        spec = self.publication(artifact, head, key='large-regular', path='large.bin')
        self.assertEqual(self.client.post('/v1/publications', json=spec).status_code, 409)
        spec['request_key'] = 'large-lfs'
        spec['files'][0]['lfs'] = True
        response = self.client.post('/v1/publications', json=spec)
        self.assertEqual(response.status_code, 200, response.text)
        remote = next((self.remote / 'lfs/objects').rglob(artifact['sha256']))
        self.assertEqual(store.digest(remote), artifact['sha256'])
        self.assertEqual(remote.stat().st_size, path.stat().st_size)

    def test_model_snapshot_revisions_are_reused(self):
        import types
        fake = types.ModuleType('huggingface_hub')
        calls = []
        api = unittest.mock.Mock()
        api.model_info.return_value.sha = 'a' * 40
        fake.HfApi = lambda: api
        def download(repo, revision, allow_patterns, cache_dir):
            calls.append((repo, revision, allow_patterns))
            path = Path(cache_dir) / 'models--test--model' / 'snapshots' / revision
            path.mkdir(parents=True, exist_ok=True)
            return str(path)
        fake.snapshot_download = download
        lock = {}
        with patch.dict(sys.modules, {'huggingface_hub': fake}):
            path = deploy.cache_model(self.root, 'test/model', ['one/*'], lock)
            deploy.cache_model(self.root, 'test/model', ['two/*'], lock)
        self.assertEqual(api.model_info.call_count, 1)
        self.assertEqual(calls[-1][2], ['one/*', 'two/*'])
        self.assertEqual((path.parent.parent / 'refs/main').read_text(), 'a' * 40)


    def test_restart_stops_only_owned_orphan_and_retains_partial_files(self):
        identity = self.submit(self.upload()).json()['id']
        store.update_job(self.config, identity, status='running')
        directory = self.config['state_dir'] / 'jobs' / identity
        directory.mkdir()
        (directory / 'partial.txt').write_text('useful diagnostics')
        process = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'],
                                   start_new_session=True, env={**os.environ, 'ASSET_JOB_ID': identity})
        try:
            worker.recover_interrupted(self.config)
            process.wait(timeout=3)
            self.assertNotEqual(process.returncode, 0)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
        self.assertEqual(self.client.get(f'/v1/jobs/{identity}').json()['status'], 'failed')
        files = self.client.get(f'/v1/jobs/{identity}/artifacts').json()
        self.assertIn('partial.txt', [item['filename'] for item in files])
        self.assertIn('interruption.json', [item['filename'] for item in files])

    def test_remote_upload_client_resumes(self):
        from asset_service.client import upload
        data = bytes(range(200))
        path = self.root / 'client.bin'
        path.write_bytes(data)
        identity = self.client.post('/v1/uploads', json={'filename': path.name, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}).json()['id']
        self.client.patch(f'/v1/uploads/{identity}', headers={'Upload-Offset': '0'}, content=data[:32])
        result = upload(self.client, path, identity)
        self.assertEqual(self.client.get(f'/v1/artifacts/{result["id"]}').content, data)

    @unittest.skipUnless(os.environ.get('HYWORLD_SOURCE'), 'Set HYWORLD_SOURCE for pinned-source contract validation')
    def test_pinned_upstream_contract(self):
        from asset_service.contracts import check
        self.assertEqual(len(check(os.environ['HYWORLD_SOURCE'])), 6)


if __name__ == '__main__':
    unittest.main()
