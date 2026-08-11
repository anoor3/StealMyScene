# Phase 2 local origin smoke report

Run date: 2026-08-11  
Commit under test: `45d65e0` plus the uncommitted load harness  
Command: `npm run test:load:smoke`  
Environment: local Next.js production server on macOS, 50 concurrent workers, 2,000 requests

| Metric | Result |
|---|---:|
| Requests | 2,000 |
| Errors | 0 |
| Error rate | 0% |
| p50 | 21.67 ms |
| p95 | 44.45 ms |
| p99 | 83.02 ms |
| Throughput | 1,984.54 requests/second |
| Bytes transferred | 161,382,000 |
| Immutable scene policy | `public, max-age=31536000, immutable` |

The workload rotated through the home, explore, trending, and scene pages plus the manifest, thumbnails, and MP4 assets. It warmed every path before measurement and read every response body. The assertions required zero errors, p95 below 1,000 ms, and the immutable one-year cache policy on versioned scene media.

This is origin smoke evidence only. It does not prove CDN cache-hit ratio, geographic edge latency, origin fan-out, or 100,000 concurrent-user behavior. P2-09 and P2-10 remain awaiting a deployed CDN run with `load/phase2.k6.js`; those gates must not be marked complete from these localhost numbers.
