# Phase 2 load verification

The high-concurrency workload is `load/phase2.k6.js`. It requests static pages and immutable media together, ramps into a spike, records p50/p95/p99 and errors through the native k6 summary, derives CDN cache hits from common CDN headers, and counts responses identified as origin misses. With `REQUIRE_CDN=true`, a missing or unrecognized cache header counts as a miss instead of silently disappearing from the ratio.

Actual video time-to-first-frame is measured separately by `load/phase2-browser.k6.js`. A Chromium browser opens statically generated scene pages, starts the muted scene video, and records the first decoded frame using `requestVideoFrameCallback`, falling back to the `playing` event only when that API is unavailable. Browser probes are intentionally low-concurrency because they measure real page and media behavior; the HTTP workload supplies the high-concurrency CDN pressure.

Run a staged deployment test first:

```sh
mkdir -p test-results/load
BASE_URL=https://staging.example.com PEAK_VUS=1000 REQUIRE_CDN=true k6 run load/phase2.k6.js
BASE_URL=https://staging.example.com BROWSER_VUS=5 BROWSER_ITERATIONS=50 k6 run load/phase2-browser.k6.js
```

Record a browser baseline before the HTTP spike, run the browser probe again while the HTTP workload is holding at peak, and run it once more after ramp-down. Use a distinct `BROWSER_SUMMARY_PATH` for each run. This is how the exit review determines whether first-frame p95 stays flat as edge traffic rises; the browser probe is not replaced by HTTP request duration.

Increase `PEAK_VUS` only with hosting-provider approval and active cost/error monitoring. Preserve each result with the deployment identifier, CDN configuration, region, and exact environment variables. The final 100,000-user report must include HTTP p50, p95, p99, error rate, cache-hit ratio, origin response count, comparison between ramp stages, and browser first-frame p50, p95, p99 and success rate. Passing requires HTTP errors below 1%, HTTP p95 below 800 ms, first-frame p95 below 1,200 ms, and CDN hits above 95% without origin requests rising proportionally with edge traffic.

`npm run test:load:smoke` is a bounded localhost origin check. It catches server errors, latency regressions, and missing immutable cache headers. It cannot measure a CDN, edge fan-out, geographic behavior, or 100,000-user capacity and must never be presented as the Phase 2 exit proof.
