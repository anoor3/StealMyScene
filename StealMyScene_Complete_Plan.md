# StealMyScene — Complete Product & Engineering Plan
*From a browser-only prototype to a production platform that can take a crowd. Working name — "for now," same as you said.*

> **One-sentence definition:** StealMyScene is a web platform where people pick a short iconic or funny video scene, follow the timed dialogue on screen, record their own performance, and instantly get a shareable version of the scene with their voice replacing the original — no signup required.

This document supersedes the scattered version — it's organized by **build phase**, and every technical question you asked (voice mechanism, character-vs-background audio, drag-and-drop ingestion, transcription, no-account scaling) has its own fully detailed section. Nothing from your original plan was dropped; it's folded in below, restructured around *when you build it* instead of *what category it is*.

> **Completeness contract:** This is the canonical product and engineering scope. No phase, requirement, safeguard, fallback, exit signal, or deliberately deferred item in this plan may be silently skipped. Every item must be tracked in [`PROJECT_PROGRESS.md`](./PROJECT_PROGRESS.md), and implementation must follow [`ENGINEERING_EXECUTION_RULES.md`](./ENGINEERING_EXECUTION_RULES.md). If reality requires a change, the change and its reason must be recorded in all affected documents before work proceeds; an item is never treated as complete merely because it was omitted from a build.

**Current status (2026-08-10):** planning and traceability setup. Product implementation has not started. Phase 1 is the first implementation phase; later phases remain gated by the exit signals defined below.

---

## Table of Contents

1. [Product Philosophy](#1-product-philosophy)
2. [The Core Loop](#2-the-core-loop)
3. [The Architecture Decision: Browser-First, Server-Light](#3-the-architecture-decision-browser-first-server-light)
4. [Build Phases — Phase 1 to End Product](#4-build-phases)
5. [The Voice Mechanism — Full Technical Detail](#5-the-voice-mechanism)
6. [Content Ingestion — Drag-and-Drop to Published Scene](#6-content-ingestion)
7. [Handling ~100,000 Concurrent Users Without a Heavy Backend](#7-handling-100000-concurrent-users)
8. [Security & Abuse Resistance](#8-security--abuse-resistance)
9. [Data Model](#9-data-model)
10. [Frontend Component Architecture](#10-frontend-component-architecture)
11. [Site Map & Navigation](#11-site-map--navigation)
12. [Recording / UI States](#12-recording--ui-states)
13. [Legal & Content Rights Strategy](#13-legal--content-rights-strategy)
14. [Tech Stack Summary, By Phase](#14-tech-stack-summary-by-phase)
15. [The Metric That Matters](#15-the-metric-that-matters)
16. [Honest Risks & Trade-offs](#16-honest-risks--trade-offs)

---

## 1. Product Philosophy

It shouldn't feel like a movie-themed SaaS company. It should feel like **a toy.**

Fast. Funny. Almost no instructions. Video everywhere. You press things and something immediately happens.

The homepage shouldn't need to explain itself with copy like "FAST DUBBING" or "EASY RECORDING." A visitor should see a funny scene, a recognizable line, and a microphone — and immediately think *"Ohhhh, I can say this myself."* That reaction is the entire UI brief. Every design and engineering decision below is in service of getting a first-time visitor to that reaction in under five seconds, and into a finished dub in under sixty.

---

## 2. The Core Loop

```
Browse  →  Choose a scene  →  Watch & read  →  Record  →  Instant redub
```

That's the whole product. Not complicated video editing — one clear job, done well. The internal test for every feature request from here on: *does this make the loop above faster or funnier, or does it just add a screen between the person and the microphone?* If it's the latter, it belongs in a later phase.

---

## 3. The Architecture Decision: Browser-First, Server-Light

This is the single biggest change from the earlier draft, and it deserves to be stated plainly before anything else, because it shapes every section that follows.

**You asked for three things that sound like they're in tension:**
1. No sign-in, no accounts, minimal database load
2. Everything possible happens in the browser
3. It still has to hold up under real concurrent load — think 100,000 people at once

They're not actually in tension. **Removing accounts and pushing the work into the browser is *why* this can hold that load cheaply** — not a corner cut you're making despite the scale requirement. Here's the reasoning:

- A logged-out, read-mostly app is **stateless and cacheable**. Every scene, thumbnail, transcript, and video file can sit behind a CDN and be served to 100,000 people from edge caches without your origin server or database ever being touched.
- If recording and rendering happen **on the user's own device**, your server never has to encode video, queue a job, or hold a render slot open per user. The heaviest compute in the whole product (muxing a new audio track onto video) runs on hardware you don't pay for or provision: theirs.
- If "download" is a local file save and "share" uses the device's native share sheet, your server never receives, stores, or serves the finished dub at all. **Zero new writes per dub.**

The result: the public-facing, high-concurrency surface of the product is almost entirely **static content plus client-side computation.** The only things that need a real server are low-traffic and admin-only (content ingestion, moderation) or genuinely async and non-blocking (analytics aggregation). That's a fundamentally easier scaling problem than a typical app with accounts and server-rendered user content — you're not fighting the architecture to hit 100k concurrent, you're choosing an architecture where 100k concurrent is the easy case.

### What lives where

| Piece | Runs on | Why |
|---|---|---|
| Browsing, search, trending shelf | Client, reading CDN-cached static/ISR data | No live DB read needed per page view |
| Video playback of source scenes | Client, streaming from CDN | Just file serving |
| Microphone recording | Client (`getUserMedia`) | No reason to ever touch a server |
| Waveform / level meter | Client (`AnalyserNode`) | Real-time, must be local anyway |
| Karaoke-timed transcript | Client, using pre-computed word timings shipped with the scene | Just JSON already sitting in cache |
| Final audio/video render (the "swap") | Client (`ffmpeg.wasm`), server as fallback only | See [Section 5.3](#53-rendering-the-final-file--in-the-browser) |
| Download | Client, local `Blob` → file save | Nothing to upload |
| Share | Client, native Web Share API first | Nothing to upload, in the common case |
| New scene upload, trimming, transcription, publishing | Server (admin-only route) | Low traffic, needs real compute (Whisper, FFmpeg, optionally source separation) |
| Moderation of admin-added scenes | Server (admin-only) | Same — low traffic, high importance |
| Trending score, view/dub counters | Server, but async and batched, never a synchronous write in the user's critical path | Keeps the loop fast; counts can be eventually consistent |

Guest mode isn't the compromise version of this product — for the traffic profile you're describing, it's the *correct* version. Accounts come back in [Phase 4](#phase-4--identity--retention-optional-always-optional) once there's a real reason (saving dubs across sessions, a public gallery, follows) to justify the backend and moderation surface that accounts require.

---

## 4. Build Phases

Five phases, Phase 1 to what "end product" looks like. Each one has a single goal, a concrete exit signal, and an explicit deferred list — the deferred list matters as much as the ships list, because most startups that fail on an idea like this fail by building phase 3 before phase 1 is proven.

### Phase 1 — Prove the Loop

**Goal:** answer one question — *is dubbing these scenes actually fun enough that someone does a second one?* Nothing else matters yet.

**Ships**
- Homepage + Explore page with **20–30 hand-picked, rights-safe clips** (originals, public domain, or creator-submitted with real consent — see [Section 13](#13-legal--content-rights-strategy))
- Scene detail page → Dub Studio
- The full core loop: browse → watch + read transcript → record (auto-stopped at clip length) → instant client-side preview → client-side final render → download
- A simple internal tool to add scenes (upload, trim, auto-transcribe, hand-correct, publish) — doesn't need to be pretty, needs to work
- **No** accounts, public gallery, comments, or likes

**Technical scope**
- Next.js frontend, statically generated / ISR scene pages
- Object storage (S3 or Cloudflare R2) + CDN for every video, thumbnail, and transcript file
- `getUserMedia` + `MediaRecorder` for capture, `ffmpeg.wasm` for the render (full detail in [Section 5](#5-the-voice-mechanism))
- **No live database at all is a legitimate option here.** With 20–30 admin-managed scenes, the entire catalog can be a single `scenes.json` manifest sitting on the CDN next to the media files. A real database earns its place once the catalog outgrows comfortable hand-editing — a reasonable line is somewhere past 100 scenes, or the moment you need real-time counters instead of periodic rebuilds.

**Deliberately deferred:** everything social, accounts, stem separation, real analytics infrastructure (basic pageview counting is enough for now)

**Exit signal:** of everyone who opens a scene and starts a recording, what percentage go on to dub a *second* scene in the same session? Treat 20–25% as a reasonable bar to test toward — if it's far below that, the loop itself needs work before anything else is worth building.

---

### Phase 2 — Shareable & Load-Proven

**Goal:** get the output off the device and prove the infrastructure actually holds under real concurrent traffic, not just in theory.

**Ships**
- Native **Web Share API** integration — the rendered file attaches directly to the OS share sheet (TikTok, Instagram, WhatsApp, Messages) with no upload involved, on the platforms that support it
- An explicit, optional **"Get a link"** action for the cases native share can't cover (mainly desktop). This is the one place Phase 2 intentionally reintroduces a server write — see the moderation note below
- Library grows to roughly 75–150 scenes; the trending formula goes live: `recent dubs + shares + views + completion rate + velocity`, weighted toward recent activity so old clips don't dominate forever
- A real load-testing pass (k6 or Artillery) simulating spiky concurrent traffic against the CDN + static path specifically — this is where the "100,000 at once" requirement gets tested against reality instead of assumed
- A lightweight, anonymous, batched analytics pipeline — client fires fire-and-forget events, never blocking the UI, to measure the funnel from [Section 15](#15-the-metric-that-matters)

**The moderation note:** local-only export is low-stakes — a user privately saving or sharing a file they made is no different from screen-recording anything else. The moment "Get a link" exists, StealMyScene is *hosting and serving* user-generated audio from its own domain, which is a materially different exposure. The mitigation is cheap because the infrastructure already exists by this phase: run the same transcription pipeline used for admin content over the user's recording before the link goes live, hold it in a brief pending state, auto-reject on an obvious keyword/hate-speech match, and auto-expire every link (72 hours is a reasonable default) so nothing lingers indefinitely.

**Deliberately deferred:** accounts, an on-platform public gallery, stem separation

**Exit signal:** p95 time-to-first-frame on scene pages stays flat as simulated concurrent load rises toward 100k, and CDN cache hit ratio holds above roughly 95%. If either degrades, that's a caching or fan-out problem to fix before adding features.

---

### Phase 3 — Real Audio: Character vs. Background Voice

**Goal:** stop erasing the movie's score and sound effects every time someone dubs a line — this is the single biggest perceived-quality jump available.

**Ships**
- Every **new** scene, at ingestion, runs through a dialogue-isolation pass that outputs two stored stems: `dialogue` and `music_fx` (full mechanism in [Section 5.5](#55-character-voice-vs-background-voice-source-separation))
- The existing back-catalog gets backfilled opportunistically as a batch job — it doesn't block anything else
- At dub time, the user's recording replaces only the `dialogue` stem; the client mixes it with the untouched `music_fx` stem before the final mux. **Recording itself doesn't change at all** — this only upgrades the render step

**Deliberately deferred:** multi-speaker scenes (assigning different voices to different characters within one clip), voice effects like pitch shift

**Exit signal:** compare download and share rate for stem-separated scenes against the flat-replace baseline from Phase 1/2 — an A/B if there's enough traffic to make it meaningful, a straightforward before/after otherwise.

---

### Phase 4 — Identity & Retention (optional, always optional)

**Goal:** give returning visitors a reason to come back, without ever making an account required to use the core product.

**Ships**
- Guest flow stays fully intact and remains the default — this phase adds a path, it doesn't remove the old one
- An optional **"Save this dub"** prompt that appears *after* a successful render, not before — someone should never hit a signup wall before they've experienced the product
- My Dubs, Favorites, a public gallery, likes
- This is the point where persistent server-side storage of user-generated dubs — and real moderation — actually becomes necessary, because content is now published *on* the platform instead of only exported by the user. A proper review queue, a report button, and per-account rate limiting all land here
- Multi-language transcripts; dubbing into a language different from the original

**Deliberately deferred:** deep social graph features (followers, DMs), creator monetization, native apps

**Exit signal:** what percentage of guests convert to an account after their first dub, and do account holders return at a meaningfully higher rate than guests over the following two weeks?

---

### Phase 5 — Scale, Partnerships & Monetization

**Goal:** turn a validated loop into a real business.

**Ships**
- Licensing conversations with studios and rights holders, using real traction as leverage — official or sponsored clip packs tied to new releases
- Creator tools so trusted users can submit their own scenes, through a lighter-weight version of the internal admin pipeline
- Native iOS/Android apps — by now the browser-side rendering approach has already proven the concept, and native apps can reuse the same logic with native codecs, typically faster than WASM
- An API / white-label widget for other sites to embed the dubbing flow
- Full studio-grade infrastructure wherever the earlier phases' real traffic actually demands it — autoscaling worker fleets, multi-region — rather than pre-built on a guess
- A premium tier: no watermark, higher-resolution export, extra voice effects

This is "the end product" — not a final state so much as the point where the roadmap becomes continuous rather than phased.

---

## 5. The Voice Mechanism

This is the part you asked for in the most detail, so it gets the most detail. Five things happen, in order: **capture your voice → guide your timing → remove the old audio and put yours in → make it downloadable → (later) keep the music underneath it.**

### 5.1 Recording in the Browser

Tapping **Add Your Voice** does three things in the same instant: the clip seeks back to `0:00`, plays again muted, and the microphone starts capturing. The clip's own runtime becomes the recording's hard stop — there's no separate timer to manage and no way to end up with a recording the wrong length, because the video ending *is* the signal that stops the microphone.

```js
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
const chunks = [];
recorder.ondataavailable = e => chunks.push(e.data);

video.currentTime = 0;
video.muted = true;
video.play();
recorder.start();

video.onended = () => recorder.stop(); // clip length === recording length. always.
```

In parallel, a Web Audio `AnalyserNode` reads the microphone stream ~60 times a second purely to drive the live waveform bars on screen — that data never touches the recorded file, it's UI-only. Nothing here has made a network request yet; the output is a WebM/Opus audio blob sitting in the browser's memory.

### 5.2 Karaoke Timing, Without Playing Any Audio

Here's the actual UX problem this design has to solve: play the original dialogue out loud while recording and it bleeds straight into the microphone through the speakers, ruining the take — you can't assume anyone's wearing headphones on a website. Mute it entirely and people lose their sense of rhythm; they don't know when each word is supposed to land.

The fix doesn't need any audio at all — it reuses the word-level timestamps that already exist from transcription (full detail in [Section 6](#6-content-ingestion)):

```json
{
  "text": "That's what she said.",
  "words": [
    { "word": "That's", "start": 0.20, "end": 0.58 },
    { "word": "what",   "start": 0.62, "end": 0.89 },
    { "word": "she",    "start": 0.95, "end": 1.10 },
    { "word": "said",   "start": 1.23, "end": 1.61 }
  ]
}
```

While the clip replays muted, the client just watches `video.currentTime` and highlights whichever word's `start`/`end` window contains it — a karaoke cue driven entirely by timestamps that shipped with the scene, not by anything happening live.

### 5.3 Rendering the Final File — In the Browser

Two things get built. The **instant preview** is just Web Audio playing the muted video and the new recording together in real time — no file exists yet, it's purely so the person can hear how it sounds a half-second after they stop talking. The **actual downloadable file** is where "remove the old audio and put mine in" literally happens, via `ffmpeg.wasm` — a WebAssembly build of FFmpeg that runs the whole operation on the user's own device:

```js
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
await ffmpeg.load();

await ffmpeg.writeFile('scene.mp4', await fetchFile(sceneVideoUrl));
await ffmpeg.writeFile('voice.webm', await fetchFile(recordedBlob));

await ffmpeg.exec([
  '-i', 'scene.mp4', '-i', 'voice.webm',
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac',
  '-shortest', 'output.mp4'
]);

const data = await ffmpeg.readFile('output.mp4'); // downloadable now — nothing left the browser
```

`-c:v copy` is the important flag: the video stream is copied byte-for-byte, never re-encoded, so only the tiny audio stream actually gets processed. That's what keeps this fast even running in WebAssembly instead of native code.

**Being straight about the limits, since "production ready" is the goal:**
- `ffmpeg.wasm` loads the entire file into memory before processing. That's a real problem for large uploads, but scenes here are a few seconds and a few megabytes — well inside safe territory.
- Multi-threaded `ffmpeg.wasm` needs `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` response headers to use `SharedArrayBuffer`. This is a real deployment requirement, not an implementation detail to skip — a single-threaded build works without those headers but renders more slowly.
- Older or memory-constrained phones can still choke even on a short clip. The production-grade version wraps the client render in a timeout and falls back to a small serverless function running the *identical* FFmpeg command server-side if the in-browser render fails. Because that only fires for the minority of devices that need it, the fallback path stays cheap no matter how much overall traffic the product gets.
- Worth knowing for later, not now: **WebCodecs** paired with a muxing library is a faster, hardware-accelerated way to do this exact narrow job (decode, swap one stream, re-encode) — it just means writing your own muxer and accepting modern-browsers-only support. A reasonable trade to revisit once that requirement is acceptable, not a Phase 1 decision.

### 5.4 Getting It Downloadable, With No Backend Involved

The `ffmpeg.wasm` output above is already a file sitting in browser memory. Two things can happen to it, neither of which touches a server:

- **Download:** `URL.createObjectURL(blob)` plus a hidden `<a download>` triggers a normal local file save.
- **Share:** the Web Share API hands that same file straight to the device's native share sheet — `navigator.share({ files: [file] })` — which is how it reaches TikTok, Instagram, or WhatsApp directly. Support is best on mobile Safari and Chrome, so a manual-download fallback should sit behind a feature check for browsers that don't support file sharing yet.

This is exactly why Phase 1 can run with **zero `Dub` rows in any database.** Nothing about creating, previewing, or exporting a dub ever requires persistence anywhere — only Phase 4's optional "save this dub" deliberately brings storage back.

### 5.5 Character Voice vs. Background Voice (Source Separation)

Here's the problem stated plainly: a scene's original audio is one mixed track — dialogue, score, and sound effects baked together. Phase 1's full-track replacement means all of it vanishes the instant a user's voice goes in. Fine for an MVP; it's also the ceiling on how good the output can ever sound until this is solved.

**Where this runs matters more than how it works:** once per *source scene*, at ingestion — never per user dub. A single scene can be dubbed by a hundred thousand different people and this expensive step still only ever runs once for it. That one fact is what makes even a fairly costly, high-quality separation process completely fine at any user scale — it never sits anywhere near the high-concurrency path.

**How it works, mechanically:** the mixed audio is converted to a spectrogram (a short-time Fourier transform). A trained neural network — architectures like Meta's Demucs, or models purpose-built for dialogue isolation — predicts which time-frequency regions belong to speech versus everything else, effectively producing a mask. Applying that mask and converting back to a waveform yields two clean stems: `dialogue.wav` and `music_fx.wav`.

**Build vs. buy — buy, for now:** because this only runs at low, ingestion-time volume, a hosted API beats standing up your own GPU inference fleet. Services purpose-built for exactly this film/TV dialogue-vs-background job exist today (AudioShake is one current example); general vocal-isolation APIs from providers like ElevenLabs or LALAL.AI also expose developer APIs and would work. Self-hosting an open model like Demucs only starts to make sense once ingestion volume grows into the thousands of new scenes a week, or the per-call cost genuinely stops making sense at your scale — a good problem to have, and a Phase 5 conversation, not a Phase 3 one.

**At dub time**, nothing new happens computationally — the client fetches the pre-computed `music_fx` stem (it's just another file already sitting on the CDN, same as any other scene asset), mixes it with the user's new recording (a simple waveform sum with basic gain staging so neither track overpowers the other), and hands the combined audio to the exact same `ffmpeg.wasm` mux step from 5.3. The only thing that changed from Phase 1 is *which* audio file gets muxed onto the video — recording and rendering are otherwise identical.

---

## 6. Content Ingestion

This is the admin-only side — low traffic, but it's where "drag and drop a video in, and everything happens" actually lives, so it gets the same level of detail as the user-facing mechanism.

```
Drag & drop  →  Trim  →  Extract clip  →  Auto-transcribe  →  Human review
     →  Thumbnail  →  (Phase 3: separate stems)  →  Set rights status  →  Publish
```

**1 · Drag & drop upload.** The browser's native drag-and-drop API (`dragover` / `drop` events reading `DataTransfer.files`) catches the file. For anything beyond a trivial size, the raw bytes shouldn't route through your app server at all — the client requests a short-lived **presigned upload URL** from a small endpoint, then uploads directly to S3/R2 from the browser, multipart for anything over roughly 5–10MB so it can resume and parallelize instead of failing on a flaky connection.

**2 · Trim.** A lightweight in-browser trimmer — a `<video>` element plus a dual-handle range slider bound to `currentTime` — lets the admin scrub a longer source video and mark the funny few seconds as in/out points. The scrubbing itself is free (client-side), but the actual cut is done precisely on the server.

**3 · Extract the clip.** A copy-only cut can only land on keyframes, which is imprecise — a real cut needs a short re-encode at the exact timestamps: `ffmpeg -ss 12.4 -to 17.8 -i source.mp4 -c:v libx264 -c:a aac clip.mp4`. This runs once per scene, ever, so the cost is irrelevant even though it's a "real" encode rather than a stream copy.

**4 · Auto-transcribe.** The clip's audio runs through **Whisper** (OpenAI's open-source speech recognition model) for the transcript text. Plain Whisper's word-level timestamps are good but not perfectly tight — since the karaoke highlight in [Section 5.2](#52-karaoke-timing-without-playing-any-audio) depends on precise word boundaries, running the output through **WhisperX** (which adds a forced phoneme-alignment pass using a separate alignment model) is worth the extra step specifically for the timing accuracy, not just the words themselves.

**5 · Human review.** Automatic transcription of movie and TV audio — background score, accents, overlapping voices — isn't perfect, and pretending otherwise would undercut the whole karaoke-timing mechanism. A simple text-editor UI lets an admin fix wording and nudge word-boundary markers against a mini waveform before anything goes live. This step is genuinely manual and should stay that way.

**6 · Thumbnail.** One line: `ffmpeg -ss <midpoint> -i clip.mp4 -frames:v 1 thumb.jpg`.

**7 · Source separation** *(Phase 3+)* — call the hosted dialogue-isolation API from [Section 5.5](#55-character-voice-vs-background-voice-source-separation), store the two resulting stems alongside the clip.

**8 · Metadata & rights.** Title, source show/movie, category, and — critically — a `rightsStatus` field (`draft` / `cleared` / `licensed` / `pending`) that gates publishing entirely. Nothing goes live without this being explicitly set; see [Section 13](#13-legal--content-rights-strategy).

**9 · Publish.** In the Phase 1 "no live database" setup, this simply triggers a rebuild of the static `scenes.json` manifest; once a real database exists, it flips a `published` flag instead.

This entire pipeline is a low-traffic, internal tool — it only needs to hold up for your team, not for 100,000 concurrent people, so it's the one place in the product where simple, ordinary server-rendered admin UI with real authentication (a password or allowlist, nothing fancier) is the right call rather than an over-engineered one.

---

## 7. Handling ~100,000 Concurrent Users

The short version, made concrete: once accounts and per-request database writes are off the table, serving 100,000 concurrent people is not really a hard problem — it's what CDNs are built for. The engineering work is making sure nothing *accidentally* reintroduces a synchronous server hit into that path.

**Caching strategy, specifically:**

| Asset | Cache policy | Reasoning |
|---|---|---|
| Scene pages | Static / ISR, revalidate every 5–10 min | Content changes rarely; edge-cached copies serve almost all traffic |
| Video, thumbnail, transcript files | `Cache-Control: public, max-age=31536000, immutable` | Published scene assets never change in place — a new version gets a new filename |
| Trending order | Recomputed by a scheduled batch job every few minutes, written into a small cached JSON | Never computed per-request |
| View / dub counters | Batched increments (buffer client events, flush every N seconds), never a synchronous write per pageview | A DB write on every page view is exactly the kind of thing that buckles at 100k concurrent — so it's designed out entirely |

**What actually needs a live server in the public path:** essentially nothing, by design. If a real API layer exists at all (Phase 2's optional link feature, analytics ingestion), it should be stateless and horizontally autoscaled behind a load balancer, with rate limiting in front of it regardless of how little traffic it expects — see [Section 8](#8-security--abuse-resistance).

**Proving it, not assuming it:** load test with k6 or Artillery, ramping simulated concurrent virtual users against scene pages and asset URLs specifically. Watch two numbers: CDN cache hit ratio (target comfortably above 95%) and origin request rate, which should stay flat and low regardless of how much edge traffic climbs. If origin requests climb with edge traffic, something is bypassing the cache and needs to be found before it matters.

---

## 8. Security & Abuse Resistance

Removing accounts isn't just a load-reduction move — it's a genuine security win on its own: there's no password database to breach, no session tokens to hijack, and no personal data collected by default in Phases 1–3. That said, "no accounts" doesn't mean "no attack surface," so the following still apply:

- **Rate limit every endpoint that exists** — presigned-upload requests, the optional link endpoint, analytics ingestion — by IP and/or a lightweight anonymous device token, even without logins to tie abuse to.
- **Short-lived, scoped presigned URLs** for every upload path (both admin ingestion and any Phase 2+ user upload), so upload endpoints can't be pointed at arbitrary or unlimited content.
- **Server-side validation on the receiving end regardless of client checks** — a storage-trigger function that inspects file type, size, and duration the moment something lands in the bucket, and quarantines anything outside expected bounds. Client-side validation is a UX nicety, never the actual security boundary.
- **Content-Security-Policy headers and HTTPS/HSTS everywhere**, standard but non-negotiable.
- **The Cross-Origin-Embedder-Policy / Cross-Origin-Opener-Policy headers `ffmpeg.wasm` needs anyway** ([Section 5.3](#53-rendering-the-final-file--in-the-browser)) are themselves a browser security feature (cross-origin isolation) — this requirement pays for itself twice.
- **The admin tool is the one place real authentication exists** in this entire architecture, and that's intentional — it's an internal team tool gating what gets published, not a user-facing system.
- **DDoS resilience mostly falls out of the caching strategy already described** — since nearly everything public is static or edge-cached, even a malicious traffic spike lands on cache, not origin. Most CDN providers layer additional DDoS protection on top of that for free.

---

## 9. Data Model

**Scene** — the only thing Phase 1 truly needs, and even this can start as a file, not a table.

```
Scene
  id, slug, title, quote
  sourceTitle, sourceType     // movie | tv | original | user-submitted
  category
  videoUrl, thumbnailUrl, duration
  transcript                  // full text
  wordTimings[]                // [{word, start, end}]
  dialogueStemUrl              // Phase 3+
  musicFxStemUrl                // Phase 3+
  dubCount, viewCount            // batched / eventually-consistent — never a live write
  rightsStatus                 // draft | cleared | licensed | pending
  published
  createdAt, updatedAt
```

In Phase 1 this lives as a hand-maintained `scenes.json` array — one object per published scene, rebuilt whenever the admin tool publishes something. It graduates to a real table (Postgres, exactly as your original draft proposed) once the catalog or update frequency outgrows a flat file — a comfortable line is somewhere past ~100 scenes, or the point counters need to feel closer to real-time than "updates every few minutes."

**Dub — deliberately does not exist as a database concept until Phase 4.** Before that, a "dub" is a file in someone's browser memory and then their downloads folder, never a row anywhere. The closest thing to persistence earlier than Phase 4 is Phase 2's optional, auto-expiring link — closer to a temp file with a TTL than a durable record.

```
Dub                            // Phase 4+ only
  id, sceneId, userId
  audioUrl, videoUrl, duration
  status                       // recording | uploading | processing | ready | failed
  views, likes, shares
  createdAt
```

**User — Phase 4+ only, and permanently optional even after it exists.**

```
User                            // Phase 4+ only
  id, username, displayName, avatar, email
  createdAt
```

Keep this thin on purpose — followers, given-likes, and public-dub lists attach later without reshaping the core object.

---

## 10. Frontend Component Architecture

```
App
├── Navigation
│   ├── Logo · Search · NavLinks · StartDubbingButton
│   └── UserMenu                    (Phase 4+ — absent entirely before then)
│
├── Homepage
│   ├── Hero · TrendingShelf · HowItWorks · CTA
│
├── Explore
│   ├── SearchBar · CategoryTabs · FilterMenu
│   └── SceneGrid → SceneCard
│
├── Scene
│   ├── VideoPlayer · SceneMetadata · Quote · DubButton
│   ├── FavoriteButton              (Phase 4+)
│   └── RelatedScenes
│
├── DubStudio
│   ├── VideoPlayer · Transcript · WordHighlight
│   ├── Countdown · Timer · Waveform · RecordButton
│   ├── RenderEngine                ← wraps ffmpeg.wasm + fallback (Section 5.3)
│   ├── RetakeButton · PermissionDialog
│
├── Result
│   ├── VideoPreview · ProcessingState
│   ├── DownloadButton
│   ├── ShareButton                 ← Web Share API first, link second (Section 5.4)
│   └── RetakeButton
│
├── User                             (Phase 4+ — doesn't exist before then)
│   ├── Profile · MyDubs · Favorites · Settings
│
└── Admin                             (internal only, its own auth)
    ├── SceneUploader · ClipTrimmer · TranscriptEditor
    ├── ModerationQueue · SceneManager
```

---

## 11. Site Map & Navigation

**Desktop nav, Phases 1–3 (guest-only):**
`StealMyScene   Explore   Trending   How It Works        🔍 Search        [Start Dubbing]`

**Once accounts exist, Phase 4+ — added, not replacing the above:**
`StealMyScene   Explore   Trending   My Dubs   Favorites        🔍 Search        [Start Dubbing]   👤`

Deliberately avoid generic startup nav language — *Features, Company, Solutions, Resources.* This is entertainment; it should read closer to YouTube, TikTok, or Spotify than a SaaS homepage.

**Routes:**
```
/                     homepage
/explore              scene library, search + filters
/scene/:slug          scene detail — video, quote, related scenes
/dub/:sceneId          the Dub Studio
/my-dubs               Phase 4+
/favorites             Phase 4+
/admin/scenes          internal, authenticated
```

---

## 12. Recording / UI States

| State | What's shown |
|---|---|
| **Ready** | `Add Your Voice` |
| **Countdown** | `3 … 2 … 1 …` |
| **Recording** | `🔴 Recording 00:03 / 00:05` + live waveform |
| **Processing** | `Creating your scene…` — client-side render running (Section 5.3) |
| **Finished** | `Your scene is ready` — Preview · Retake · Download · Share |
| **Permission denied** | `StealMyScene needs microphone access to record your line.` + Allow button |

Unlimited retakes before anything is saved or downloaded — the loop should never punish someone for wanting to nail the timing.

---

## 13. Legal & Content Rights Strategy

This is the largest *non-technical* problem with the whole concept, worth saying plainly: the funniest possible content is almost always someone else's IP, and you shouldn't build the company assuming permanent, unlicensed distribution of Office, Minions, Marvel, or similar clips.

**What the market already shows:** Dubsmash — the original lip-sync-to-existing-audio app — grew into a genuine cultural phenomenon, was acquired by Reddit in December 2020, and was shut down as a standalone app in February 2022, folded into Reddit's own video tools. A near-identical concept to this one, **Lipp** ("add your voice to scenes from movies, interviews, and TV shows"), existed and quietly disappeared. **MadLipz** — a large, categorized library of clips from movies, TV, and news that users dub in their own voice — is the closest thing to a living, currently-operating direct competitor, and the benchmark worth studying. None of this means the idea is bad; it means virality without a resolved rights strategy is not a durable business on its own.

**Safer launch strategy, in order:**
1. **Original sketches** — written and performed specifically for this platform
2. **Public-domain footage** — old films, government/educational footage, anything genuinely out of copyright
3. **Creator-submitted footage** — uploaded by people who own or have real rights to what they're uploading
4. **Properly licensed content** — pursued once there's traction to make the conversation worth a studio's time

For prototyping and internal demos, recognizable examples are fine to work with. For an actual public, commercial product, the content-rights strategy has to be solved before scale, not after — retrofitting it once a library is popular is far harder than starting clean. A DMCA-style takedown workflow and a `rightsStatus` gate on every scene (already in the data model above) are table stakes regardless of which sourcing path you lean on.

---

## 14. Tech Stack Summary, By Phase

| Layer | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---|---|---|---|---|---|
| Frontend | Next.js, React, static/ISR | + Web Share API | — | + auth UI | + native apps |
| Recording | `getUserMedia`, `MediaRecorder` | — | — | — | native codecs on mobile |
| Rendering | `ffmpeg.wasm`, client-side | + serverless fallback function | — | — | + WebCodecs path (optional) |
| Content DB | `scenes.json` on the CDN | Postgres once catalog outgrows a flat file | + stem URLs | + `Dub`, `User` tables | — |
| Storage / CDN | S3 or R2 + CDN | + short-TTL bucket for links | + stem storage | + user-dub storage | multi-region |
| Transcription | Whisper + WhisperX | — | — | — | — |
| Source separation | — | — | Hosted dialogue-isolation API (e.g. AudioShake / comparable) | — | Self-hosted Demucs, if volume justifies it |
| Analytics | Basic pageviews | Batched anonymous event pipeline | — | + account-level retention metrics | — |
| Auth | Admin-only (internal tool) | — | — | Optional user accounts | — |
| Infra | Static hosting + CDN, no servers to speak of | k6/Artillery load testing | — | Autoscaled thin API tier | Kubernetes/ECS if traffic earns it |

---

## 15. The Metric That Matters

Don't obsess early on registered users, homepage views, or email subscribers — there's no account system to make those meaningful yet anyway. Watch the funnel instead, exactly as laid out in the original draft:

```
100 people open a scene
 → 70 press Add Your Voice
   → 55 actually finish recording
     → 40 preview their dub
       → 28 retry
         → 25 download or share
           → 18 dub another scene
```

These are illustrative starting hypotheses, not measured numbers — there's no traffic yet to measure. The one that matters most once real people show up:

> **% of users who dub a second scene.**

If people immediately want to perform another one, the loop is working, and everything from Phase 2 onward is worth building. If that number is weak, no amount of infrastructure or additional content fixes it — the fix is in the loop itself.

---

## 16. Honest Risks & Trade-offs

- **Device performance varies.** `ffmpeg.wasm` handles short clips well, but older or memory-constrained phones can still struggle. The serverless fallback in Section 5.3 covers this, but expect it to fire for a real (if small) slice of traffic — budget for it rather than being surprised by it.
- **No pre-publish moderation on locally-exported content.** Because nothing is published *on* the platform in Phases 1–3, exposure is naturally limited — a private export is no different from screen-recording anything else — but it's worth being clear-eyed that this is a deliberate trade-off, not an oversight, and it's exactly why Phase 2's link feature and Phase 4's public gallery each reintroduce a real moderation step at the moment they reintroduce real exposure.
- **Content rights are the biggest risk in the whole plan**, by a wide margin over anything technical — see Section 13.
- **The flat-file `scenes.json` approach is an operational choice, not a permanent one.** It's genuinely fine for tens of scenes and painful past roughly a hundred — plan the migration to a real database deliberately, before it becomes an emergency during a traffic spike.
- **Transcription quality depends on source audio.** Clean dialogue transcribes well; noisy movie mixes, heavy accents, or overlapping voices will need more manual correction time than a clean interview clip would — budget admin time accordingly rather than assuming full automation.
- **Source separation isn't perfect.** Expect occasional artifacts or minor bleed between stems, especially on lower-quality source audio — it's a real quality upgrade over Phase 1, not a flawless one.
- **Web Share API file support isn't universal.** It's strong on mobile Safari and Chrome, weaker or absent elsewhere — the manual-download fallback needs to feel like a real path, not an apologetic error state.

---

*Everything above is the software plan you asked for — phase by phase, mechanism by mechanism. The visual direction in the image you shared is noted for when this moves into actual interface design: it's a distinctly different mood from anything decided here (dark, theatrical, high-contrast), and nothing in this document locks in a visual style — it's all still open for that pass.*
