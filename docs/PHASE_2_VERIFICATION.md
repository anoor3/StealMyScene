# Phase 2 Verification Record

Date: 2026-08-11

## Outcome

Phase 2 product and engineering implementation is complete through P2-08. P2-09 and P2-10 remain awaiting deployment because their acceptance evidence requires a real CDN, approved high-concurrency traffic, cache headers, origin telemetry, and real-browser first-frame measurements under load. No localhost result is used as a substitute for those gates.

## Acceptance matrix

| ID | Direct evidence | Result |
|---|---|---|
| P2-00 | `/create` accepts MP4, MOV, and WebM by drag, drop, or file picker; validates metadata and magic bytes; enforces 250 MB, ten-minute source, and one-to-fifteen-second clip limits; creates uniform line timing; reuses the complete studio; never enters catalog publication. Chrome and WebKit cover valid and invalid input, recording, rendering, download, mobile layout, accessibility, and resource cleanup. | Pass |
| P2-01 | Web Share capability detection attaches the rendered MP4 when supported. Unsupported browsers retain a primary download path. Unit tests cover supported, unsupported, cancelled, and failed sharing; Chrome exercises the file-share contract. | Pass |
| P2-02 | `Get a temporary link` is explicit and separate from native sharing. Production uploads go directly to S3/R2 using scoped signed URLs. Ready links have unguessable IDs, copyable public routes, private object storage, and ranged media delivery. | Pass |
| P2-03 | Link finalization extracts and transcribes replacement audio, moderates before publication, rejects and deletes blocked content, expires approved media after 72 hours by default, lazily enforces expiry, and supports authenticated scheduled physical cleanup. Approved, rejected, unauthorized, range, and deletion paths are covered. | Pass |
| P2-04 | The pushed catalog contains 75 unique original, rights-cleared scenes with immutable versioned names, 75 thumbnails, and 75 FFprobe-validated H.264/AAC clips. A repeat generator run preserves checksums of the original 24 assets. | Pass |
| P2-05 | Anonymous scene activity feeds a deterministic formula containing recency-decayed views, completed dubs, shares, completion rate, and 12-hour velocity. A protected scheduled job writes a cached seven-day snapshot; the public endpoint has edge-cache policy and stable zero-activity ordering. Formula and persisted-snapshot tests pass. | Pass |
| P2-06 | Event calls enqueue synchronously and perform no request on the user action path. Batches flush later, use stable IDs, retry bounded failed delivery, use `sendBeacon` at page exit, honor Global Privacy Control, and exclude raw media and identity fields. Client behavior and scheduled storage are tested and documented. | Pass |
| P2-07 | Public APIs are stateless when `STORAGE_DRIVER=s3`; temporary media and analytics use shared object storage. Production rate limits delegate to an authenticated atomic service and deny closed on timeout or failure. Local memory limits require an explicit local-only driver. Public create, upload, finalize, status, media, analytics, trending, and fallback endpoints are covered. | Pass |
| P2-08 | A local render failure preserves the recording and offers an explicit server fallback with a temporary-upload disclosure. Production source and voice uploads are scoped directly to object storage. FFprobe and FFmpeg validate inputs, clip range, H.264 video, AAC audio, duration, and synchronization. Successful and abandoned jobs are physically deleted. Unit/integration and forced HTTP browser paths pass. | Pass |
| P2-09 | High-concurrency k6 workload, strict CDN cache accounting, origin-miss counter, thresholds, a real Chromium first-decoded-frame probe, runbook, and bounded local smoke report exist. A deployed run toward 100,000 users is still required. | Awaiting deployment |
| P2-10 | The runbook requires browser first-frame baselines before, during, and after the HTTP spike plus CDN hit ratio and origin fan-out review. No exit decision is recorded without that deployed evidence. | Awaiting deployment |

## Verification results

| Check | Result |
|---|---|
| Exact pushed-commit archive | All 19 test files and 46 tests passed. The canonical 75-scene production build generated 174 routes. |
| `npm run verify` in the shared workspace | ESLint, strict TypeScript, all 46 tests, and production build passed. The workspace generated 176 routes because the owner's preserved uncommitted draft adds one Scene and one Dub page. |
| `npm run test:e2e` | Chrome permission, countdown, recording, preview, local FFmpeg render, download, isolation, mobile layout, accessibility, denial recovery, and zero external recording requests passed. |
| `npm run test:e2e:webkit` | WebKit mobile discovery, catalog and local-video studio, recording, preview, H.264/AAC output, download fallback, accessibility, and zero external recording requests passed. |
| `npm run test:e2e:create` | Invalid file rejection, trim setup, local render, native sharing, approved and rejected hosted links, byte ranges, authenticated cleanup, forced server fallback, output probe, and temporary-data deletion passed. |
| `npm run test:e2e:admin` | Authentication, rate-safe login, validated upload, exact trim, aligned transcription review, rights-gated publication, one manifest-version increment, H.264 output, and pending-rights rejection passed. |
| `npm run test:load:smoke` | 2,000 local production-origin requests at concurrency 50 produced 0% errors, p50 21.67 ms, p95 44.45 ms, p99 83.02 ms, 1,984.54 requests/second, and the required immutable media cache policy. This is not CDN proof. |

## Privacy, safety, and lifecycle boundaries

- Quick mode keeps the personal source and recording in browser memory.
- Native file sharing sends the local file directly to the operating system share sheet.
- Temporary links and fallback uploads require separate explicit actions.
- Hosted links are moderated before becoming public and expire automatically.
- Render fallback files are returned privately and deleted after processing; abandoned jobs expire after one hour and are removed by scheduled cleanup.
- Personal uploads never enter the public catalog. Only authenticated, rights-gated admin ingestion can publish catalog scenes.
- Anonymous analytics does not store raw video, raw audio, transcripts, names, emails, accounts, or advertising identifiers.

## Production prerequisites

The implementation is ready, but production must provide all of the following before the affected features are considered operational:

- HTTPS and `ENABLE_HSTS=true` on the HTTPS deployment only.
- `STORAGE_DRIVER=s3` plus S3 or R2 credentials, bucket CORS, lifecycle controls, and CDN delivery.
- Production WhisperX and its configured model. Fixture transcription remains test-only.
- `SHARE_CLEANUP_SECRET` and a scheduler for `/api/internal/share-links/cleanup`.
- `ANALYTICS_AGGREGATION_SECRET` and a scheduler for `/api/internal/analytics/aggregate`.
- `RATE_LIMIT_SERVICE_URL` and `RATE_LIMIT_SERVICE_TOKEN` for a shared atomic rate limiter. Production must not use the memory driver.
- Hosting-provider approval, budget limits, dashboards, and rollback ownership before high-concurrency testing.

## Deployment exit procedure

1. Warm and verify the CDN using normal deployment traffic.
2. Run `load/phase2-browser.k6.js` for the first-frame baseline.
3. Run `load/phase2.k6.js` in approved stages toward 100,000 virtual users with `REQUIRE_CDN=true`.
4. Run the browser probe again during the peak hold and after ramp-down, using distinct summary paths.
5. Record HTTP p50, p95, p99, errors, cache-hit ratio, origin responses by stage, first-frame p50, p95, p99, and first-frame success.
6. Complete P2-09 and P2-10 only if CDN hits remain above roughly 95%, origin fan-out stays controlled, and first-frame p95 remains sufficiently flat and below the recorded 1,200 ms threshold.

## Explicit deferrals preserved

Accounts, on-platform public gallery, dialogue and background stem separation, and public catalog submission remain assigned to later phases. Phase 3 is responsible for keeping music and effects while replacing dialogue; Phase 2 intentionally retains flat source-audio replacement.
