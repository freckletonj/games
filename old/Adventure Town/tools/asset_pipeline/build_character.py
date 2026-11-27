"""Reconstruct, skin and audit a character from its own manifest."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

PIPELINE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('character', type=Path, help='Character directory containing character.json')
    parser.add_argument('--height', type=int, help='Override voxel height for an experiment')
    parser.add_argument('--out', type=Path, help='Override generated output directory')
    args = parser.parse_args()
    character = args.character.resolve()
    manifest = json.loads((character / 'character.json').read_text())
    settings = manifest['reconstruction']
    out = args.out.resolve() if args.out else character / 'generated'
    rig = character / manifest['rig']
    command = [str(PIPELINE / 'geometry/reconstruct.py'), str(character / manifest['source']),
               '--out', str(out), '--height', str(args.height if args.height is not None else settings['height']),
               '--agreement', str(settings['agreement']), '--elevation', str(settings['elevation']),
               '--rows', str(settings['rows']), '--cols', str(settings['cols']), '--rig-config', str(rig)]
    if 'angles' in settings:
        command.extend(['--angles', *map(str, settings['angles'])])
    for step in [command,
                 [str(PIPELINE / 'build_rig.py'), '--build', str(out), '--config', str(rig)],
                 [str(PIPELINE / 'validate_rig.py'), str(out)]]:
        subprocess.run([sys.executable, *step], check=True)


if __name__ == '__main__':
    main()
