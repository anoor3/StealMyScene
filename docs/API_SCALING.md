# Public API scaling contract

Scene pages, thumbnails, source clips, FFmpeg cores, and the catalog are static CDN assets. Rendering, downloading, and native file sharing normally stay in the browser. Public server writes exist only for anonymous analytics batches, explicitly requested temporary links, and render fallback.

Production must set `STORAGE_DRIVER=s3` so API instances share no filesystem state. It must also provide `RATE_LIMIT_SERVICE_URL` and `RATE_LIMIT_SERVICE_TOKEN`. The service receives an authenticated JSON request shaped as `{ "key": string, "limit": number, "windowMs": number }` and returns `{ "allowed": boolean }`. It must implement an atomic distributed counter with expiry. A missing token, timeout, malformed response, or service failure is denied closed. `RATE_LIMIT_DRIVER=memory` is only for a single-process local preview or isolated E2E run and must never be set on a multi-instance deployment.

Every API response is bounded, uploads use scoped direct object-storage URLs where practical, and public status reads are rate limited. Temporary media records and analytics batches live in shared object storage, so adding application instances does not require session affinity or local disk synchronization.
