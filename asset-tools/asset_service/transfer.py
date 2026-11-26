"""CPU smoke job: copy real input bytes. Deliberately performs no 3D generation."""
from pathlib import Path
import shutil
import sys

root = Path(sys.argv[1])
for source in sorted((root / 'input').iterdir()):
    shutil.copyfile(source, root / 'output' / source.name)
print('Copied input bytes; no model was invoked.', flush=True)
