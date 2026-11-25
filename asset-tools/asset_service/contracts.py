"""Check generated command options against upstream AST without importing CUDA."""
import ast
from pathlib import Path

from . import hyworld


def options(path):
    tree = ast.parse(Path(path).read_text())
    return {argument.value for node in ast.walk(tree) if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute) and node.func.attr == 'add_argument'
            for argument in node.args if isinstance(argument, ast.Constant) and isinstance(argument.value, str)
            and argument.value.startswith('--')}


def fields(path):
    return {node.target.id for node in ast.walk(ast.parse(Path(path).read_text()))
            if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)}


def check(source):
    source = Path(source)
    config = {'state_dir': source.parent / 'contract-state', 'gpu_ids': ['0', '1']}
    checked = []
    for task in ['reconstruction', 'environment']:
        for item in hyworld.plan(config, {'task': task, 'seed': 1024}, source.parent / 'contract-job'):
            argv = item['argv']
            if item['name'] == 'worldmirror':
                path = source / 'hyworld2/worldrecon/pipeline.py'
                selected = argv[argv.index('hyworld2.worldrecon.pipeline') + 1:]
                valid = options(path)
            elif item['name'] == 'gaussian_training':
                path = source / 'hyworld2/worldgen/world_gs_trainer.py'
                valid = fields(path) | fields(source / 'hyworld2/worldgen/third_party/gsplat_maskgaussian/gsplat/strategy/default.py')
                selected = argv[argv.index('default') + 1:]
            else:
                script = next(arg for arg in argv if arg.endswith('.py'))
                path = source / 'hyworld2/worldgen' / script
                selected = argv[argv.index(script) + 1:]
                valid = options(path)
            for argument in selected:
                if not argument.startswith('--'):
                    continue
                option = argument.split('=')[0]
                if item['name'] == 'gaussian_training':
                    option = option.removeprefix('--').replace('-', '_').split('.')[-1]
                    if option.startswith('no_'):
                        option = option[3:]
                if option not in valid:
                    raise ValueError(f'{path.name} does not expose {argument}')
            checked.append(item['name'])
    return checked
