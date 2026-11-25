# Local asset service

A small Python server for agents to upload binary files, run local HY-World
jobs, inspect outputs and manipulate the configured Git repository. The API
binds to `127.0.0.1:8787`; expose it through your Cloudflare tunnel.

The API and Git harness run without CUDA. HY-World is installed separately into
private Python environments and runs only when a worker takes a job. Nothing
changes Adventure Town's canonical characters or gameplay automatically.

**Status:** CPU/HTTP/Git integration is tested. The GPU profiles are experimental:
this environment has no CUDA hardware, and two 48 GB cards have not yet been
qualified for the complete world-generation pipeline. Successful setup validates
imports and CLI contracts, not reconstruction quality or peak memory fit.

## Ubuntu setup

Use an ordinary user account. Install the NVIDIA driver and **CUDA Toolkit
12.8**, including `nvcc`, before the model setup. `nvidia-smi`'s displayed CUDA
version is the driver's compatibility level, not proof the toolkit is installed.

```sh
sudo apt-get update
sudo apt-get install -y build-essential cmake ninja-build pkg-config git gh \
  ffmpeg libgl1 libegl1 libopengl0 libglib2.0-0 libgomp1
nvidia-smi
nvcc --version
```

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) if you do not
have Python 3.11. The API supports 3.11+, but the pinned model setup deliberately
uses **3.11**. With uv installed:

```sh
git clone https://github.com/freckletonj/games.git
cd games
git switch codex/local-hyworld-service
cd asset-tools
uv python install 3.11
uv venv --python 3.11 .venv
. .venv/bin/activate
uv pip install -e '.[deploy]'
cp config.example.toml config.toml
```

Edit `config.toml`: choose the state directory on a disk with ample space and
set `gpu_ids` from `nvidia-smi`. Model checkpoints, duplicate base weights,
compiled extensions and scene intermediates can consume substantial space;
inspect available disk before downloading. Use the default disabled GPU tasks
for the first smoke test.

Create a service secret **on the host** and authorize Git pushes. Keep secrets
out of Git, command arguments and shared logs:

```sh
umask 077
mkdir -p ~/.config
python -c 'import secrets; print("ASSET_API_TOKEN=" + secrets.token_urlsafe(32))' \
  > ~/.config/game-asset-service.env
set -a
. ~/.config/game-asset-service.env
set +a
gh auth login
gh auth setup-git
asset-service --config config.toml repo-init
asset-service --config config.toml doctor
python -m unittest discover -s tests -v
asset-service --config config.toml serve
```

`repo-init` makes a separate bare clone in the state directory. It never checks
out files over your development checkout. Run it once. The configured remote
may also be an SSH URL if your account already has working SSH credentials.

In a second terminal, activate the same environment and load the same secret:

```sh
cd games/asset-tools
. .venv/bin/activate
set -a
. ~/.config/game-asset-service.env
set +a
python scripts/smoke.py
python scripts/smoke.py --publish
```

The first command uploads a PNG, runs a CPU transfer job, downloads the result
and checks its SHA256. `--publish` additionally creates an `assets/smoke-*`
branch, publishes `asset-tools/probes/probe.png` and verifies the committed bytes.
It does not merge the branch. This is an actual byte-transfer test, not synthetic
3D output.

## Install the HY-World components

Stop `serve` before setup. Setup refuses to run while the worker lock is held.
Start with reconstruction to validate the smaller dependency/model path:

```sh
asset-service --config config.toml setup-hyworld --profile worldmirror
```

For full environment generation, install the additional components:

```sh
asset-service --config config.toml setup-hyworld --profile worldgen
```

Full setup needs access to the gated
[facebook/sam3 checkpoint](https://huggingface.co/facebook/sam3). Accept its terms
with your Hugging Face account first, and set `HF_TOKEN` locally if required:

```sh
read -rs -p 'Hugging Face token: ' HF_TOKEN; echo
export HF_TOKEN
asset-service --config config.toml setup-hyworld --profile worldgen
unset HF_TOKEN
```

Setup clones HY-World at `df9988efb87bfc0f4947eb3889411cf957478b06`, initializes
its submodule, validates command options against the source, installs the CUDA
extensions and downloads the selected models. It does **not** install HY-Pano,
TRELLIS or UniRig. A `worldgen` install includes `worldmirror`.

| Component | Installed configuration |
| --- | --- |
| WorldMirror | Local reconstruction model; initial jobs use one GPU and BF16 |
| WorldNav | Pinned upstream planning/rendering scripts, MoGe, SAM3, ZIM and Grounding DINO |
| Planning VLM | Qwen3-VL-8B-Instruct, separate vLLM 0.11.2 environment |
| WorldStereo | `worldstereo-memory-dmd`, Wan base model, FSDP over configured GPUs |
| Composition | Upstream Gaussian optimizer, SPZ export and mesh extraction request |

The worker starts its own private VLM only for planning and trajectory rendering,
then stops it before WorldStereo. Set `vlm_memory_fraction` if the planner and
VLM cannot share the first card. The two-GPU profile is an adaptation to test:
upstream recommends at least four GPUs for full generation. In particular,
WorldStereo's nested WorldMirror inference can have a substantial memory peak.

Setup uses the CUDA 12 binary CuPy wheel instead of compiling `cupy`, sets
`RECAST_PATH` for the upstream navmesh build, and changes the upstream planner's
hardcoded Hugging Face cache path to the service-private cache. It prepulls VGG
weights used by the training metric. `installation.json` records that patch,
model revisions, dependency freezes and the upstream revision. Model revisions
and the otherwise unpinned PyTorch3D source revision are resolved on first setup
and reused on subsequent setup runs; dependencies with upstream version ranges
are recorded in the freeze, not claimed to be fully locked in advance.

No model downloads or hosted inference are intended during jobs. Workers set
Hugging Face/Transformers offline mode and use their private model cache. This is
not an OS network sandbox for third-party code. CPU tests do not establish that
every upstream inference path is offline; the first GPU trial must confirm it.

After setup, enable `enable_reconstruction` and, when ready,
`enable_environment` in `config.toml`, then restart `serve`. Enablement is the
operator's choice to run an **experimental** profile; capabilities continue to
report `gpu_validated: false`. There is no fabricated success flag.

```sh
asset-service --config config.toml doctor
asset-service --config config.toml serve
```

Original uploads remain unchanged. Reconstruction consumes ordered individual
still PNG/JPEG/WebP images and normalizes working copies to RGB. It does not
split spritesheets, decode GIF observations, infer animation or rig characters.
An environment job requires one reviewed **2:1 equirectangular panorama** and
`panorama_confirmed=true`. A 2:1 aspect ratio alone does not establish a correct
projection or seamless panorama. See [API.md](API.md) for submit/inspect examples.

### Quantization

There is no universal `load_in_8bit` switch for this stack. The pinned WorldStereo
loader constructs custom PyTorch modules, loads safetensors and wraps them in
FSDP; it exposes no int8/FP8 configuration. A comment mentioning FP8 in
`video_gen.py` does not correspond to a quantization path in the actual loader.
This service uses upstream BF16/FSDP and rejects unknown quantization settings.
A compatible quantized VLM/checkpoint can be a later measured change. Do not
assume half-sized weights halve total VRAM or fix activation-memory peaks.

## Expose through your tunnel

Map a hostname such as `assets.freckleton.io` to `http://127.0.0.1:8787` using a
named Cloudflare tunnel. Keep the API on loopback. Protect the hostname with a
Cloudflare Access **Service Auth** policy and service token if desired; the API
always additionally requires its bearer secret, including `/health` and schema.

On the calling machine, load `ASSET_API_TOKEN` securely. When Access is enabled,
also set `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. The included client
sends both Access headers. A browser login policy alone is not machine auth.

```sh
python scripts/smoke.py --url https://assets.freckleton.io
python scripts/smoke.py --url https://assets.freckleton.io --publish
asset-service upload /path/to/source.png --url https://assets.freckleton.io
```

Uploads use 8 MiB chunks by default. HTTP requests finish promptly; GPU work
continues in the worker and is inspected by polling. File downloads support
HTTP Range. No binary is encoded into JSON/base64.

For unattended operation, copy [deploy/game-asset-service.service](deploy/game-asset-service.service)
to `~/.config/systemd/user/`, replace the example paths, and run:

```sh
systemctl --user daemon-reload
systemctl --user enable --now game-asset-service
journalctl --user -u game-asset-service -f
```

`KillMode=control-group` cleans up descendants even after a process failure.
For operation after logout, enable lingering for your user if your machine's
systemd configuration requires it. Tunnel startup is managed separately.

## Git behavior and scope

The harness can read any file/ref in the configured remote, inspect trees and
diffs, create branches, and commit uploaded artifacts plus explicit deletions
at arbitrary repository-relative paths. It supports code/text files as well as
binary assets. It does not expose shell commands or arbitrary host files.
`main` is protected by the example local configuration; edit
`protected_branches` to change that policy. There is no fixed assets-only path
allowlist. PR creation, review and merge can use the existing GitHub connector.

Publication is explicit and separate from processing. Requests include the
expected remote head, a unique request key and selected paths. A fresh worktree
is created from that head; a compare-and-swap push rejects concurrent changes.
Job/publication retries reuse their original keys. Failed or interrupted
publication requests must be inspected before choosing a new key. Original
uploads can be published directly; failed-job artifacts cannot.

This first harness deliberately rejects Git LFS destinations and files above
100 MiB. They remain downloadable on the server; the GitHub size limit is not
bypassed. Large-asset LFS publication is follow-up work. Do not commit weights,
private configuration, rejected candidates or scene caches.

## Verification and remaining work

`python -m unittest discover -s tests -v` covers actual local Git commits/pushes,
byte equality, upload resume across API instances, Range downloads, checksums,
request idempotency, job cancellation/failure/restart, protected branches,
symlink/path confinement and stale heads. CPU CI runs on Python 3.11 and 3.12 and
checks generated command options against the pinned upstream AST. Setup runs
CLI/import checks on the actual GPU host. The HTTP smoke script exercises the
live API and worker together.

Jobs retain their commands, stage durations, sampled process-tree RSS and
sampled **whole-device** GPU memory in their manifests/logs. Samples can miss
short peaks; device memory includes other workloads and the VLM. These are
measurements, not guaranteed memory budgets. Job success requires expected
outputs, not just a zero process exit. Mesh quality, frame rate, rigging,
collision geometry and visual approval are separate work.

Next qualification: rigid known-view WorldMirror control, one small panorama,
two-GPU memory/timing measurements, held-out views and engine inspection. Stage
intermediates are retained for diagnosis, but automatic stage resume, camera/depth
prior uploads, object generation, rigging and LFS are not implemented here.

## Existing research

Earlier experiments are preserved in the
[pre-cleanup research snapshot](https://github.com/freckletonj/games/tree/1a688b4bf81d3e5f1047793a83eefad8e452a218/Adventure%20Town).
Depth/camera/meshing trials did not establish a robust replacement for the current
compiler; TripoSR improved the cat's tail but did not fix rig deformation. Keep
known rigid controls and thin-feature/identity/motion review in future trials.

Upstream references: [HY-World](https://github.com/Tencent-Hunyuan/HY-World-2.0),
[worldgen stages](https://github.com/Tencent-Hunyuan/HY-World-2.0/blob/df9988efb87bfc0f4947eb3889411cf957478b06/hyworld2/worldgen/README.md),
[Cloudflare service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/).
