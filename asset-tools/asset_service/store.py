"""Small durable records and files shared by the API and one worker."""
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tomllib
import uuid


def now():
    return datetime.now(timezone.utc).isoformat()


def identifier():
    return uuid.uuid4().hex


def load_config(path):
    path = Path(path).resolve()
    with path.open('rb') as handle:
        config = tomllib.load(handle)
    config['state_dir'] = Path(config['state_dir']).expanduser().resolve()
    config['config_path'] = str(path)
    config.setdefault('repository_url', 'https://github.com/freckletonj/games.git')
    config.setdefault('protected_branches', ['main'])
    config.setdefault('max_upload_bytes', 4 * 1024**3)
    config.setdefault('chunk_bytes', 8 * 1024**2)
    config.setdefault('gpu_ids', ['0', '1'])
    config.setdefault('enable_reconstruction', False)
    config.setdefault('enable_environment', False)
    return config


def initialize(config):
    root = config['state_dir']
    for name in ['uploads', 'artifacts', 'jobs', 'locks', 'worktrees']:
        (root / name).mkdir(parents=True, exist_ok=True)
    with database(config) as db:
        db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS uploads (
            id TEXT PRIMARY KEY, filename TEXT NOT NULL, size INTEGER NOT NULL,
            sha256 TEXT NOT NULL, ready INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS artifacts (
            id TEXT PRIMARY KEY, path TEXT UNIQUE NOT NULL, filename TEXT NOT NULL,
            size INTEGER NOT NULL, sha256 TEXT NOT NULL, media_type TEXT NOT NULL,
            job_id TEXT);
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL,
            spec TEXT NOT NULL, status TEXT NOT NULL, stage TEXT,
            cancel INTEGER NOT NULL DEFAULT 0, error TEXT,
            created TEXT NOT NULL, updated TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS publications (
            request_key TEXT PRIMARY KEY, spec TEXT NOT NULL,
            status TEXT NOT NULL, receipt TEXT);
        ''')


@contextmanager
def database(config):
    db = sqlite3.connect(config['state_dir'] / 'service.sqlite3', timeout=30)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def rows(config, query, parameters=()):
    with database(config) as db:
        return [dict(row) for row in db.execute(query, parameters).fetchall()]


def one(config, table, identity):
    # table names are internal constants, never request parameters.
    result = rows(config, f'SELECT * FROM {table} WHERE id=?', (identity,))
    return result[0] if result else None


def update_job(config, job_id, **fields):
    fields['updated'] = now()
    with database(config) as db:
        db.execute('UPDATE jobs SET ' + ','.join(f'{key}=?' for key in fields) + ' WHERE id=?',
                   (*fields.values(), job_id))


@contextmanager
def lock(config, name):
    with (config['state_dir'] / 'locks' / name).open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def digest(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def record_artifact(config, path, filename, job_id=None):
    import mimetypes
    path = Path(path).resolve()
    entry = dict(id=identifier(), path=str(path), filename=filename,
                 size=path.stat().st_size, sha256=digest(path),
                 media_type=mimetypes.guess_type(filename)[0] or 'application/octet-stream',
                 job_id=job_id)
    with database(config) as db:
        db.execute('INSERT INTO artifacts VALUES (:id,:path,:filename,:size,:sha256,:media_type,:job_id)', entry)
    return entry


def public_artifact(entry):
    return {key: value for key, value in entry.items() if key != 'path'}


def write_json(path, data):
    Path(path).write_text(json.dumps(data, indent=2) + '\n')
