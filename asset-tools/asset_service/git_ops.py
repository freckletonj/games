"""Repository operations on a dedicated bare clone and temporary worktrees."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import os

from . import store


def git(config, *args, cwd=None, binary=False):
    repo = config['state_dir'] / 'repository.git'
    command = ['git', '-C', str(cwd)] if cwd else ['git', '--git-dir', str(repo)]
    result = subprocess.run(command + list(args), capture_output=True, text=not binary,
                            env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'}, timeout=120)
    if result.returncode:
        # Git stderr can contain credential-bearing remote URLs. Keep it in host logs only.
        raise ValueError(f'Git {args[0]} failed (exit {result.returncode}); check host Git credentials or branch conflicts')
    return result.stdout if binary else result.stdout.strip()


def initialize_repo(config):
    repo = config['state_dir'] / 'repository.git'
    if repo.exists():
        raise ValueError('Service repository already exists')
    subprocess.run(['git', 'clone', '--bare', config['repository_url'], str(repo)],
                   check=True, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'})
    git(config, 'config', 'user.name', config.get('git_name', 'Asset service'))
    git(config, 'config', 'user.email', config.get('git_email', 'assets@localhost'))
    git(config, 'config', 'core.hooksPath', '/dev/null')
    git(config, 'config', 'commit.gpgsign', 'false')
    git(config, 'config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*')
    git(config, 'fetch', 'origin')


def refresh(config):
    git(config, 'fetch', '--prune', 'origin')


def branch_name(config, name, writable=False):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/-]{0,180}', name):
        raise ValueError('Invalid branch name')
    git(config, 'check-ref-format', f'refs/heads/{name}')
    if writable and name in config.get('protected_branches', ['main']):
        raise ValueError('Branch is protected by the local configuration')
    return name


def revision(config, ref):
    if not ref or ref.startswith('-') or ':' in ref:
        raise ValueError('Invalid revision')
    if not ref.startswith('refs/') and not re.fullmatch(r'[a-f0-9]{40}', ref):
        ref = f'refs/remotes/origin/{ref}'
    return git(config, 'rev-parse', '--verify', '--end-of-options', f'{ref}^{{commit}}')


def repo_path(path):
    pure = PurePosixPath(path)
    if (not path or pure.is_absolute() or '\\' in path or '\x00' in path
            or any(part in ('', '.', '..', '.git') for part in path.split('/'))):
        raise ValueError('Use a repository-relative path without dot components or .git')
    return pure


def destination(root, path):
    pure = repo_path(path)
    target = root.joinpath(*pure.parts)
    current = root
    for part in pure.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('Publication paths cannot contain symlinks')
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Path escapes worktree')
    return target


def inspect_repo(config):
    refresh(config)
    refs = git(config, 'for-each-ref', '--format=%(refname:strip=3) %(objectname)', 'refs/remotes/origin/')
    return {'branches': [dict(zip(['name', 'sha'], line.split())) for line in refs.splitlines()],
            'protected_branches': config.get('protected_branches', ['main'])}


def create_branch(config, name, base):
    branch_name(config, name, writable=True)
    refresh(config)
    sha = revision(config, base)
    exists = git(config, 'ls-remote', '--heads', 'origin', f'refs/heads/{name}')
    if exists:
        raise ValueError('Branch already exists')
    git(config, 'push', 'origin', f'{sha}:refs/heads/{name}')
    return {'branch': name, 'sha': sha}


def publish(config, spec):
    with store.lock(config, 'git'):
        key = spec['request_key']
        encoded = json.dumps(spec, sort_keys=True)
        existing = store.rows(config, 'SELECT * FROM publications WHERE request_key=?', (key,))
        if existing:
            previous = existing[0]
            if previous['spec'] != encoded:
                raise ValueError('Publication key was already used for a different request')
            if previous['status'] == 'succeeded':
                return json.loads(previous['receipt'])
            if previous['status'] == 'pushed':
                return finish_receipt(config, key, json.loads(previous['receipt']))
            raise ValueError('Publication was interrupted or conflicted; inspect the remote branch before using a new key')
        branch = branch_name(config, spec['branch'], writable=True)
        refresh(config)
        head = revision(config, f'refs/remotes/origin/{branch}')
        if head != spec['expected_head']:
            raise ValueError(f'Stale branch head; current head is {head}')
        files, deletes = spec['files'], spec.get('delete', [])
        paths = [item['path'] for item in files] + deletes
        if not paths or len(paths) != len(set(paths)):
            raise ValueError('Select at least one unique destination path')
        for path in paths:
            repo_path(path)
        artifacts = []
        for item in files:
            artifact = store.one(config, 'artifacts', item['artifact_id'])
            if not artifact:
                raise ValueError('Unknown artifact')
            if artifact['job_id']:
                job = store.one(config, 'jobs', artifact['job_id'])
                if job['status'] != 'succeeded':
                    raise ValueError('Only successful job outputs may be published')
            if store.digest(artifact['path']) != artifact['sha256']:
                raise ValueError('Artifact checksum changed on disk')
            if artifact['size'] > 100 * 1024**2:
                raise ValueError('This harness supports regular Git files up to 100 MiB; large outputs stay on the server')
            artifacts.append(artifact)
        with store.database(config) as db:
            db.execute('INSERT INTO publications VALUES (?,?,?,NULL)', (key, encoded, 'running'))
        worktree = config['state_dir'] / 'worktrees' / store.identifier()
        git(config, 'worktree', 'add', '--detach', str(worktree), head)
        try:
            for item, artifact in zip(files, artifacts):
                target = destination(worktree, item['path'])
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(artifact['path'], target)
            for path in deletes:
                target = destination(worktree, path)
                if not target.is_file():
                    raise ValueError('Deletion requires an existing regular file')
                target.unlink()
            # Force-add only explicitly selected paths (experiments may be ignored).
            git(config, 'add', '-f', '--', *paths, cwd=worktree)
            if not git(config, 'diff', '--cached', '--name-only', cwd=worktree):
                raise ValueError('Publication has no changes')
            # Fail before commit if the destination repository uses LFS: do not accidentally commit raw large data.
            attrs = git(config, 'check-attr', 'filter', '--', *paths, cwd=worktree)
            if any(line.endswith(': lfs') for line in attrs.splitlines()):
                raise ValueError('LFS destinations are not supported in this first harness')
            git(config, 'commit', '-m', spec['message'], cwd=worktree)
            commit = git(config, 'rev-parse', 'HEAD', cwd=worktree)
            receipt = {'commit_sha': commit, 'branch': branch, 'paths': paths,
                       'files': [{'path': item['path'], 'sha256': artifact['sha256']} for item, artifact in zip(files, artifacts)]}
            # Verify Git attribute conversions before publishing any bytes.
            verify_receipt(config, receipt)
            # Persist the intended commit before pushing, so a crash never invites a blind retry.
            with store.database(config) as db:
                db.execute('UPDATE publications SET receipt=? WHERE request_key=?', (json.dumps(receipt), key))
            # Normal push rejects remote divergence. The lease also rejects a concurrent fast-forward.
            git(config, 'push', f'--force-with-lease=refs/heads/{branch}:{head}', 'origin', f'{commit}:refs/heads/{branch}')
            with store.database(config) as db:
                db.execute('UPDATE publications SET status=? WHERE request_key=?', ('pushed', key))
            return finish_receipt(config, key, receipt)
        finally:
            git(config, 'worktree', 'remove', '--force', str(worktree))


def verify_receipt(config, receipt):
    # Verify actual blob bytes, including any Git attribute conversions.
    for item in receipt['files']:
        data = git(config, 'show', f"{receipt['commit_sha']}:{item['path']}", binary=True)
        if hashlib.sha256(data).hexdigest() != item['sha256']:
            raise ValueError('Committed bytes differ from the selected artifact')


def finish_receipt(config, key, receipt):
    verify_receipt(config, receipt)
    with store.database(config) as db:
        db.execute('UPDATE publications SET status=?,receipt=? WHERE request_key=?',
                   ('succeeded', json.dumps(receipt), key))
    return receipt
