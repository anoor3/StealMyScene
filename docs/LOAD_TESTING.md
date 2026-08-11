# Phase 2 load verification

The versioned k6 workload is `load/phase2.k6.js`. It requests static pages and immutable media together, ramps into a spike, records p50/p95/p99 and errors through the native k6 summary, derives CDN cache hits from common CDN headers, and counts responses identified as origin misses.

Run a staged deployment test first:

```sh
mkdir -p test-results/load
BASE_URL=https://staging.example.com PEAK_VUS=1000 REQUIRE_CDN=true k6 run load/phase2.k6.js
```

Increase `PEAK_VUS` only with hosting-provider approval and active cost/error monitoring. Preserve each JSON summary with the deployment identifier, CDN configuration, region, and exact environment variables. The final 100,000-user report must include p50, p95, p99, error rate, cache-hit ratio, origin response count, and the comparison between ramp stages. Passing requires errors below 1%, p95 below the agreed 800 ms SLO, and CDN hits above 95% without origin requests rising proportionally with edge traffic.

`npm run test:load:smoke` is a bounded localhost origin check. It catches server errors, latency regressions, and missing immutable cache headers. It cannot measure a CDN, edge fan-out, geographic behavior, or 100,000-user capacity and must never be presented as the Phase 2 exit proof.
