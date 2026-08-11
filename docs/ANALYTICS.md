# Anonymous analytics and trending

The browser queues anonymous events in memory. It sends at ten events or after five seconds, and it never awaits analytics from navigation, recording, preview, rendering, downloading, or sharing. Global Privacy Control disables collection.

Failed fetch batches are capped at 90 events in local storage and retried on the next flush or online event. Page exit uses `sendBeacon`; if the browser rejects the beacon, that batch remains queued. A successful beacon means the browser accepted responsibility for delivery, not that the server confirmed storage. Batch IDs are stable across retries, and immutable storage keys make duplicate delivery idempotent.

Production uses the configured S3 or R2 bucket. Each accepted batch is a separate immutable object below `analytics/events/YYYY-MM-DD/`. Local development writes the same shape below `var/analytics/`. No raw microphone audio, video, transcript, name, email, advertising identifier, or account identifier is collected.

A scheduler should POST to `/api/internal/analytics/aggregate` with `Authorization: Bearer $ANALYTICS_AGGREGATION_SECRET`. The job reads the latest seven days, computes the deterministic trending score, and atomically replaces the cached snapshot. `/api/trending` is cached at the edge for five minutes and can serve stale output for one hour. Page and media delivery stay static and never require an analytics database read.

The score includes recency-decayed views, completed dubs, shares, recording completion rate, and 12-hour velocity. Its constants and edge cases are covered by unit tests. When activity is tied or absent, scene ID supplies a stable order.
