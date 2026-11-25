"""Authenticated HTTP API. GPU work runs in the separate worker process."""
import json
import os
from pathlib import Path
import secrets
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from PIL import Image, UnidentifiedImageError

from . import git_ops, store

Key = Annotated[str, Field(pattern=r'^[A-Za-z0-9._-]{1,128}$')]
Sha = Annotated[str, Field(pattern=r'^[a-f0-9]{64}$')]


class Payload(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Upload(Payload):
    filename: str = Field(min_length=1, max_length=180)
    size: int = Field(ge=0)
    sha256: Sha


class Job(Payload):
    request_key: Key
    task: Literal['transfer', 'reconstruction', 'environment']
    inputs: list[str] = Field(min_length=1, max_length=32)
    seed: int = Field(default=1024, ge=0, le=2**32 - 1)
    panorama_confirmed: bool = False


class PublicationFile(Payload):
    artifact_id: str
    path: str


class Publication(Payload):
    request_key: Key
    branch: str
    expected_head: str = Field(pattern=r'^[a-f0-9]{40}$')
    files: list[PublicationFile] = Field(default_factory=list, max_length=256)
    delete: list[str] = Field(default_factory=list, max_length=256)
    message: str = Field(min_length=1, max_length=1000)


class Branch(Payload):
    name: str
    base: str = 'refs/remotes/origin/main'


def create_app(config):
    store.initialize(config)
    token = os.environ['ASSET_API_TOKEN']
    if len(token) < 32:
        raise ValueError('ASSET_API_TOKEN must contain at least 32 characters')

    def authenticate(authorization: Annotated[str | None, Header()] = None):
        if not authorization or not secrets.compare_digest(authorization, f'Bearer {token}'):
            raise HTTPException(401, 'Bearer token required', headers={'WWW-Authenticate': 'Bearer'})

    app = FastAPI(title='Game asset service', version='0.1.0',
                  dependencies=[Depends(authenticate)], docs_url=None, redoc_url=None, openapi_url=None)

    @app.exception_handler(ValueError)
    async def invalid(request, error):
        return JSONResponse(status_code=409, content={'detail': str(error)})

    @app.exception_handler(BlockingIOError)
    async def busy(request, error):
        return JSONResponse(status_code=409, content={'detail': 'Operation already in progress; retry later'})

    def artifact(identity):
        result = store.one(config, 'artifacts', identity)
        if not result:
            raise HTTPException(404, 'Artifact not found')
        return result

    def upload_record(identity):
        result = store.one(config, 'uploads', identity)
        if not result:
            raise HTTPException(404, 'Upload not found')
        return result

    def job_record(identity):
        result = store.one(config, 'jobs', identity)
        if not result:
            raise HTTPException(404, 'Job not found')
        return result

    @app.get('/health')
    def health():
        return {'status': 'ok'}

    @app.get('/v1/schema')
    def schema():
        return app.openapi()

    @app.get('/v1/capabilities')
    def capabilities():
        from .hyworld import installation_status, gpu_inventory
        return {'version': '0.1.0', 'chunk_bytes': config['chunk_bytes'],
                'max_upload_bytes': config['max_upload_bytes'],
                'tasks': {'transfer': {'enabled': True, 'gpu_validated': False},
                          'reconstruction': {'enabled': config['enable_reconstruction'], 'gpu_validated': False},
                          'environment': {'enabled': config['enable_environment'], 'gpu_validated': False}},
                'hyworld': installation_status(config), 'gpus': gpu_inventory(),
                'quantization': 'No int8/fp8 worker implemented; upstream BF16/FSDP only',
                'git': {'initialized': (config['state_dir'] / 'repository.git').exists(),
                        'protected_branches': config['protected_branches'], 'lfs': False}}

    @app.post('/v1/uploads', status_code=201)
    def begin_upload(spec: Upload):
        if (Path(spec.filename).name != spec.filename or spec.filename in ('.', '..')
                or '\\' in spec.filename or any(ord(c) < 32 for c in spec.filename)):
            raise HTTPException(422, 'filename must be a single printable filename')
        if spec.size > config['max_upload_bytes']:
            raise HTTPException(413, 'Upload exceeds configured maximum')
        identity = store.identifier()
        (config['state_dir'] / 'uploads' / f'{identity}.part').touch()
        with store.database(config) as db:
            db.execute('INSERT INTO uploads VALUES (?,?,?,?,0)', (identity, spec.filename, spec.size, spec.sha256))
        return {'id': identity, 'offset': 0, 'chunk_bytes': config['chunk_bytes']}

    @app.get('/v1/uploads/{identity}')
    def upload_status(identity: str):
        entry = upload_record(identity)
        path = config['state_dir'] / 'uploads' / f'{identity}.part'
        return {**entry, 'offset': entry['size'] if entry['ready'] else path.stat().st_size}

    @app.patch('/v1/uploads/{identity}')
    async def append_upload(identity: str, request: Request, upload_offset: Annotated[int, Header(ge=0)]):
        with store.lock(config, f'upload-{identity}'):
            entry = upload_record(identity)
            if entry['ready']:
                raise HTTPException(409, 'Upload already finalized')
            path = config['state_dir'] / 'uploads' / f'{identity}.part'
            offset = path.stat().st_size
            if upload_offset != offset:
                raise HTTPException(409, {'offset': offset})
            received = 0
            with path.open('ab') as handle:
                try:
                    async for chunk in request.stream():
                        received += len(chunk)
                        if received > config['chunk_bytes'] or offset + received > entry['size']:
                            raise HTTPException(413, 'Chunk exceeds advertised chunk size or expected file size')
                        handle.write(chunk)
                    handle.flush()
                    os.fsync(handle.fileno())
                except BaseException:
                    # A disconnected or oversized chunk is atomic: resume at the previous offset.
                    handle.truncate(offset)
                    raise
            return {'id': identity, 'offset': offset + received}

    @app.post('/v1/uploads/{identity}/complete')
    def complete_upload(identity: str):
        with store.lock(config, f'upload-{identity}'):
            entry = upload_record(identity)
            if entry['ready']:
                return store.public_artifact(artifact(identity))
            path = config['state_dir'] / 'uploads' / f'{identity}.part'
            if path.stat().st_size != entry['size'] or store.digest(path) != entry['sha256']:
                raise HTTPException(422, 'Size or SHA256 mismatch; start a new upload for different bytes')
            # Keep the finalized path fixed so DB/file state cannot split during rename.
            import mimetypes
            mime = mimetypes.guess_type(entry['filename'])[0] or 'application/octet-stream'
            with store.database(config) as db:
                db.execute('INSERT INTO artifacts VALUES (?,?,?,?,?,?,NULL)',
                           (identity, str(path), entry['filename'], entry['size'], entry['sha256'], mime))
                db.execute('UPDATE uploads SET ready=1 WHERE id=?', (identity,))
            return store.public_artifact(artifact(identity))

    @app.get('/v1/artifacts/{identity}')
    def download(identity: str):
        entry = artifact(identity)
        return FileResponse(entry['path'], filename=entry['filename'], media_type=entry['media_type'],
                            headers={'ETag': f'"{entry["sha256"]}"', 'Cache-Control': 'private, no-cache'})

    @app.post('/v1/jobs', status_code=202)
    def submit(spec: Job):
        encoded = json.dumps(spec.model_dump(), sort_keys=True)
        previous = store.rows(config, 'SELECT * FROM jobs WHERE request_key=?', (spec.request_key,))
        if previous:
            if previous[0]['spec'] != encoded:
                raise HTTPException(409, 'Job key already used for another request')
            return {'id': previous[0]['id'], 'status': previous[0]['status']}
        inputs = [artifact(identity) for identity in spec.inputs]
        if spec.task != 'transfer':
            if not config[f'enable_{spec.task}']:
                raise HTTPException(409, 'Task is disabled; complete host setup and explicitly enable it in config.toml')
            from .hyworld import check_installation
            check_installation(config, spec.task)
            images = []
            for entry in inputs:
                try:
                    with Image.open(entry['path']) as image:
                        if image.format not in ('PNG', 'JPEG', 'WEBP') or getattr(image, 'n_frames', 1) != 1:
                            raise HTTPException(422, 'Supply individual still PNG/JPEG/WebP observations')
                        images.append(image.size)
                        image.verify()
                except (UnidentifiedImageError, OSError) as error:
                    raise HTTPException(422, 'Input is not a valid still image') from error
            if spec.task == 'environment' and (len(images) != 1 or images[0][0] != 2 * images[0][1] or not spec.panorama_confirmed):
                raise HTTPException(422, 'Environment requires one 2:1 image and panorama_confirmed=true after projection/seam review')
        identity = store.identifier()
        timestamp = store.now()
        with store.database(config) as db:
            db.execute('BEGIN IMMEDIATE')
            # Another API thread may have submitted the key while inputs were checked.
            existing = db.execute('SELECT * FROM jobs WHERE request_key=?', (spec.request_key,)).fetchone()
            if existing:
                if existing['spec'] != encoded:
                    raise HTTPException(409, 'Job key already used for another request')
                return {'id': existing['id'], 'status': existing['status']}
            db.execute('INSERT INTO jobs (id,request_key,spec,status,created,updated) VALUES (?,?,?,?,?,?)',
                       (identity, spec.request_key, encoded, 'queued', timestamp, timestamp))
        return {'id': identity, 'status': 'queued'}

    @app.get('/v1/jobs/{identity}')
    def job_status(identity: str):
        entry = job_record(identity)
        entry['spec'] = json.loads(entry['spec'])
        return entry

    @app.get('/v1/jobs/{identity}/artifacts')
    def job_artifacts(identity: str):
        job_record(identity)
        return [store.public_artifact(item) for item in store.rows(config, 'SELECT * FROM artifacts WHERE job_id=?', (identity,))]

    @app.get('/v1/jobs/{identity}/logs')
    def job_logs(identity: str, offset: int = 0):
        job_record(identity)
        if offset < 0:
            raise HTTPException(422, 'offset must be nonnegative')
        path = config['state_dir'] / 'jobs' / identity / 'job.log'
        if not path.exists():
            return {'text': '', 'next_offset': 0}
        with path.open('rb') as handle:
            handle.seek(offset)
            data = handle.read(65536)
        return {'text': data.decode('utf-8', errors='replace'), 'next_offset': offset + len(data)}

    @app.post('/v1/jobs/{identity}/cancel')
    def cancel(identity: str):
        job_record(identity)
        with store.database(config) as db:
            db.execute("UPDATE jobs SET cancel=1, status=CASE WHEN status='queued' THEN 'cancelled' ELSE status END, updated=? WHERE id=?",
                       (store.now(), identity))
        return {'id': identity, 'status': job_record(identity)['status']}

    @app.get('/v1/repo')
    def repo():
        with store.lock(config, 'git'):
            return git_ops.inspect_repo(config)

    @app.post('/v1/repo/branches', status_code=201)
    def branch(spec: Branch):
        with store.lock(config, 'git'):
            return git_ops.create_branch(config, spec.name, spec.base)

    @app.get('/v1/repo/tree')
    def tree(ref: str = 'refs/remotes/origin/main'):
        with store.lock(config, 'git'):
            git_ops.refresh(config)
            sha = git_ops.revision(config, ref)
            entries = git_ops.git(config, 'ls-tree', '-rz', sha, binary=True).split(b'\0')
            return {'sha': sha, 'files': [entry.decode('utf-8') for entry in entries if entry]}

    @app.get('/v1/repo/file')
    def read_file(ref: str, path: str):
        git_ops.repo_path(path)
        with store.lock(config, 'git'):
            git_ops.refresh(config)
            sha = git_ops.revision(config, ref)
            data = git_ops.git(config, 'show', f'{sha}:{path}', binary=True)
            return Response(data, media_type='application/octet-stream')

    @app.get('/v1/repo/diff')
    def diff(base: str, head: str):
        with store.lock(config, 'git'):
            git_ops.refresh(config)
            left, right = git_ops.revision(config, base), git_ops.revision(config, head)
            return {'base': left, 'head': right, 'diff': git_ops.git(config, 'diff', '--stat', left, right),
                    'patch': git_ops.git(config, 'diff', '--no-ext-diff', '--no-textconv', left, right)}

    @app.post('/v1/publications')
    def publication(spec: Publication):
        return git_ops.publish(config, spec.model_dump())

    return app
