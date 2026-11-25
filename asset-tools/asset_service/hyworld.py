"""Exact commands for the pinned upstream CLIs; no model imports in the API."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

UPSTREAM_REVISION = 'df9988efb87bfc0f4947eb3889411cf957478b06'
VLM_MODEL = 'Qwen/Qwen3-VL-8B-Instruct'


def runtime(config):
    return config['state_dir'] / 'runtime'


def installation_status(config):
    path = runtime(config) / 'installation.json'
    return json.loads(path.read_text()) if path.exists() else {'installed': False}


def gpu_inventory():
    if not shutil.which('nvidia-smi'):
        return []
    result = subprocess.run(['nvidia-smi', '--query-gpu=index,name,memory.total,driver_version', '--format=csv,noheader,nounits'],
                            capture_output=True, text=True, timeout=10)
    return {'returncode': result.returncode, 'inventory': result.stdout.strip().splitlines()}


def check_installation(config, task):
    status = installation_status(config)
    profile = 'worldgen' if task == 'environment' else 'worldmirror'
    if not status.get('installed') or profile not in status.get('profiles', []):
        raise ValueError(f'Install HY-World profile {profile} before submitting this task')
    if not (runtime(config) / 'hyworld-venv/bin/python').exists():
        raise ValueError('HY-World Python environment is missing')
    if status.get('upstream_revision') != UPSTREAM_REVISION:
        raise ValueError('Installed HY-World revision differs from the service revision')


def environment(config):
    root = runtime(config)
    return {**{key: value for key, value in os.environ.items() if key not in ('ASSET_API_TOKEN', 'CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET')}, 'HF_HOME': str(root / 'hf'), 'HF_HUB_CACHE': str(root / 'hf/hub'),
            'TORCH_HOME': str(root / 'torch'), 'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1',
            'PYTHONPATH': str(root / 'HY-World-2.0'), 'PYTHONUNBUFFERED': '1',
            'CUDA_VISIBLE_DEVICES': ','.join(config['gpu_ids']),
            'TOKENIZERS_PARALLELISM': 'false', 'WANDB_MODE': 'disabled'}


def stage(name, argv, cwd, gpus, requires_vlm=False, expected=()):
    return {'name': name, 'argv': [str(item) for item in argv], 'cwd': str(cwd),
            'gpus': gpus, 'requires_vlm': requires_vlm, 'expected': [str(item) for item in expected]}


def plan(config, spec, directory):
    directory = Path(directory)
    if spec['task'] == 'transfer':
        return [stage('transfer', [sys.executable, Path(__file__).with_name('transfer.py'), directory], directory, [])]
    root = runtime(config)
    upstream = root / 'HY-World-2.0'
    python = root / 'hyworld-venv/bin/python'
    inputs = directory / 'input'
    output = directory / 'output'
    gpus = config['gpu_ids']
    if not gpus:
        raise ValueError('Configure at least one GPU')
    if spec['task'] == 'reconstruction':
        # Start with one GPU; input frame order is encoded in the numeric filenames.
        return [stage('worldmirror', [python, '-m', 'hyworld2.worldrecon.pipeline',
            '--input_path', inputs, '--strict_output_path', output,
            '--target_size', config.get('reconstruction_size', 518),
            '--enable_bf16', '--no_sky_mask', '--no_interactive'], upstream, gpus[:1],
            expected=[output / 'gaussians.ply'])]
    scene = directory / 'scene'
    worldgen = upstream / 'hyworld2/worldgen'
    workers = len(gpus)
    def distributed(script, *args):
        return [python, '-m', 'torch.distributed.run', '--standalone', f'--nproc_per_node={workers}', script, *args]
    vlm_args = ['--llm_addr', '127.0.0.1', '--llm_port', str(config.get('vlm_port', 18080)), '--llm_name', VLM_MODEL]
    steps = config.get('train_steps', 4000)
    results = scene / 'render_results/generation_bank_worldstereo-memory-dmd'
    return [
        stage('trajectory_planning', [python, 'traj_generate.py', '--target_path', scene,
              '--seed', spec['seed'], '--split_view_num', '1', '--wonder_topk', '1', '--recon_topk', '1',
              '--apply_nav_traj', '--force_vlm', *vlm_args], worldgen, gpus[:1], True,
              expected=[scene / 'meta_info.json', scene / 'render_results/global_pcd.ply']),
        stage('trajectory_rendering', distributed('traj_render.py', '--target_path', scene,
              '--seed', str(spec['seed']), *vlm_args), worldgen, gpus, True),
        stage('worldstereo', distributed('video_gen.py', '--target_path', scene,
              '--model_type', 'worldstereo-memory-dmd', '--seed', str(spec['seed']), '--fsdp', '--local_files_only'),
              worldgen, gpus, expected=[results / 'global_pcd.ply', results / 'aligned_pcd.ply']),
        stage('training_data', distributed('gen_gs_data.py', '--root_path', scene, '--save_normal', '--split_sky'),
              worldgen, gpus, expected=[scene / 'gs_data/cameras.json']),
        stage('gaussian_training', [python, '-m', 'world_gs_trainer', 'default',
              '--data_dir', scene / 'gs_data', '--result_dir', output,
              '--max_steps', steps, '--save_steps', steps, '--eval_steps', steps, '--ply_steps', steps,
              '--save_ply', '--convert_to_spz', '--disable_video', '--export_mesh',
              '--use_scale_regularization', '--antialiased', '--depth_loss', '--normal_loss',
              '--sky_depth_from_pcd', '--use_mask_gaussian', '--mask_export_stochastic',
              '--no-mask-export-anchor-protection', '--use_anchor_protection',
              '--strategy.refine-start-iter', int(steps * .1), '--strategy.refine-stop-iter', int(steps * .5),
              '--strategy.refine-every', '100', '--strategy.refine-scale2d-stop-iter', int(steps * .5),
              '--strategy.reset-every', '99990', '--strategy.grow-grad2d', '0.0001', '--strategy.prune-scale3d', '0.1'],
              worldgen, gpus),
    ]


def vlm_command(config, seed):
    return [str(runtime(config) / 'vlm-venv/bin/python'), '-m', 'vllm.entrypoints.openai.api_server',
            '--model', VLM_MODEL, '--served-model-name', VLM_MODEL, '--host', '127.0.0.1',
            '--port', str(config.get('vlm_port', 18080)), '--tensor-parallel-size', '1',
            '--gpu-memory-utilization', str(config.get('vlm_memory_fraction', .45)),
            '--max-model-len', '32768', '--dtype', 'bfloat16', '--seed', str(seed)]
