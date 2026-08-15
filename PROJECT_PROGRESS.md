# StealMyScene — Project Progress & Traceability

This is the live delivery ledger for [`StealMyScene_Complete_Plan.md`](./StealMyScene_Complete_Plan.md). It tracks the entire plan, not only product screens. That includes architecture, ingestion, audio behavior, browser fallbacks, security, rights, analytics, load testing, data migration, moderation, and every phase exit signal.

> **Nothing-skipped commitment:** No planned phase, requirement, safeguard, fallback, exit signal, or explicit deferral may be silently dropped. Every plan section is mapped below. An item can be marked `Complete` only when its acceptance evidence exists. If scope changes, the plan, this ledger, and the reason for the decision must be updated together.

## Status legend

| Status | Meaning |
|---|---|
| `Not started` | No implementation has begun. |
| `In progress` | Active work exists, but acceptance criteria are not fully met. |
| `Awaiting data` | The implementation and instrumentation are complete, but an evidence gate requires real usage data. |
| `Awaiting deployment` | Implementation and test tooling are complete, but the acceptance evidence requires a real deployed environment. |
| `Blocked` | Work cannot safely continue; the blocker and owner must be recorded. |
| `Deferred` | Intentionally assigned to a later named phase by the canonical plan. |
| `Complete` | Implemented, reviewed, tested, documented, committed, and pushed with evidence. |

## Overall roadmap

| Stage | Outcome | Entry requirement | Exit gate | Status |
|---|---|---|---|---|
| Phase 0 — Planning controls | Canonical scope, traceability, and execution rules are established. | Repository initialized. | All 16 plan sections mapped; progress and rules documents committed and pushed. | Complete |
| Phase 1 — Prove the Loop | A guest can browse, record, preview, render, and download a rights-safe scene. | Phase 0 complete. | Measure second-scene dubbing; test toward the plan's 20–25% hypothesis before expanding scope. | Awaiting data |
| Phase 2 — Shareable & Load-Proven | Users can dub local videos, outputs can be shared, and the static/CDN architecture is demonstrated under load. | Phase 1 loop works and is instrumented; P1-17 remains awaiting representative traffic by explicit recorded decision. | p95 time-to-first-frame stays flat toward 100k simulated concurrency and CDN cache hit ratio remains roughly 95%+. | Awaiting deployment |
| Phase 3 — Real Audio | User dialogue replaces dialogue while music and effects remain. | Stable ingestion and render paths. | Compare download/share performance against the Phase 1/2 flat-replacement baseline. | Not started |
| Phase 4 — Identity & Retention | Optional accounts add saving, gallery, likes, and retention without blocking guests. | Core guest loop remains healthy. | Measure guest-to-account conversion and two-week retention improvement. | Not started |
| Phase 5 — Scale, Partnerships & Monetization | The validated product expands into licensing, creator tools, native apps, embeds, and premium offerings. | Product loop and demand validated. | Continuous roadmap driven by demonstrated traffic and commercial evidence. | Not started |

## Phase 0 — Planning and repository controls

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P0-01 | Preserve the complete canonical plan. | Plan remains the scope authority and includes the completeness contract. | Complete |
| P0-02 | Create a phase-by-phase progress ledger. | This document maps phases and all plan sections. | Complete |
| P0-03 | Create durable engineering execution rules. | `ENGINEERING_EXECUTION_RULES.md` covers workflow, tests, commits, pushes, security, and mistake prevention. | Complete |
| P0-04 | Establish baseline repository state. | Initial repository contains the plan and documentation; implementation is explicitly not yet started. | Complete |
| P0-05 | Commit and push the planning baseline. | Commit hash and remote branch recorded in the delivery log. | Complete |

## Phase 1 — Prove the Loop

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P1-01 | Build the Next.js/React public shell and guest-only navigation. | Next.js 16/React 19 shell; 66-route production build; Chrome and WebKit navigation checks. | Complete |
| P1-02 | Build Homepage, Explore, search/filtering, Scene detail, and related scenes. | Public discovery E2E and catalog unit tests cover the implemented routes and discovery behavior. | Complete |
| P1-03 | Publish 20–30 hand-picked rights-safe scenes. | The initial 24-scene pack was superseded by 75 real clips from verified public-domain films; every published record remains schema-gated as `cleared`. | Complete |
| P1-04 | Define and serve the versioned `scenes.json` catalog and immutable media/transcript assets through object storage/CDN. | Manifest v3, immutable v3 asset names, schema tests, static generation, CDN sync adapter, cache headers, and a source/checksum ledger. | Complete |
| P1-05 | Implement microphone permission and capture using `getUserMedia` and `MediaRecorder`. | Chrome/WebKit allow flows, denied/retry E2E, unsupported/error mapping, and teardown logic pass. | Complete |
| P1-06 | Implement countdown, clip-synchronized recording, hard stop at clip duration, timer, and live waveform. | Browser E2E verifies countdown and timed stop; state/media unit tests and analyser waveform are present. | Complete |
| P1-07 | Implement timestamp-driven transcript/karaoke highlighting while source dialogue is muted. | Word-boundary unit tests and browser recording flow verify timing-driven highlighting with muted source. | Complete |
| P1-08 | Implement unlimited retakes and every defined UI state: Ready, Countdown, Recording, Processing, Finished, and Permission denied. | Reducer tests plus allow, deny/retry, processing, completion, retake, and error UI coverage. | Complete |
| P1-09 | Implement near-instant local preview of muted video plus the recorded voice. | Chrome and WebKit E2E both preview the local take before rendering. | Complete |
| P1-10 | Implement client-side `ffmpeg.wasm` rendering with video stream copy and new AAC audio. | Self-hosted single/multithread cores; both browser E2Es render and FFprobe-validates H.264/AAC MP4 output. | Complete |
| P1-11 | Configure cross-origin isolation required for multithreaded WASM and handle unsupported/memory-constrained devices clearly. | Chrome asserts isolation; renderer selects multithread/single-thread capability and exposes actionable failures. | Complete |
| P1-12 | Implement local Blob download with no user-media upload or Dub database row. | Browser network inspection finds zero external recording requests; valid output downloads locally. | Complete |
| P1-13 | Build authenticated internal ingestion: presigned direct/multipart upload, trim UI, precise server cut, Whisper + WhisperX timing, transcript/waveform correction, thumbnail, metadata, rights gate, and publish/rebuild. | Isolated admin E2E covers auth, upload, FFmpeg trim, alignment review, rights rejection, publish, manifest v2, and H.264 output. | Complete |
| P1-14 | Apply foundational security: HTTPS/HSTS, CSP, admin auth, scoped short-lived upload URLs, rate limits, and server-side storage-trigger validation/quarantine. | HTTPS-only HSTS switch, CSP/isolation headers, signed sessions, same-origin/rate checks, scoped presigning, magic-byte/FFprobe quarantine worker, and negative tests. | Complete |
| P1-15 | Add basic pageview and core-loop funnel measurement without adding blocking writes. | Anonymous batched events cover page/open/record/preview/retake/render/download/second dub; Global Privacy Control is honored. | Complete |
| P1-16 | Validate accessibility, responsive behavior, resource cleanup, and representative browser/device compatibility. | Chrome and WebKit mobile E2E, WCAG 2 A/AA Axe scans, corrected contrast, media teardown, and valid downloads pass. | Complete |
| P1-17 | Evaluate the Phase 1 exit signal. | Instrumentation is live; report `second_scene_dub` sessions divided by sessions with `record_start` against the 20–25% hypothesis after representative traffic. | Awaiting data |

**Explicit Phase 1 deferrals:** accounts, user profiles, public gallery, comments, likes, durable Dub/User records, source separation, deep analytics, and user-hosted share links. These remain tracked in their assigned later phases; they are not forgotten work.

## Phase 2 — Shareable & Load-Proven

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P2-00 | Add a public local-only `Dub Your Own Video` flow while keeping authenticated admin ingestion as the only catalog publication path. | Chrome and WebKit cover file validation, local preview/trim setup, recording, render, valid MP4 download, local-only networking, mobile layout, accessibility, and cleanup; admin publication remains separate. | Complete |
| P2-01 | Add Web Share API file sharing with capability detection and first-class download fallback. | Unit tests cover supported, unsupported, cancelled, and failed shares; Chrome E2E exercises the native file share contract and both browser suites retain MP4 download. | Complete |
| P2-02 | Add explicit optional `Get a link` flow for desktop/unsupported sharing. | Explicit UI covers upload, safety-processing, ready, rejection, and error states; approved links stream with range support from local storage or direct S3/R2 and expose a copyable public route. | Complete |
| P2-03 | Moderate hosted link audio before publication and auto-expire links after the configured TTL (72 hours by default). | Production WhisperX moderation, deterministic fixture E2E, rejected-media inaccessibility, hashed upload authorization, 72-hour metadata, lazy expiry, authenticated cleanup, and physical deletion tests pass. | Complete |
| P2-04 | Grow the catalog to roughly 75–150 rights-safe scenes. | 75 unique real film and animation clips cut from four public-domain masters; exact-size and SHA-256 source verification, per-scene Commons evidence, 75 H.264/AAC probes, visual thumbnail audit, catalog tests, and a 174-page build pass. | Complete |
| P2-05 | Implement trending from recent dubs, shares, views, completion rate, and velocity with recency weighting. | Deterministic score tests cover every factor, seven-day recency, velocity, and stable ties; scheduled aggregation persists a verified cached snapshot. | Complete |
| P2-06 | Add anonymous batched fire-and-forget analytics that never blocks the user loop. | Client test proves no request occurs on the event call path; capped retry, stable batch IDs, page-exit behavior, loss limits, privacy, and storage are documented and tested. | Complete |
| P2-07 | Add stateless, horizontally scalable public APIs only where required, with rate limiting. | Shared object storage removes instance affinity; authenticated atomic limiter contract denies closed; endpoint coverage, failure tests, architecture review, and 2,000-request origin smoke pass. | Complete |
| P2-08 | Implement the serverless FFmpeg fallback for failed, timed-out, or unsupported client renders. | Unit/integration and forced HTTP browser tests yield synchronized H.264/AAC output, explicit upload consent, normal cleanup, and abandoned-job expiry cleanup. | Complete |
| P2-09 | Run k6/Artillery spike and concurrency tests against pages and assets toward 100k virtual users. | k6 spike workload, strict cache/origin metrics, separate real-browser first-frame probe, thresholds, instructions, and local report exist; deployed CDN run toward 100k is still required. | Awaiting deployment |
| P2-10 | Evaluate the Phase 2 exit signal. | Requires deployed HTTP and browser reports to show sufficiently flat first-frame p95 and roughly 95%+ CDN hits with controlled origin fan-out. | Awaiting deployment |

**Explicit Phase 2 deferrals:** accounts, on-platform public gallery, dialogue/background stem separation, and public catalog submission. Public local uploads create private outputs only.

## Phase 3 — Real Audio

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P3-01 | Integrate a hosted dialogue-isolation service into ingestion for all new scenes. | Ingestion produces validated `dialogue` and `music_fx` stems and handles provider failures safely. | Not started |
| P3-02 | Store and deliver versioned stem assets through the CDN. | Schema, access, cache, and media validation tests pass. | Not started |
| P3-03 | Mix the user's voice with `music_fx` using safe gain staging, then mux the result using the established renderer. | Output has intelligible voice, preserved ambience, no clipping, and acceptable sync. | Not started |
| P3-04 | Backfill the existing catalog opportunistically without blocking new ingestion or public use. | Resumable batch report accounts for every eligible scene and every failure. | Not started |
| P3-05 | Preserve the existing recording UX while upgrading only ingestion/render behavior. | Regression suite proves the Phase 1 loop remains intact. | Not started |
| P3-06 | Evaluate the Phase 3 exit signal. | Download/share results are compared with the flat-replace baseline and the decision is recorded. | Not started |

**Explicit Phase 3 deferrals:** multi-speaker character assignment and voice effects such as pitch shifting.

## Phase 4 — Identity & Retention (Optional)

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P4-01 | Add optional user authentication without changing the fully functional guest default. | Guest regression suite passes; no signup wall appears before a successful render. | Not started |
| P4-02 | Show `Save this dub` only after successful rendering. | UX/state tests cover guest dismissal, signup/login, save, retry, and failure. | Not started |
| P4-03 | Add thin persistent User and Dub models plus durable user-dub storage. | Migrations, authorization, lifecycle, privacy, backup, and deletion tests pass. | Not started |
| P4-04 | Build My Dubs, Favorites, public gallery, and likes. | Permission, pagination, empty/error state, and responsive tests pass. | Not started |
| P4-05 | Add review queue, report flow, per-account rate limiting, and full hosted-content moderation. | Abuse and moderator workflows pass; audit trail and response procedures exist. | Not started |
| P4-06 | Add multi-language transcripts and cross-language dubbing. | Locale, timing, font/layout, and representative-language QA pass. | Not started |
| P4-07 | Add account-level retention analytics with appropriate privacy controls. | Guest conversion and two-week cohort retention can be reported correctly. | Not started |
| P4-08 | Evaluate the Phase 4 exit signal. | Guest-to-account conversion and account-holder retention lift are reported and reviewed. | Not started |

**Explicit Phase 4 deferrals:** followers, direct messages, creator monetization, and native apps.

## Phase 5 — Scale, Partnerships & Monetization

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P5-01 | Establish studio/rights-holder licensing and official or sponsored clip packs. | Signed rights records map to every published licensed asset. | Not started |
| P5-02 | Build creator submission tools from a controlled version of the admin pipeline. | Ownership attestations, review, moderation, rate limits, and publishing gates pass. | Not started |
| P5-03 | Build native iOS and Android apps using appropriate native codecs while preserving the core loop. | Platform test/release gates and output compatibility checks pass. | Not started |
| P5-04 | Build a secure API/white-label embeddable dubbing widget. | Versioned contract, isolation, authentication/rate limits, accessibility, and integration tests pass. | Not started |
| P5-05 | Scale workers and regions only where observed traffic proves the need. | Capacity evidence and an approved architecture record precede infrastructure expansion. | Not started |
| P5-06 | Add premium no-watermark, higher-resolution, and extra voice-effect offerings. | Entitlement, billing, restore/refund, abuse, and output-quality tests pass. | Not started |
| P5-07 | Evaluate self-hosted source separation and WebCodecs based on measured economics/support. | Benchmarks and a written build-vs-buy/browser-support decision exist. | Not started |
| P5-08 | Operate a continuous evidence-driven roadmap. | Product, reliability, rights, safety, and commercial metrics feed recurring prioritization. | Not started |

## Cross-cutting plan-section coverage

| Plan section | Where it is tracked | Coverage status |
|---|---|---|
| 1. Product Philosophy | P1-01, P1-02, P1-16 and every UX acceptance review | Mapped |
| 2. Core Loop | P1-02 through P1-12, P1-15, P1-17 | Mapped |
| 3. Browser-First Architecture | P1-04 through P1-12, P2-06 through P2-09 | Mapped |
| 4. Build Phases | Overall roadmap and all P1–P5 tables | Mapped |
| 5. Voice Mechanism | P1-05 through P1-12, P2-01, P2-08, P3-01 through P3-05 | Mapped |
| 6. Content Ingestion | P1-13, P1-14, P3-01, P3-04, P5-02 | Mapped |
| 7. 100k Concurrency | P1-04, P2-05 through P2-10, P5-05 | Mapped |
| 8. Security & Abuse Resistance | P1-14, P2-02, P2-03, P2-07, P4-03, P4-05, P5-02, P5-04 | Mapped |
| 9. Data Model | P1-04, P2-02, P3-02, P4-03 | Mapped |
| 10. Frontend Components | P1-01, P1-02, P1-05 through P1-13, P4-01 through P4-04 | Mapped |
| 11. Site Map & Navigation | P1-01, P1-02, P4-01, P4-04 | Mapped |
| 12. Recording/UI States | P1-05 through P1-12 | Mapped |
| 13. Legal & Content Rights | P1-03, P1-13, P2-04, P4-05, P5-01, P5-02 | Mapped |
| 14. Tech Stack by Phase | All implementation rows; deviations require a recorded decision | Mapped |
| 15. Metric That Matters | P1-15, P1-17, P2-06, P3-06, P4-07, P4-08 | Mapped |
| 16. Risks & Trade-offs | Device: P1-11/P2-08; moderation: P2-03/P4-05; rights: P1-03/P5-01; catalog: P1-04/P2-04; transcription: P1-13; separation: P3; sharing: P2-01 | Mapped |

## Required evidence for every completed implementation item

An implementation row is not `Complete` until all applicable evidence is present:

1. Acceptance criteria are satisfied with no planned subpart silently omitted.
2. Automated tests pass at the appropriate unit, integration, end-to-end, build, lint, and type-check levels.
3. Relevant negative paths, cleanup, security, accessibility, performance, and browser/device behavior are checked.
4. Documentation and this ledger are updated in the same change.
5. The diff contains no secrets, generated junk, debug code, or unrelated user work.
6. The work is split into meaningful, independently understandable commits.
7. Commits are pushed successfully and the remote branch is verified.

## Decisions, blockers, defects, and repeated-mistake prevention

| Date | Type | Related IDs | Record | Resolution / prevention | Status |
|---|---|---|---|---|---|
| 2026-08-10 | Decision | All | The canonical plan remains authoritative; implementation begins with Phase 1 only after Phase 0 is complete. | Use this ledger and the execution rules as required gates. | Active |
| 2026-08-10 | Defect | P1-14, P1-16 | Unconditional HSTS/CSP upgrading broke local HTTP assets in WebKit. | Enable transport upgrading only when `ENABLE_HSTS=true` on a real HTTPS deployment; WebKit E2E protects local compatibility. | Resolved |
| 2026-08-10 | Defect | P1-05, P1-16 | One broad recording catch misclassified post-permission browser failures as microphone denial. | Isolate `getUserMedia` permission handling from recorder/playback setup failures and preserve specific recovery messages. | Resolved |
| 2026-08-10 | Gate | P1-17 | Synthetic tests cannot establish whether 20–25% of real people dub a second scene. | Keep Phase 2 gated; collect representative anonymous sessions and record the denominator, numerator, rate, window, and decision here. | Awaiting data |
| 2026-08-11 | Decision | P1-17, P2-00–P2-10 | The product owner explicitly prioritized Phase 2 implementation before deployment and requested a public local drag/drop dubbing flow. | Begin Phase 2 implementation without misrepresenting P1-17 or deployment/load evidence; keep public local uploads private and preserve admin-only publication. | Active |
| 2026-08-11 | Gate | P2-09–P2-10 | A localhost origin test cannot produce CDN cache-hit ratio, edge fan-out behavior, or credible 100,000-user capacity evidence. | Keep both rows awaiting deployment. Run the versioned k6 workload against the configured CDN with provider approval, preserve the report, then make the exit decision. | Awaiting deployment |
| 2026-08-11 | Defect | P1-16, P2-06 | WebKit reports cancelled same-origin Next.js RSC prefetches as access-control errors during full-page test navigation; the existing narrow exception covered console events but not identical page errors. | Centralize the exact same-origin `?_rsc` cancellation predicate for both event channels; continue failing every other browser error. | Resolved |
| 2026-08-11 | Defect | P1-13, P2-04 | Admin E2E hard-coded the initial catalog's old version and failed when run against a newer isolated manifest, even though publication incremented correctly. | Capture the fixture's starting version and require exactly one increment; keep the test independent of catalog growth and user drafts. | Resolved |
| 2026-08-14 | Decision | P1-03, P1-04, P2-04 | The generated gradient catalog did not provide the real visual footage needed for a compelling dubbing experience. | Replace all 75 gradients with short silent derivatives of verified public-domain films, retain the full catalog count, record exact source evidence and checksums, and keep the existing publication rights gate intact. | Complete |

## Delivery log

| Date | Phase / IDs | Summary | Verification | Commit / remote |
|---|---|---|---|---|
| 2026-08-10 | P0-01–P0-05 | Added scope completeness, full traceability, and engineering execution controls. | All 16 plan sections mapped; Markdown structure/link review and clean staged-diff check. | `5084e38` pushed to `origin/main` |
| 2026-08-10 | P1-01–P1-04, P1-15 | Launched public discovery, 24-scene rights-safe catalog, static routes, manifest, and analytics. | Catalog tests and production build. | `d0d987e` pushed to `origin/main` |
| 2026-08-10 | P1-05–P1-12 | Completed local capture, synchronized studio states, preview, FFmpeg render, and download. | Chrome end-to-end output validated as H.264/AAC with no external recording requests. | `7371636` pushed to `origin/main` |
| 2026-08-10 | P1-13–P1-14 | Completed authenticated, validated, rights-gated ingestion and publication. | Admin E2E rejects bad auth/pending rights and publishes a precisely processed manifest-v2 scene. | `78987f2` pushed to `origin/main` |
| 2026-08-10 | P1-05, P1-10–P1-12, P1-14, P1-16 | Added Chrome/WebKit compatibility, accessibility gates, denial recovery, and safe HTTPS policy activation. | Chrome and WebKit E2E, WCAG A/AA, valid MP4, lint, type-check, 20 tests, and 66-route build. | `4eef9e9` pushed to `origin/main` |
| 2026-08-11 | P1-01–P1-02, P1-16 | Reworked the homepage into the approved theatrical stage direction using the supplied background and rights-safe catalog artwork. | Desktop 1440×900 and mobile 390×844 browser reviews, zero console errors, WCAG A/AA scans, lint, type-check, 22 tests, and production build. | `fa3e431` pushed to `origin/main` |
| 2026-08-11 | P1-01, P1-16 | Replaced every temporary public-facing wordmark with the supplied StealMyScene logo through one responsive reusable component. | Desktop 1440×900 and mobile 390×844 visual reviews, zero browser errors, zero WCAG A/AA violations, lint, type-check, 22 tests, and production build. | `a52a6d6` pushed to `origin/main` |
| 2026-08-11 | P2-00–P2-01 | Added private drag/drop local-video dubbing, trim and line setup, reused recording/rendering, native file sharing, and universal download fallback without exposing admin publication. | Chrome and WebKit E2E, invalid-file rejection, zero external media requests, WCAG A/AA, FFprobe H.264/AAC output, 27 tests, lint, type-check, and 69-route build. | `d728152`, `722c0d2`, and `9625ee6` pushed to `origin/main` |
| 2026-08-11 | P2-02–P2-03 | Added explicit temporary links with direct object-storage uploads, moderation-before-publication, ranged playback, rejected-media deletion, 72-hour expiry, and authenticated cleanup. | Approved and rejected browser/API E2E paths, storage expiry deletion integration test, security/schema/moderation unit tests, 37-test full gate, and 71-route build. | `d53f05b` and `df4d5a0` pushed to `origin/main` |
| 2026-08-11 | P2-04 | Expanded the immutable original catalog from 24 to 75 rights-cleared scenes without modifying existing media. | Asset checksums unchanged; 75 unique IDs/slugs, 75 H.264/AAC clips, 75 thumbnails, catalog tests, and 171-page build pass. | `21b134a` pushed to `origin/main` |
| 2026-08-14 | P1-03, P1-04, P2-04 | Replaced all 75 generated gradients with real public-domain film and animation footage, added reproducible source verification, and rewired every catalog-dependent test and load path. | Visual contact-sheet review; exact source sizes and SHA-256; 75 codec/duration probes; lint; type-check; 46 tests; Chrome, WebKit, local-create, and admin E2E; 174-page production build. | `a3cc84e` and `cf378d1` committed on `agent/real-footage-catalog`; remote publication recorded after push. |
| 2026-08-11 | P2-05–P2-07 | Added durable anonymous batch ingestion, bounded retry, scheduled cached trending, live cached shelf, shared storage, and fail-closed distributed rate-limit integration. | Formula, cache aggregation, no-critical-path request, retry, limiter delegation/failure, lint, type-check, unit/integration tests, and production build pass. | `3334be6` and `22eabcc` pushed to `origin/main` |
| 2026-08-11 | P2-08 | Added an explicit secure server render fallback with scoped direct uploads, server validation, synchronized H.264/AAC output, and physical cleanup. | Forced browser/API fallback, FFprobe output checks, successful-job cleanup, abandoned-job expiry, 46-test full gate, and exact pushed-archive 174-route build pass. | `45d65e0` pushed to `origin/main` |
| 2026-08-11 | P2-09–P2-10 | Added the versioned k6 CDN spike workload and completed a bounded local production-origin smoke run. | 2,000 requests at concurrency 50: 0% errors, p50 21.67 ms, p95 44.45 ms, p99 83.02 ms, 1,984.54 requests/s, immutable media headers. CDN/100k evidence remains gated. | `161c142` pushed to `origin/main`; deployed run awaiting deployment |
