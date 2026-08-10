# StealMyScene

StealMyScene is a browser-first dubbing toy: choose a short original scene, follow its timed line, record a performance, preview it, and render a downloadable MP4 locally—without signup or an upload in the Phase 1 guest flow.

## Local development

Requirements: Node.js 20.9 or newer and FFmpeg 6 or newer (FFmpeg is only required when regenerating the original scene library or running the admin ingestion worker).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The public guest experience works without environment secrets. Admin authentication and S3/R2 ingestion require the values documented in `.env.example`.

The internal ingestion desk is at `/admin/scenes`. Local development uses `var/` for quarantined, accepted, and processed media. Production should use `STORAGE_DRIVER=s3`, configure the object-created validator described in [`infra/storage-trigger/README.md`](./infra/storage-trigger/README.md), and provide a deploy rebuild hook so newly published immutable assets and the versioned manifest become active.

Set `ENABLE_HSTS=true` only on the real HTTPS deployment. It is intentionally off for local HTTP because HSTS would make WebKit upgrade local CSS and media requests to HTTPS.

## Verification

```bash
npm run verify
```

This runs linting, strict TypeScript checks, automated tests, and a production build.

To deterministically regenerate the 24 original, rights-cleared gradient scenes and their manifest:

```bash
npm run generate:scenes
```

## Project controls

- [`StealMyScene_Complete_Plan.md`](./StealMyScene_Complete_Plan.md) is the canonical scope.
- [`PROJECT_PROGRESS.md`](./PROJECT_PROGRESS.md) is the live delivery and evidence ledger.
- [`ENGINEERING_EXECUTION_RULES.md`](./ENGINEERING_EXECUTION_RULES.md) defines build, testing, commit, push, and mistake-prevention rules.
