# Frontend

Production frontend for the terminal/CRT-themed portfolio. Built from the spec in
`../docs/` (API routes, component inventory, build guidelines). See `CLAUDE.md` for
conventions.

## Stack

Vite · React 18 · TypeScript · react-router · TanStack Query · CSS Modules + design
tokens (`src/styles/tokens.css`) · self-hosted JetBrains Mono · `react-markdown`
(generic render for now).

## Develop

```bash
npm install
npm run dev      # Vite on :5173 + mock API on :8787 (concurrently)
```

The Vite dev server proxies `/api` → the mock server on `:8787`.

- `npm run dev:web` — Vite only
- `npm run dev:api` — mock API only
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build

## Mock API server

`mock-server/` is a tiny Express stub serving the public, read-only GET routes from
`../docs/01-backend-api-routes.md` (no auth/admin, RSS feed, or contact POST yet).
Seed data lives in `mock-server/data/`. The photo seed is generated from the
prototype's values:

```bash
node mock-server/build-photo-seed.mjs   # regenerates data/frames.json + data/albums.json
```

## Structure

```
src/
├─ app/         router, RootLayout, fallbacks
├─ components/  primitives/ (Bracket, Tile, Btn, …), nav/ (Nav, Footer, Palette), States, Markdown, FramePlate
├─ features/    home, about, blog, contact, photo
├─ hooks/       useViewport, useFocusTrap, useCopy, useGoShortcuts, usePageTitle
├─ lib/         apiClient, queries (TanStack), format, tagColors
├─ styles/      tokens.css, globals.css
└─ types/       API data contracts
```

## Not yet done (deferred)

- Markdown is rendered generically; the styled treatments (About line-gutter source,
  BlogPost `PostCode` syntax panels) are a later pass.
- Real images: frames use the deterministic OKLCH gradient shim (`FramePlate`);
  `image.src` from the API takes over once photos exist.
- Auth/admin surface, RSS `/feed.xml`, and the contact POST path.
```
