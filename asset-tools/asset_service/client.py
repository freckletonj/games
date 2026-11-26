"""Byte-streaming client; credentials stay in environment variables."""
import hashlib
import os
from pathlib import Path

import httpx


def connect(url):
    headers = {'Authorization': f'Bearer {os.environ["ASSET_API_TOKEN"]}'}
    if os.environ.get('CF_ACCESS_CLIENT_ID'):
        headers['CF-Access-Client-Id'] = os.environ['CF_ACCESS_CLIENT_ID']
        headers['CF-Access-Client-Secret'] = os.environ['CF_ACCESS_CLIENT_SECRET']
    return httpx.Client(base_url=url.rstrip('/'), headers=headers, timeout=120)


def upload(client, path, upload_id=None):
    path = Path(path)
    with path.open('rb') as handle:
        sha = hashlib.file_digest(handle, 'sha256').hexdigest()
    if upload_id:
        response = client.get(f'/v1/uploads/{upload_id}')
        response.raise_for_status()
        status = response.json()
        if status['sha256'] != sha or status['size'] != path.stat().st_size:
            raise ValueError('Resume file differs from the original upload')
        offset = status['offset']
        response = client.get('/v1/capabilities')
        response.raise_for_status()
        chunk_bytes = response.json()['chunk_bytes']
    else:
        response = client.post('/v1/uploads', json={'filename': path.name, 'size': path.stat().st_size, 'sha256': sha})
        response.raise_for_status()
        status = response.json()
        upload_id, offset, chunk_bytes = status['id'], status['offset'], status['chunk_bytes']
    import sys
    print(f'Upload ID: {upload_id} (use --upload-id to resume)', file=sys.stderr)
    with path.open('rb') as handle:
        handle.seek(offset)
        while data := handle.read(chunk_bytes):
            response = client.patch(f'/v1/uploads/{upload_id}', headers={'Upload-Offset': str(offset)}, content=data)
            response.raise_for_status()
            offset = response.json()['offset']
    response = client.post(f'/v1/uploads/{upload_id}/complete')
    response.raise_for_status()
    result = response.json()
    if result['sha256'] != sha:
        raise ValueError('Server checksum differs from local bytes')
    return result
