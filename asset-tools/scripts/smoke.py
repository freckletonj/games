"""Exercise a running service over real HTTP; optionally publish to a fresh branch."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import time
import uuid

from PIL import Image
from asset_service.client import connect, upload


def checked(response):
    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8787')
    parser.add_argument('--publish', action='store_true', help='Push a fresh assets/smoke-* branch')
    parser.add_argument('--lfs', action='store_true', help='With --publish, explicitly track the probe with Git LFS')
    args = parser.parse_args()
    if args.lfs and not args.publish:
        parser.error('--lfs requires --publish')
    with tempfile.TemporaryDirectory() as temp, connect(args.url) as client:
        source = Path(temp) / 'probe.png'
        Image.new('RGB', (32, 16), (240, 130, 40)).save(source)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        artifact = upload(client, source)
        job = checked(client.post('/v1/jobs', json={'request_key': uuid.uuid4().hex,
                      'task': 'transfer', 'inputs': [artifact['id']]}))
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            result = checked(client.get(f'/v1/jobs/{job["id"]}'))
            if result['status'] in ('succeeded', 'failed', 'cancelled'):
                break
            time.sleep(.2)
        if result['status'] != 'succeeded':
            raise RuntimeError(f'Transfer job did not succeed: {result}')
        artifacts = checked(client.get(f'/v1/jobs/{job["id"]}/artifacts'))
        output = next(item for item in artifacts if item['filename'].startswith('output/'))
        response = client.get(f'/v1/artifacts/{output["id"]}')
        response.raise_for_status()
        if hashlib.sha256(response.content).hexdigest() != digest:
            raise RuntimeError('Downloaded bytes differ from the source')
        receipt = {'job_id': job['id'], 'sha256': digest, 'download_verified': True}
        if args.publish:
            name = f'assets/smoke-{uuid.uuid4().hex[:10]}'
            branch = checked(client.post('/v1/repo/branches', json={'name': name}))
            publication = checked(client.post('/v1/publications', json={
                'request_key': uuid.uuid4().hex, 'branch': name, 'expected_head': branch['sha'],
                'files': [{'artifact_id': output['id'], 'path': 'asset-tools/probes/probe.png', 'lfs': args.lfs}],
                'message': 'Verify asset service binary roundtrip'}))
            committed = client.get('/v1/repo/file', params={'ref': publication['commit_sha'], 'path': 'asset-tools/probes/probe.png', 'resolve_lfs': args.lfs})
            committed.raise_for_status()
            if hashlib.sha256(committed.content).hexdigest() != digest:
                raise RuntimeError('Published bytes differ from the source')
            receipt['publication'] = publication
        print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
