# Storage upload validator

`src/workers/storage-validator.ts` is the production object-created handler for admin source uploads. Configure the S3/R2-compatible bucket to invoke it only for the `incoming/` prefix.

The worker downloads each new object into an isolated temporary directory, verifies container magic bytes, runs FFprobe, enforces a real video stream and the 20-minute source limit, then applies `validation-status=accepted`. Invalid objects are copied to `quarantine/`, tagged `rejected`, and deleted from `incoming/`. The processing worker independently repeats validation before FFmpeg, so a missing or delayed storage event cannot bypass the boundary.

Deployment requirements:

1. Bundle the TypeScript handler for a Node.js 22 runtime.
2. Provide FFmpeg/FFprobe through the worker image or a Lambda layer.
3. Grant only `GetObject`, `PutObjectTagging`, `CopyObject`, and `DeleteObject` for this bucket's `incoming/` and `quarantine/` prefixes.
4. Subscribe to object-created events for `incoming/` only and configure a dead-letter destination plus alerts.
5. Apply lifecycle deletion to rejected quarantine objects after the organization's review window.

The admin processing route never trusts the tag by itself; it downloads and validates the bytes again before trimming.
