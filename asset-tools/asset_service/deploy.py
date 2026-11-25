"""Host-only setup. Downloads and compilation never run through the public API."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import venv

from . import hyworld, store


def command(argv, cwd=None, env=None):
    print('+', ' '.join(str(item) for item in argv), flush=True)
    subprocess.run([str(item) for item in argv], cwd=cwd, env=env, check=True)


def installation_commands(root, profile):
    root = Path(root)
    upstream = root / 'HY-World-2.0'
    python = root / 'hyworld-venv/bin/python'
    commands = [
        ([python, '-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel', 'packaging', 'ninja', 'pybind11'], root),
        ([python, '-m', 'pip', 'install', 'torch==2.7.1', 'torchvision==0.22.1', '--index-url', 'https://download.pytorch.org/whl/cu128'], root),
        ([python, '-m', 'pip', 'install', '-r', root / 'requirements.hyworld.txt'], root),
        ([python, '-m', 'pip', 'install', '--no-build-isolation', upstream / 'hyworld2/worldgen/third_party/gsplat_maskgaussian'], root),
        ([python, '-m', 'pip', 'install', '--no-build-isolation', 'flash-attn==2.8.3'], root),
    ]
    if profile == 'worldgen':
        commands += [
            ([python, '-m', 'pip', 'install', '--no-build-isolation', '-r', root / 'requirements.git.txt'], root),
            ([python, '-m', 'pip', 'install', '--no-build-isolation', upstream / 'hyworld2/worldgen/third_party/navmesh'], root),
            ([root / 'vlm-venv/bin/python', '-m', 'pip', 'install', 'vllm==0.11.2'], root),
        ]
    return commands


def cache_model(root, repo_id, patterns, model_lock):
    from huggingface_hub import HfApi, snapshot_download
    existing = model_lock.get(repo_id)
    revision = existing['revision'] if existing else HfApi().model_info(repo_id).sha
    if existing and existing['patterns'] is None:
        patterns = None
    elif existing and patterns is not None:
        patterns = sorted(set(patterns + existing['patterns']))
    path = Path(snapshot_download(repo_id, revision=revision, allow_patterns=patterns, cache_dir=root / 'hf/hub'))
    # Upstream loaders ask for main. Bind that name to the immutable snapshot in our private cache.
    refs = path.parent.parent / 'refs'
    refs.mkdir(exist_ok=True)
    (refs / 'main').write_text(revision)
    model_lock[repo_id] = {'revision': revision, 'patterns': patterns}
    store.write_json(root / 'models.lock.json', model_lock)
    return path


def download_models(root, profile):
    lock_path = root / 'models.lock.json'
    models = json.loads(lock_path.read_text()) if lock_path.exists() else {}
    cache_model(root, 'tencent/HY-World-2.0', ['HY-WorldMirror-2.0/*'], models)
    if profile == 'worldgen':
        stereo = cache_model(root, 'hanshanxue/WorldStereo', ['worldstereo-memory-dmd/*'], models)
        cfg = json.loads((stereo / 'worldstereo-memory-dmd/config.json').read_text())
        # The checkpoint config is the source of truth for the large Wan base model ID.
        cache_model(root, cfg['base_model'], None, models)
        for repo, patterns in [
            ('Ruicheng/moge-2-vitl-normal', None),
            ('facebook/sam3', None),
            ('naver-iv/zim-anything-vitl', ['zim_vit_l_2092/*']),
            ('IDEA-Research/grounding-dino-tiny', ['*.json', '*.txt', 'model.safetensors']),
            ('facebook/dinov2-base', None),
            (hyworld.VLM_MODEL, None),
        ]:
            cache_model(root, repo, patterns, models)
    return models


def doctor(config, profile=None):
    inventory = {'gpus': hyworld.gpu_inventory(), 'nvcc': shutil.which('nvcc'),
                 'disk_free_gib': round(shutil.disk_usage(config['state_dir']).free / 1024**3, 1),
                 'git': shutil.which('git'), 'installation': hyworld.installation_status(config)}
    if profile:
        root = hyworld.runtime(config)
        python = root / 'hyworld-venv/bin/python'
        code = ("import json,torch,flash_attn,gsplat; "
                "assert torch.cuda.is_available(), 'CUDA is unavailable'; "
                "assert torch.cuda.is_bf16_supported(), 'This profile requires BF16'; "
                "print(json.dumps({'torch':torch.__version__,'cuda':torch.version.cuda,"
                "'devices':[torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]}))")
        command([python, '-c', code], env=hyworld.environment(config))
        upstream = root / 'HY-World-2.0'
        command([python, '-m', 'hyworld2.worldrecon.pipeline', '--help'], cwd=upstream, env=hyworld.environment(config))
        if profile == 'worldgen':
            for script in ['traj_generate.py', 'traj_render.py', 'video_gen.py', 'gen_gs_data.py', 'world_gs_trainer.py']:
                command([python, script, '--help'], cwd=upstream / 'hyworld2/worldgen', env=hyworld.environment(config))
            command([root / 'vlm-venv/bin/python', '-c', 'import vllm; print(vllm.__version__)'])
    return inventory


def setup(config, profile):
    if sys.version_info[:2] != (3, 11):
        raise ValueError('Run setup-hyworld with Python 3.11 (the API can use Python 3.11+)')
    if not shutil.which('nvcc') or not shutil.which('nvidia-smi'):
        raise ValueError('Install the NVIDIA driver and CUDA 12.8 toolkit first; nvcc and nvidia-smi must be on PATH')
    root = hyworld.runtime(config)
    root.mkdir(parents=True, exist_ok=True)
    with store.lock(config, 'worker'), store.lock(config, 'setup'):
        upstream = root / 'HY-World-2.0'
        if not upstream.exists():
            command(['git', 'clone', 'https://github.com/Tencent-Hunyuan/HY-World-2.0.git', upstream])
        command(['git', 'checkout', '--detach', hyworld.UPSTREAM_REVISION], cwd=upstream)
        command(['git', 'submodule', 'update', '--init', '--recursive'], cwd=upstream)
        # Upstream hardcodes this one cache location. Use the service-private cache instead.
        source = upstream / 'hyworld2/worldgen/traj_generate.py'
        original = source.read_text()
        before = 'HF_CACHE_DIR = os.path.expanduser("~/.cache/huggingface/hub")'
        after = 'HF_CACHE_DIR = os.environ["HF_HUB_CACHE"]'
        if before not in original and after not in original:
            raise ValueError('Unexpected upstream cache configuration; review the pinned source')
        source.write_text(original.replace(before, after))
        requirements = (upstream / 'requirements.txt').read_text().replace('cupy==13.6.0', 'cupy-cuda12x==13.6.0')
        (root / 'requirements.hyworld.txt').write_text(requirements)
        # Pin the one unpinned Git dependency to the SHA resolved on first setup.
        git_requirements = (upstream / 'requirements_git.txt').read_text()
        dependency_lock = root / 'pytorch3d.revision'
        if not dependency_lock.exists():
            result = subprocess.check_output(['git', 'ls-remote', 'https://github.com/facebookresearch/pytorch3d.git', 'HEAD'], text=True)
            dependency_lock.write_text(result.split()[0])
        git_requirements = git_requirements.replace('git+https://github.com/facebookresearch/pytorch3d.git\n',
            f'git+https://github.com/facebookresearch/pytorch3d.git@{dependency_lock.read_text().strip()}\n')
        (root / 'requirements.git.txt').write_text(git_requirements)
        venv.EnvBuilder(with_pip=True).create(root / 'hyworld-venv')
        if profile == 'worldgen':
            venv.EnvBuilder(with_pip=True).create(root / 'vlm-venv')
        env = {**os.environ, 'RECAST_PATH': str(upstream / 'hyworld2/worldgen/third_party/recastnavigation')}
        for argv, cwd in installation_commands(root, profile):
            command(argv, cwd=cwd, env=env)
        # Run the downloader in the service environment; it does not import any CUDA packages.
        models = download_models(root, profile)
        doctor(config, profile)
        freezes = {}
        for name in ['hyworld'] + (['vlm'] if profile == 'worldgen' else []):
            freeze = subprocess.check_output([root / f'{name}-venv/bin/python', '-m', 'pip', 'freeze'], text=True)
            (root / f'{name}.freeze.txt').write_text(freeze)
            freezes[name] = freeze.splitlines()
        result = {'installed': True, 'upstream_revision': hyworld.UPSTREAM_REVISION,
                  'profiles': ['worldmirror'] + (['worldgen'] if profile == 'worldgen' else []),
                  'models': models, 'dependencies': freezes, 'installed_at': store.now(),
                  'gpu_validated': False, 'cache_patch': after}
        store.write_json(root / 'installation.json', result)
        return result
