# StealMyScene — Project Progress & Traceability

This is the live delivery ledger for [`StealMyScene_Complete_Plan.md`](./StealMyScene_Complete_Plan.md). It tracks the entire plan, not only product screens. That includes architecture, ingestion, audio behavior, browser fallbacks, security, rights, analytics, load testing, data migration, moderation, and every phase exit signal.

> **Nothing-skipped commitment:** No planned phase, requirement, safeguard, fallback, exit signal, or explicit deferral may be silently dropped. Every plan section is mapped below. An item can be marked `Complete` only when its acceptance evidence exists. If scope changes, the plan, this ledger, and the reason for the decision must be updated together.

## Status legend

| Status | Meaning |
|---|---|
| `Not started` | No implementation has begun. |
| `In progress` | Active work exists, but acceptance criteria are not fully met. |
| `Blocked` | Work cannot safely continue; the blocker and owner must be recorded. |
| `Deferred` | Intentionally assigned to a later named phase by the canonical plan. |
| `Complete` | Implemented, reviewed, tested, documented, committed, and pushed with evidence. |

## Overall roadmap

| Stage | Outcome | Entry requirement | Exit gate | Status |
|---|---|---|---|---|
| Phase 0 — Planning controls | Canonical scope, traceability, and execution rules are established. | Repository initialized. | All 16 plan sections mapped; progress and rules documents committed and pushed. | In progress |
| Phase 1 — Prove the Loop | A guest can browse, record, preview, render, and download a rights-safe scene. | Phase 0 complete. | Measure second-scene dubbing; test toward the plan's 20–25% hypothesis before expanding scope. | Not started |
| Phase 2 — Shareable & Load-Proven | Outputs can be shared and the static/CDN architecture is demonstrated under load. | Phase 1 loop works and is instrumented. | p95 time-to-first-frame stays flat toward 100k simulated concurrency and CDN cache hit ratio remains roughly 95%+. | Not started |
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
| P0-05 | Commit and push the planning baseline. | Commit hash and remote branch recorded in the delivery log. | In progress |

## Phase 1 — Prove the Loop

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P1-01 | Build the Next.js/React public shell and guest-only navigation. | Production build passes; homepage and navigation work at target breakpoints. | Not started |
| P1-02 | Build Homepage, Explore, search/filtering, Scene detail, and related scenes. | Automated route/component checks plus manual browser verification. | Not started |
| P1-03 | Publish 20–30 hand-picked rights-safe scenes. | Each scene has explicit allowed `rightsStatus`; no uncleared scene can publish. | Not started |
| P1-04 | Define and serve the versioned `scenes.json` catalog and immutable media/transcript assets through object storage/CDN. | Schema validation, cache-header checks, and successful static/ISR page generation. | Not started |
| P1-05 | Implement microphone permission and capture using `getUserMedia` and `MediaRecorder`. | Supported-browser tests cover allow, deny, missing device, interruption, and cleanup. | Not started |
| P1-06 | Implement countdown, clip-synchronized recording, hard stop at clip duration, timer, and live waveform. | Timing tests and browser evidence show recording cannot unintentionally outlast the scene. | Not started |
| P1-07 | Implement timestamp-driven transcript/karaoke highlighting while source dialogue is muted. | Word-boundary tests and manual sync review on representative clips. | Not started |
| P1-08 | Implement unlimited retakes and every defined UI state: Ready, Countdown, Recording, Processing, Finished, and Permission denied. | State-transition tests cover success, cancellation, denial, retry, and failure paths. | Not started |
| P1-09 | Implement near-instant local preview of muted video plus the recorded voice. | Playback starts promptly and stays acceptably synchronized on supported devices. | Not started |
| P1-10 | Implement client-side `ffmpeg.wasm` rendering with video stream copy and new AAC audio. | Output plays in target browsers; duration, A/V sync, and codec/container are verified. | Not started |
| P1-11 | Configure cross-origin isolation required for multithreaded WASM and handle unsupported/memory-constrained devices clearly. | Header checks pass; capability and render-failure states do not strand the user. | Not started |
| P1-12 | Implement local Blob download with no user-media upload or Dub database row. | Network inspection confirms the local-only critical path; downloaded MP4 is valid. | Not started |
| P1-13 | Build authenticated internal ingestion: presigned direct/multipart upload, trim UI, precise server cut, Whisper + WhisperX timing, transcript/waveform correction, thumbnail, metadata, rights gate, and publish/rebuild. | End-to-end admin test publishes a validated scene; invalid media and uncleared rights are rejected. | Not started |
| P1-14 | Apply foundational security: HTTPS/HSTS, CSP, admin auth, scoped short-lived upload URLs, rate limits, and server-side storage-trigger validation/quarantine. | Security checks and negative-path tests pass; secrets are not exposed client-side or committed. | Not started |
| P1-15 | Add basic pageview and core-loop funnel measurement without adding blocking writes. | Events can measure open → record → finish → preview → retry → download and second-scene dub. | Not started |
| P1-16 | Validate accessibility, responsive behavior, resource cleanup, and representative browser/device compatibility. | Agreed browser matrix and accessibility checks pass with documented exceptions. | Not started |
| P1-17 | Evaluate the Phase 1 exit signal. | Second-scene rate is reported against the 20–25% test hypothesis; decision is documented before Phase 2. | Not started |

**Explicit Phase 1 deferrals:** accounts, user profiles, public gallery, comments, likes, durable Dub/User records, source separation, deep analytics, and user-hosted share links. These remain tracked in their assigned later phases; they are not forgotten work.

## Phase 2 — Shareable & Load-Proven

| ID | Deliverable | Acceptance evidence | Status |
|---|---|---|---|
| P2-01 | Add Web Share API file sharing with capability detection and first-class download fallback. | Supported-device tests and unsupported-browser fallback tests pass. | Not started |
| P2-02 | Add explicit optional `Get a link` flow for desktop/unsupported sharing. | Upload, pending, ready, rejection, expiration, and error states pass end to end. | Not started |
| P2-03 | Moderate hosted link audio before publication and auto-expire links after the configured TTL (72 hours by default). | Transcription/filtering tests, abuse cases, and expiry deletion tests pass. | Not started |
| P2-04 | Grow the catalog to roughly 75–150 rights-safe scenes. | Catalog and rights audit passes. | Not started |
| P2-05 | Implement trending from recent dubs, shares, views, completion rate, and velocity with recency weighting. | Deterministic formula tests and scheduled cached-output verification pass. | Not started |
| P2-06 | Add anonymous batched fire-and-forget analytics that never blocks the user loop. | Event loss/retry behavior is documented; performance trace shows no critical-path wait. | Not started |
| P2-07 | Add stateless, horizontally scalable public APIs only where required, with rate limiting. | Architecture review and load/security tests pass. | Not started |
| P2-08 | Implement the serverless FFmpeg fallback for failed, timed-out, or unsupported client renders. | Forced-fallback tests yield valid, synchronized output and clean temporary data. | Not started |
| P2-09 | Run k6/Artillery spike and concurrency tests against pages and assets toward 100k virtual users. | Versioned report includes p50/p95/p99, error rate, cache hit ratio, and origin request behavior. | Not started |
| P2-10 | Evaluate the Phase 2 exit signal. | p95 remains flat enough for the agreed SLO and CDN hit ratio is roughly 95%+; deviations have owned fixes. | Not started |

**Explicit Phase 2 deferrals:** accounts, on-platform public gallery, and dialogue/background stem separation.

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

## Delivery log

| Date | Phase / IDs | Summary | Verification | Commit / remote |
|---|---|---|---|---|
| 2026-08-10 | P0-01–P0-05 | Added scope completeness, full traceability, and engineering execution controls. | Markdown structure/link review and repository diff review. | Pending commit and push |
