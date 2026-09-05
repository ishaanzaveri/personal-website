# Page metadata and build snapshots

`npm run build` runs Vite and then `scripts/prerender.mjs`. The postbuild step
writes an `index.html` for every public route, including every post, album, and
photograph. Each document has readable content inside `#root`, a canonical link,
a description, Open Graph and Twitter tags, and Article or ImageObject JSON-LD
where applicable. Markdown is rendered with React Markdown, GFM, and
`rehype-sanitize`; HTML and JSON-LD are escaped separately.

The static markup is a readable version of the same public content, not a second
interactive application. The existing React `createRoot` entrypoint replaces it
on startup. JavaScript navigation updates metadata from the page's API query
results through `usePageTitle`. Leaving a photo clears its image and structured
data tags; unknown routes receive `noindex`.

## Configuration

```bash
SITE_URL=https://ishaanzaveri.com npm run build
```

`SITE_URL` defaults to `https://ishaanzaveri.com`. It must be an HTTP(S) origin
without credentials, path, query, or fragment. Runtime navigation preserves the
origin from the generated canonical link. Local Vite development uses the local
origin because its unbuilt HTML has no canonical link.

By default the build reads `frontend/mock-server/data/{site,about,posts,frames,albums}.json`.
These are the checked-in public content seeds served by the current mock API.
To use an exported snapshot from another content source:

```bash
PRERENDER_DATA_DIR=/absolute/path/to/public-snapshot SITE_URL=https://example.com npm run build
```

The directory must contain the same five JSON files and shapes as the seeds.
`posts.json` must contain full post bodies, and `frames.json` must contain all
published frames. Only export content intended for public display. Route IDs
must be unique, and consist of letters, numbers, underscores, and hyphens.

**Rebuild and redeploy when content changes.** The browser API may update sooner,
but crawlers and clients without JavaScript see the build snapshot until the next
deployment. This workflow does not fetch a live API at build time or modify the
owner's Go backend. Existing permissive `robots.txt` is retained; RSS, sitemap,
and PGP resources are not introduced.

Static hosting must serve nested `index.html` documents before the SPA fallback.
Verify this behavior on the hosting platform when deploying. The build retains
Vite's hashed script/style references. Run `npm run test:metadata` for route,
escaping, structured-data, and generated-document checks.
