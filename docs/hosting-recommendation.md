# Hosting Recommendation

Last checked: 2026-06-27.

## Short Answer

Use a split deployment:

1. **Frontend:** Cloudflare Pages Free.
2. **Pictures:** Optimized images in the Pages bundle at first; Cloudflare R2 later if the photo library grows.
3. **Go backend:** Google Cloud Run as a small containerized API.

This keeps the expensive part, static images, on Cloudflare's edge while letting the Go backend scale down to zero when nobody is using it.

## Recommended Architecture

```text
example.com          -> Cloudflare Pages frontend
www.example.com      -> Cloudflare Pages frontend
api.example.com      -> Google Cloud Run Go backend
static.example.com   -> Cloudflare R2, only when needed
```

The most important rule: **do not serve photos through the Go backend**. Static image traffic should come from Cloudflare Pages or R2. The Go service should handle only dynamic API work such as contact forms, admin tools, auth, private data, comments, or future app features.

## Why Cloudflare Pages For The Frontend

Cloudflare Pages is the best fit for the public site because static asset delivery is the expensive part of a photo-heavy personal site, and Cloudflare's free Pages plan is unusually strong there:

- **$0/month hosting**.
- **Unlimited static requests and bandwidth** on the Free plan.
- **500 builds/month**, which is far more than this site needs.
- **Free custom domain support** and automatic HTTPS.
- Simple GitHub integration.

For this project, Cloudflare Pages is cheaper and safer than GitHub Pages, Vercel, or Netlify once images become a meaningful part of traffic.

## Why Google Cloud Run For The Go Backend

Google Cloud Run is the best cheap fit for a small Go backend because it runs a normal HTTP container, scales to zero, and has a generous free tier for low-traffic services. A personal site backend with a few API endpoints should often stay at **$0/month**, although Google Cloud requires a billing account.

Use Cloud Run when:

- The backend is a normal Go HTTP server.
- Traffic is low or bursty.
- Cold starts are acceptable.
- You want to avoid managing a VPS.
- You may eventually add a database, private APIs, background jobs, or authenticated features.

Use a small VPS or Fly.io-style always-on app only if the backend needs always-on behavior, long-lived WebSockets, consistently low cold-start latency, or more direct server control.

## Important Limits

Cloudflare Pages has limits that matter for image-heavy frontend deployments:

- Free plan: **20,000 files per site**.
- Paid plans: up to **100,000 files per site** with the documented Pages Wrangler setting.
- Individual static asset limit: **25 MiB per file**.
- Build timeout: **20 minutes**.

Practical rule: do not put original camera exports into the Pages deployment. Publish resized/compressed versions instead.

## Recommended Image Strategy

Use this progression:

### Phase 1: Simple and Free

Store optimized images in the frontend, likely under:

```text
frontend/public/images/
```

Use modern formats and sizes:

- Export photos as WebP or AVIF.
- Keep JPEG fallbacks only if needed.
- Generate responsive sizes, for example `480w`, `960w`, and `1600w`.
- Keep each published image well below 25 MiB; for a personal site, most display images should usually be far below 1 MiB.
- Keep original full-resolution photos in local backup/cloud storage, not in Git.

This keeps hosting at **$0/month** apart from the domain name.

### Phase 2: Add R2 When the Photos Outgrow the Site Bundle

Use Cloudflare R2 for images when one of these becomes true:

- The built Pages output is approaching **20,000 files**.
- The Git repo is becoming slow or bloated.
- You want to keep a larger public archive of photos.
- You need to serve individual files larger than **25 MiB**.

Use a custom asset hostname such as:

```text
static.example.com
```

R2 has a useful free tier, including **10 GB-month storage**, **1 million Class A operations/month**, **10 million Class B operations/month**, and **free egress**. Past the free tier, R2 is still cheap for storage, but reads are metered. That means Pages is better for frequently viewed optimized site images when you are still within Pages limits.

## Suggested Cloudflare Pages Settings

Assuming the actual app source lives in `frontend/`:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | `frontend` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Build output directory | `dist` |

If the project uses React Router client-side routes, add a SPA fallback:

```text
/* /index.html 200
```

This usually goes in:

```text
frontend/public/_redirects
```

## Suggested Go Backend Setup

Put the Go service in:

```text
backend/
```

Design it as a plain HTTP API:

- Listen on the `PORT` environment variable.
- Add a cheap health endpoint such as `GET /healthz`.
- Configure CORS to allow only the production frontend domain and local dev origins.
- Keep secrets in Cloud Run environment variables or Secret Manager.
- Return image URLs from the API if needed, but do not stream image bytes through the API.

Deploy it to Cloud Run as a container. The Cloud Run service should be attached to:

```text
api.example.com
```

The frontend should call the backend through an environment variable, for example:

```text
VITE_API_BASE_URL=https://api.example.com
```

## Cheapest Deployment Order

1. Launch the frontend on Cloudflare Pages.
2. Keep optimized images in the frontend bundle until size/count becomes annoying.
3. Add the Go backend on Cloud Run only when the frontend actually needs dynamic behavior.
4. Add R2 only when image volume outgrows Pages or Git.
5. Add a database only when the backend needs durable data.

## Domain Recommendation

Register or transfer the domain through **Cloudflare Registrar** if the TLD is supported. Cloudflare sells domains at cost with no markup, and DNS integrates directly with Pages.

Expected ongoing cost:

- Frontend hosting: **$0/month**.
- Go backend: usually **$0/month for low traffic** on Cloud Run's free tier, but requires billing to be enabled.
- Domain: whatever the registry charges annually, usually the only unavoidable cost.
- R2: **$0/month initially** if you stay within its free tier; otherwise usage-based.

## Alternatives Considered

| Host | Best use | Why not first choice for everything |
| --- | --- | --- |
| Cloudflare Pages | Static frontend and optimized images | It does not host a normal Go server directly. |
| Google Cloud Run | Go backend API | Less beginner-simple than Render/Fly, and billing must be enabled. |
| Cloudflare R2 | Large photo archive/static asset bucket | Adds object-storage workflow; not needed on day one. |
| GitHub Pages | Very small static sites | Published sites are limited to 1 GB and have a 100 GB/month soft bandwidth limit. Image-heavy sites can hit this faster. |
| Vercel Hobby | Frontend apps | Free plan includes 100 GB/month Fast Data Transfer; image-heavy traffic can exhaust that. |
| Netlify Free | Easy static deploys | Current credit-based pricing charges credits for bandwidth and requests, which is less predictable for many images. |
| Render/Fly.io | Simpler Go app hosting or always-on services | Usually less attractive than Cloud Run if the goal is the lowest possible cost for a low-traffic API. |

## Final Recommendation

Start with **Cloudflare Pages Free** for the frontend and optimized images in the site bundle. Add the Go backend as a **Google Cloud Run** service at `api.example.com` when dynamic API behavior is ready.

When images outgrow the Pages deployment or Git repo, add **Cloudflare R2** for large or archival photos while keeping the main site on Cloudflare Pages. Keep the Go backend out of the image-delivery path.

## Sources

- [Cloudflare Pages pricing](https://pages.cloudflare.com/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Functions/static asset pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- [Google Cloud Run pricing](https://cloud.google.com/run/pricing)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Vercel pricing](https://vercel.com/pricing)
- [Netlify pricing](https://www.netlify.com/pricing/)
