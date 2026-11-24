# Ticket: Local asset processing and publication API

**Status:** Planned; implementation will happen separately. This directory is
the home for shared asset-service code, setup scripts and tests. This PR adds
only this ticket. Keep game runtime code and approved assets in their existing
game directories.

## Goal

Build a small service on the user's Linux machine that ChatGPT can access
through an authenticated Cloudflare tunnel. ChatGPT supplies generated artwork;
the service uploads/stores binary files, runs local 3D processing, exposes
reviewable results, and commits selected assets to a designated Git branch.

Support characters, isolated objects and environments through one API, using
specialized local model workers. Preserve both Gaussian splats and useful mesh
outputs so the project can evaluate direct splat rendering and conventional
game assets. Prefer a single reference image as the user-facing input.

## Decisions and boundaries

- Initial artwork is generated using ChatGPT's image-generation capabilities.
  Do not deploy HY-Pano or another general-purpose image model as part of this
  ticket. Still images and sprite sheets are supported inputs; GIF frames can
  be decoded as observations, but are not assumed to be calibrated video.
- All reconstruction, scene completion, object generation and rigging run on
  the user's hardware. Model downloads happen during setup; jobs use locally
  cached weights and a local planning VLM, with no hosted inference APIs.
- HY-World's WorldStereo remains a local model: it synthesizes new observations
  along camera paths. Supplying artwork from ChatGPT does not replace this
  3D-conditioned view-completion step.
- An environment-generation job initially requires a validated 2:1
  equirectangular panorama. A wide perspective image is not an equivalent
  input. Supply that panorama from ChatGPT and inspect its seam/projection.
  Return a clear unsupported-input error for an ordinary single perspective
  image; do not silently reintroduce a panorama model. Supporting other input
  routes can be a later explicit change.
- Keep the first implementation simple: FastAPI, SQLite job state, filesystem
  artifacts, and a separate worker launching predefined stage commands. Start
  with one processing job at a time and explicit GPU allocation per stage.
- Uploading, processing and Git publication are separate actions. An explicit
  publication request selects the files to commit; processing alone does not
  replace game assets or publish a failed candidate.
- This service does not provide game-time AI inference. Desktop and TV-browser
  rendering performance is evaluated separately using exported assets.

## Hardware and execution profiles

Available machines:

| Machine | Intended use | Qualification |
| --- | --- | --- |
| 32 GB RAM, one 12 GB GPU | API, previews, small reconstruction trials and lightweight processing | Full environment generation is not an initial supported profile. Benchmark reduced-resolution WorldMirror batches before enabling them. |
| 256 GB RAM, two 48 GB GPUs | Primary processing server for objects, characters and environments | Target staged loading and two-GPU sharding. The 96 GB is not automatically a single memory pool. |

First discover exact GPU models, drivers, CUDA support, free disk space and
inter-GPU connectivity. The proposed GPU workers assume NVIDIA/CUDA. Pin the
repository revision, dependencies and model revisions for each worker;
different upstream tools may require separate environments.

HY-World 2.0's published full-generation setup recommends at least four GPUs,
tested with eight H20s. Its source supports WorldStereo FSDP sharding and
reduced-GPU splat-training configurations, making two 48 GB cards a credible
adaptation target, **not a verified end-to-end fit**. Removing HY-Pano removes
its large panorama model, not WorldStereo or the planning/geometry models.

TRELLIS documents at least 16 GB VRAM; UniRig documents at least 8 GB for
generation. WorldMirror's safe batch/resolution limits and the full environment
profile must be measured on the actual machines. Do not publish guessed
minimum VRAM or generation times as supported capabilities.

Load models by stage and release GPU memory between stages. For example, stop
the planning VLM before a WorldStereo stage that needs both GPUs. Use the big
machine's host RAM for loading/offloading only where the selected worker
explicitly supports it. Offloading is not assumed to make every model fit.

## Processing workflows

### Environments

Validated panorama → WorldNav camera-path planning → trajectory rendering →
WorldStereo view expansion → geometry/training-data preparation → Gaussian
optimization → splat and optional mesh export → previews and measurements.

Use HY-World 2.0's released pipeline and its recommended DMD world-expansion
variant as the first configuration to benchmark. Host its planning model, such
as Qwen3-VL, locally through vLLM. An OpenAI-compatible client in upstream code
must point to this local endpoint.

Retain per-stage outputs so a failed later stage can be rerun without discarding
successful expensive work. Validate compatibility of saved intermediates with
the recorded configuration before reusing them. Keep scene size, path count,
resolution, generated observations and optimization steps explicit in profiles.

WorldMirror accepts camera, intrinsic and depth priors. Support these as
optional reconstruction inputs, including priors rendered from declarative
level geometry. Document coordinate conventions, depth units and image
resolution. This conditioning is not a guarantee that generated artwork obeys
all gameplay clearances; compare it with the authored scaffold.

### Reconstruction from supplied observations

Uploaded images, a sheet or decoded GIF frames → explicit frame selection and
optional camera/depth priors → WorldMirror → splats/geometry → optional
optimization and meshing → inspection artifacts.

This is a distinct task from single-image world generation. It does not claim
to recover unseen surfaces from one image or make inconsistent generated views
agree. Report the observations and estimated versus supplied cameras used.

### Objects and characters

Transparent oblique reference image → local TRELLIS → native Gaussian and mesh
outputs → geometry inspection/cleanup → optional UniRig skeleton and skin
weights → export and motion assessment.

HY-World's avatar-exploration demos do not establish automatic character
creation or rigging. Keep the dedicated object/character worker behind the
same API. Character rigging is an explicit optional stage; objects need not
receive skeletons.

Mesh-to-rigged-GLB integration should reuse or adapt the existing
`Adventure Town/tools/asset_pipeline/` functions without changing canonical
characters by default. Weight transfer from a rigged mesh to splats is a
separate experimental output, not an assumed UniRig capability. A valid GLB
does not establish good deformation, contacts or artistic quality.

## API contract

Implement versioned JSON endpoints, with binary transfer outside JSON/base64.
Use generated IDs to refer to uploaded inputs and stored artifacts.

| Endpoint | Required behavior |
| --- | --- |
| `GET /v1/capabilities` | Report service version, GPU inventory, installed model revisions and validated profiles. Distinguish experimental profiles from verified ones. |
| `POST /v1/uploads` | Stream a binary file; return upload ID, byte size, detected media type and SHA256. Support resumable chunks with an explicit finalize/checksum step for large files. |
| `POST /v1/jobs` | Accept task, input IDs, profile, seed and documented settings/priors; return a job ID immediately with HTTP 202. |
| `GET /v1/jobs/{id}` | Return queued/running/succeeded/failed/cancelled state, current stage, progress information, timestamps, logs and measured resource usage. |
| `GET /v1/jobs/{id}/artifacts` | List output IDs, roles, formats, sizes and hashes, including partial diagnostic outputs after failure. |
| `GET /v1/artifacts/{id}` | Stream/download one artifact with HTTP Range support for large browser assets. |
| `POST /v1/jobs/{id}/cancel` | Cancel queued work or terminate the running stage's process group and record the outcome. |
| `POST /v1/publications` | Commit an explicit artifact-to-repository-path mapping to a configured branch, guarded by the expected branch-head SHA; return commit SHA and changed paths. |

Processing tasks are `environment`, `reconstruction`, and `object`. Object
jobs may request a rig stage. Validate settings against the selected profile;
reject unsupported combinations clearly rather than changing models or
reducing quality silently. Keep uploaded art and original frame ordering intact.

Persist job state and logs across API restarts. On worker restart, identify
interrupted jobs accurately rather than marking them successful. Record stage
exit status and useful failure output. Resource-heavy jobs must run outside
the HTTP request process; polling and cancellation remain responsive.

Each result bundle should contain the source references, applicable native
splats, compressed rendering assets, mesh/rig outputs, camera/depth data,
rendered previews and a machine-readable manifest. Record model/config hashes,
seeds, coordinate transforms, per-stage timings, peak VRAM per GPU and peak
host RAM. Label estimated scale and inferred hidden geometry honestly.

## Tunnel and Git integration

Bind the API to loopback and expose it through a named Cloudflare tunnel with
Access service-token authentication. Keep the VLM and worker interfaces private.
Expose predefined processing and publication operations rather than a generic
shell or unrestricted filesystem interface. Store credentials on the host,
outside Git and logs. Account for Cloudflare request-size limits through the
chunked upload protocol; long processing uses polling, not a long HTTP request.

Generation and storage are local. Remote access necessarily transfers selected
inputs, previews and artifacts through Cloudflare and the requesting client;
this is local inference, not an air-gapped workflow.

Publication uses a configured checkout/worktree and the host's Git credentials.
Allow only configured repositories, branches and destination roots. Serialize
repository mutations; reject stale expected-head SHAs and report conflicts
without overwriting concurrent work. Resolve artifact IDs internally and
validate destination paths. Return a concrete commit receipt.

Use normal Git for small assets and an explicit Git LFS policy for large
assets. GitHub blocks regular Git files above 100 MiB; using this API does not
remove that limit. Keep weights, dependency caches, temporary jobs and rejected
outputs outside tracked source. Do not publish every intermediate to Git.

The transfer goal is to send files as bytes from the generation workspace to
the local server, with only IDs/hashes/status in conversational tool results.
GitHub's current connector accepts inline base64 for binary blob creation;
the local upload-and-publish route avoids that payload expansion. Prove this
route with an uploaded real image and a committed binary that has the same hash.

## Implementation and acceptance checklist

- [ ] Document Linux setup, exact supported GPU/driver configuration, pinned
  worker environments, model downloads and local VLM startup. Verify cached
  models can execute without hosted inference endpoints.
- [ ] Implement authenticated uploads, capabilities, durable asynchronous jobs,
  cancellation, artifact streaming and explicit Git publication.
- [ ] Add meaningful API tests for byte-exact upload/download, chunk resume and
  checksum rejection, unsupported profiles, authenticated access, destination
  confinement, cancellation, interrupted jobs and stale Git-head rejection.
- [ ] Validate WorldMirror on known rigid renders before generated inputs.
  Measure resolution/view-count limits on both hardware options; report failures.
- [ ] Validate WorldNav with the local VLM, then WorldStereo on two GPUs, then
  Gaussian optimization/export. Record peak memory and timings separately.
- [ ] Complete one small environment from a ChatGPT-generated panorama; inspect
  seams, geometry, unseen viewpoints, floaters and scaffold alignment. Preserve
  raw and optimized splats plus a mesh candidate when extraction succeeds.
- [ ] Complete one isolated prop and the existing cat reference through the
  object worker; exercise optional rigging and report deformation/foot sliding.
  Do not silently replace the game's current cat.
- [ ] Verify a generated image can be uploaded through the tunnel, processed,
  reviewed and published to a test branch. Compare hashes and retrieve the
  resulting commit. Exercise Git LFS with an appropriately sized test artifact.
- [ ] Inspect exported splats/meshes with the game's intended renderer. Measure
  loading, memory and slow-frame behavior on desktop and the actual TV browser.
  Target 60 fps desktop / 30 fps TV as initial goals, not guaranteed results.
- [ ] Provide a short operator runbook and API examples for submit, inspect,
  cancel, download and publish. Record remaining unsupported stages explicitly.

Completion means the API and tested processing profiles are reproducible and
usable remotely. Experimental profiles may remain clearly marked; an OOM or
unsupported stage must not be disguised as a completed asset. The first
environment trial must establish whether the two-GPU configuration is viable
before describing full generation as supported.

## References and existing evidence

Hardware and upstream behavior were assessed on 2026-11-24; recheck upstream
revisions during implementation. HY-World source inspected at
`df9988efb87bfc0f4947eb3889411cf957478b06`. No HY-World GPU benchmark has yet
been run on the user's machines.

- [HY-World 2.0](https://github.com/Tencent-Hunyuan/HY-World-2.0)
- [World generation stages and GPU setup](https://github.com/Tencent-Hunyuan/HY-World-2.0/blob/main/hyworld2/worldgen/README.md)
- [WorldMirror API, priors and outputs](https://github.com/Tencent-Hunyuan/HY-World-2.0/blob/main/DOCUMENTATION.md)
- [TRELLIS: native Gaussian and mesh outputs](https://github.com/microsoft/TRELLIS)
- [UniRig](https://github.com/VAST-AI-Research/UniRig)
- [Spark renderer](https://github.com/sparkjsdev/spark)
- [Cloudflare service-token authentication](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)
- [GitHub large-file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- [Adventure Town's measured reconstruction trials](../Adventure%20Town/docs/reconstruction-options-20261124/README.md)

The existing trials found useful matching/calibration signals and a cleaner
TripoSR cat, but neither better mesh appearance nor a numerical rig audit solved
animation quality. Carry those distinctions into this service's reports.
