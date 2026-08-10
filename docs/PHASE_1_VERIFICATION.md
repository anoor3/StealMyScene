# Phase 1 Verification Record

Date: 2026-08-10

## Outcome

Phase 1 implementation is complete for the public guest loop, the rights-safe catalog, the local rendering path, the internal ingestion path, foundational security, analytics, accessibility, and representative browser compatibility. P1-17 is not declared complete: its 20–25% second-scene hypothesis needs representative real-user traffic.

## Acceptance matrix

| Area | Evidence | Result |
|---|---|---|
| Static public product | Homepage, Explore, Trending, How it works, 24 Scene pages, and 24 Dub pages generated in a 66-route production build. | Pass |
| Rights-safe catalog | 24 original generated clips, thumbnails, transcripts, immutable v1 names, manifest v2, rights declaration, and schema/publication gates. | Pass |
| Recording loop | Permission, countdown, timed recording, waveform, transcript cues, hard stop, preview, retake/retry, processing, completion, and failure states. | Pass |
| Local rendering/privacy | Self-hosted FFmpeg WASM; downloaded H.264/AAC MP4 verified with FFprobe; no external recording requests and no Dub persistence. | Pass |
| Browser/responsive | Google Chrome desktop/mobile viewport and Playwright WebKit mobile viewport complete the core flow. | Pass |
| Accessibility | Axe WCAG 2 A/AA scans pass for ready, finished, denied, and mobile discovery states; interactive contrast was corrected. | Pass |
| Admin ingestion | Bad login rejection, validated upload, exact trim, aligned transcript review, rights rejection, publication, manifest v2, and H.264 output. | Pass |
| Security | Signed HTTP-only admin session, same-origin enforcement, login rate limiting, short-lived scoped upload signing, validation/quarantine worker, CSP, isolation headers, and production-only HSTS. | Pass |
| Analytics | Anonymous batched funnel events include `scene_open`, `record_start`, `record_finish`, `preview_start`, `retake`, `render_finish`, `download`, and `second_scene_dub`; Global Privacy Control disables collection. | Pass |

## Commands and results

| Command | Verified result |
|---|---|
| `npm run verify` | ESLint pass; strict TypeScript pass; 8 test files and 20 tests pass; Next.js production build creates 66 routes. |
| `npm run test:e2e` | Chrome core loop, cross-origin isolation, local-only networking, 390 px layout, WCAG A/AA, denial and retry pass. |
| `npm run test:e2e:webkit` | WebKit mobile discovery, capture, preview, FFmpeg render, validated MP4, WCAG A/AA, and local-only networking pass. |
| `npm run test:e2e:admin` | Authenticated ingestion and publication pass; pending rights are rejected. |

## Deployment prerequisites

These are production environment responsibilities, not silently omitted features:

- Serve the deployment through real HTTPS and set `ENABLE_HSTS=true` there only.
- Provide strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` values.
- Configure S3/R2 credentials, bucket CORS/CDN delivery, and deploy the object-created validator in `infra/storage-trigger`.
- Install/configure the WhisperX executable and selected model for production transcription. Automated acceptance uses the deterministic test transcription driver; the production adapter never silently falls back to it.
- Configure `REBUILD_HOOK_URL` so a successful publish activates the immutable asset set and versioned manifest.
- Attach and review genuine rights evidence for every future non-original upload; pending or rejected rights cannot publish.

## Exit-signal gate

After representative traffic exists, calculate:

`unique anonymous sessions with second_scene_dub / unique anonymous sessions with record_start`

Record the measurement window, numerator, denominator, percentage, data-quality caveats, and the decision against the 20–25% hypothesis in `PROJECT_PROGRESS.md`. Phase 2 must not be described as evidence-gated until that review is complete.
