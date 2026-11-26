"""Local operator entry point and remote upload client."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

from . import store


def serve(config, port):
    children = []
    def shutdown(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, shutdown)
    try:
        for mode in ['api', 'worker']:
            env = dict(os.environ)
            if mode == 'worker':
                env.pop('ASSET_API_TOKEN', None)
            argv = [sys.executable, '-m', 'asset_service.cli', '--config', config['config_path'], mode]
            if mode == 'api':
                argv += ['--port', str(port)]
            children.append(subprocess.Popen(argv, env=env))
        while all(child.poll() is None for child in children):
            time.sleep(.2)
        if any(child.poll() not in (None, 0) for child in children):
            raise RuntimeError('API or worker stopped unexpectedly; see process output')
    except KeyboardInterrupt:
        pass
    finally:
        for child in children:
            if child.poll() is None:
                child.terminate()
        for child in children:
            try:
                child.wait(timeout=20)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


def main():
    parser = argparse.ArgumentParser(description='Local asset service: API, HY-World setup and Git harness')
    parser.add_argument('--config', default='config.toml')
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ['serve', 'api']:
        commands.add_parser(name).add_argument('--port', type=int, default=8787)
    commands.add_parser('worker').add_argument('--once', action='store_true')
    commands.add_parser('repo-init')
    commands.add_parser('doctor')
    commands.add_parser('setup-hyworld').add_argument('--profile', choices=['worldmirror', 'worldgen'], default='worldmirror')
    upload = commands.add_parser('upload')
    upload.add_argument('path', type=Path)
    upload.add_argument('--url', required=True)
    upload.add_argument('--upload-id')
    args = parser.parse_args()
    if args.command == 'upload':
        from .client import connect, upload
        with connect(args.url) as client:
            print(json.dumps(upload(client, args.path, args.upload_id), indent=2))
        return
    config = store.load_config(args.config)
    store.initialize(config)
    if args.command == 'api':
        import uvicorn
        from .api import create_app
        uvicorn.run(create_app(config), host='127.0.0.1', port=args.port, workers=1)
    elif args.command == 'serve':
        if len(os.environ.get('ASSET_API_TOKEN', '')) < 32:
            raise ValueError('Set ASSET_API_TOKEN to a secret of at least 32 characters')
        serve(config, args.port)
    elif args.command == 'worker':
        from .worker import run_worker
        run_worker(config, once=args.once)
    elif args.command == 'repo-init':
        from .git_ops import initialize_repo
        with store.lock(config, 'git'):
            initialize_repo(config)
    elif args.command == 'doctor':
        from .deploy import doctor
        print(json.dumps(doctor(config), indent=2))
    elif args.command == 'setup-hyworld':
        from .deploy import setup
        result = setup(config, args.profile)
        print(json.dumps({'installed': result['installed'], 'profiles': result['profiles'], 'gpu_validated': False}))


if __name__ == '__main__':
    main()
