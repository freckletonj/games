# Agent API

All routes require `Authorization: Bearer $ASSET_API_TOKEN`. If Cloudflare Access
is enabled, also send `CF-Access-Client-Id` and `CF-Access-Client-Secret`.
`asset-service upload` and `scripts/smoke.py` read these from the environment.

`GET /v1/schema` returns the OpenAPI document. Unknown fields are rejected;
there are no arbitrary model flags, commands or filesystem paths in job requests.

| Method/path | Purpose |
| --- | --- |
| `GET /health` | Authenticated reachability check |
| `GET /v1/capabilities` | Installed components, profiles, GPU inventory and limits |
| `POST /v1/uploads` | Begin a binary upload with filename, size and SHA256 |
| `GET /v1/uploads/{id}` | Query durable upload offset |
| `PATCH /v1/uploads/{id}` | Append bytes with `Upload-Offset` header |
| `POST /v1/uploads/{id}/complete` | Check size/hash; return artifact metadata |
| `GET /v1/artifacts/{id}` | Download bytes; supports Range |
| `POST /v1/jobs` | Queue transfer/reconstruction/environment work; returns 202 |
| `GET /v1/jobs/{id}` | Status, stage, request, timestamps and failure |
| `GET /v1/jobs/{id}/logs?offset=0` | Up to 64 KiB text plus next byte offset |
| `GET /v1/jobs/{id}/artifacts` | Sources, outputs, manifest and diagnostic artifact IDs |
| `POST /v1/jobs/{id}/cancel` | Cancel queued work or stop the active process group |
| `GET /v1/repo` | Remote branches/heads and local protected-branch policy |
| `GET /v1/repo/tree?ref=...` | Recursive tree at a resolved commit |
| `GET /v1/repo/file?ref=...&path=...` | Exact blob bytes; `resolve_lfs=true` downloads the LFS payload |
| `GET /v1/repo/diff?base=...&head=...` | Stat and patch |
| `POST /v1/repo/branches` | Create/push a new branch from a resolved base |
| `POST /v1/publications` | Commit and push explicit file mappings/deletions |

## Upload and resume

Use the client for real files. Its stderr prints the upload ID before sending
chunks, and stdout returns the finalized artifact metadata:

```sh
asset-service upload source.png --url https://assets.freckleton.io
# After an interruption, use the same file and the printed upload ID:
asset-service upload source.png --url https://assets.freckleton.io --upload-id UPLOAD_ID
```

Protocol: `POST /v1/uploads` with
`{"filename":"source.png","size":1234,"sha256":"64-lowercase-hex-characters"}`.
The result includes `id`, `offset` and `chunk_bytes`. Send each chunk as the
request body of `PATCH /v1/uploads/{id}`, with `Upload-Offset` equal to the current
offset. A stale offset gets 409 and the server's current offset. An oversized or
disconnected chunk is rolled back to its starting offset. Finalize only after
all bytes have arrived. Completion is idempotent. A checksum mismatch requires
a new upload if the intended bytes differ.

## Submit a reconstruction

Use individual observations of a **rigid** object/scene. The order of IDs is the
frame order. A single input image does not prove unseen surfaces were recovered.

```json
{
  "request_key": "cat-reconstruction-001",
  "task": "reconstruction",
  "inputs": ["ARTIFACT_ID_FRONT", "ARTIFACT_ID_SIDE", "ARTIFACT_ID_BACK"],
  "seed": 1024
}
```

`POST /v1/jobs` returns `{"id":"JOB_ID","status":"queued"}`. Status progresses
through `queued`, `running` and `succeeded`/`failed`/`cancelled`. A successful
response to submission means the job was accepted, not completed. Reusing the
request key with an identical request returns the same job; different contents
get 409. Worker restarts mark interrupted work failed rather than successful;
submit a new key only after inspecting diagnostics. CPU `transfer` uses the same
contract and copies input bytes without invoking a model.

## Submit an environment

```json
{
  "request_key": "town-square-001",
  "task": "environment",
  "inputs": ["PANORAMA_ARTIFACT_ID"],
  "seed": 1024,
  "panorama_confirmed": true
}
```

The input must be one reviewed 2:1 equirectangular panorama. The initial profile
selects one principal view and one navigation/reconstruction target to keep the
trial small, uses DMD expansion, and requests optimized splats, SPZ and a mesh.
Training steps are configured on the host. The seed is forwarded to upstream
stages that expose it; upstream Gaussian training has its own fixed seed.
Results retain native coordinate conventions and inferred scale. They are
candidates to inspect, not ready-made Adventure Town levels or collision meshes.

After a terminal status, list artifacts and download the manifest first. Output
names are relative to the job directory: `output/...` contains final candidates;
`scene/...` contains intermediates. The manifest records the plan and measured
stage results. Do not fetch large binaries into conversational text.

## Branches and publication

Create a branch with `POST /v1/repo/branches`:

```json
{"name":"assets/town-square","base":"refs/remotes/origin/main"}
```

Use the returned SHA as `expected_head`. Explicitly select artifacts to commit:

```json
{
  "request_key": "publish-town-square-001",
  "branch": "assets/town-square",
  "expected_head": "40_CHARACTER_COMMIT_SHA",
  "message": "Add reviewed town-square candidate",
  "files": [
    {"artifact_id":"OUTPUT_ARTIFACT_ID","path":"Adventure Town/environments/town-square/scene.spz","lfs":true},
    {"artifact_id":"MANIFEST_ARTIFACT_ID","path":"Adventure Town/environments/town-square/manifest.json"}
  ],
  "delete": []
}
```

The response includes `commit_sha`, branch, changed paths and file hashes. The
publisher validates actual Git blob bytes before pushing. Destination symlinks,
path traversal, `.git`, stale heads, duplicate destinations and oversized regular
Git blobs are rejected. Set `lfs: true` for a large file; existing LFS attributes
are honored too. Explicit LFS tracking also commits the resulting root
`.gitattributes` change and includes it in the receipt. Publish an uploaded
`.gitattributes` file separately from mappings with `lfs: true`. Byte-changing Git attributes are
rejected rather than silently publishing altered files. Use repository-relative
paths for any code/assets/docs you intend to change; no assets-only root is
required. Deletions require existing regular files.

A publication request key identifies a specific attempt. Retrying a completed
request returns its original receipt. If a crash or remote conflict interrupts
an attempt, inspect `/v1/repo` and the host publication record before using a new
key. The service does not automatically overwrite/rebase concurrent work.
There is no merge, force-reset, remote shell or remote setup endpoint. Use the
GitHub connector for PR review and merge.

`GET /v1/repo/file` returns the committed pointer for LFS files by default.
Add `resolve_lfs=true` to fetch the object from the configured remote and stream
the original payload. The response supports HTTP Range.
