# Docs

The contract and design record for the site. Read these before making decisions —
they're the source of truth the frontend and (eventual) Go backend are built to.

| Doc | What's in it |
|---|---|
| [`01-backend-api-routes.md`](01-backend-api-routes.md) | Every API route + JSON shape (the backend contract). |
| [`02-react-components.md`](02-react-components.md) | Full component inventory + tree. |
| [`03-frontend-guidelines.md`](03-frontend-guidelines.md) | Stack, conventions, a11y, performance. |
| [`04-hosting-architecture.md`](04-hosting-architecture.md) | Chosen hosting design + phased setup checklist. |
| [`05-photo-pipeline.md`](05-photo-pipeline.md) | Local photo source layout, derivative generation, mock data, and verification flow. |
| [`06-page-metadata.md`](06-page-metadata.md) | Build snapshots, per-route metadata, and prerendered content. |
| [`07-admin-mtls-prd.md`](07-admin-mtls-prd.md) | Proposed single-owner admin: direct-to-Go mTLS, hardware keys, private PKI, lifecycle, and acceptance tests. |
| [`decision-points/architecture.md`](decision-points/architecture.md) | Hosting decision record: every option considered and why the others lost. |
| [`decision-points/vps.md`](decision-points/vps.md) | The VPS in detail: provider/size/OS choice + a step-by-step setup runbook. |
