# CLAUDE.md — Frontend

Guidance for working in `frontend/`. This is the production frontend for a
terminal/CRT-themed personal portfolio. The folder is currently empty — the app
is built from the spec in `../docs/`, not yet implemented.

## Source of truth

Read these before making decisions; they are the contract:

- `../docs/01-backend-api-routes.md` — every API route + JSON shape.
- `../docs/02-react-components.md` — the full component inventory + tree.
- `../docs/03-frontend-guidelines.md` — stack, conventions, a11y, performance.
- Reference prototype: the `claude.ai/design` project (`Website.html` + `src/*.jsx`).
  It is a single-file React app that loads React from a CDN and transpiles JSX in
  the browser with Babel. **It is design reference only — do not replicate its
  delivery mechanism.**

## What we're building

A single-author, read-mostly portfolio with five views: **Home, About, Blog,
Photo, Contact**. The aesthetic is a terminal: JetBrains Mono everywhere, ASCII
brackets, shell prompts (`iz@web:~/site$`), blinking cursors, scanline overlay,
`◢`/`▸` glyphs. Preserve this voice in any new UI.

## Stack

- **React 18+ with Vite** and **TypeScript** (no in-browser Babel, no CDN React).
- **react-router** for real URLs (the prototype fakes routing with a `page` state
  machine — replace it).
- **TanStack Query** for server state.
- **CSS variables + CSS Modules** for styling. Port the prototype's
  `colors_and_type.css` to `src/styles/tokens.css` — it is the design-token
  contract.
- Self-host **JetBrains Mono** (don't load from Google Fonts).

## Hard rules (carried over from the prototype's anti-patterns)

1. **No `window.X = Component` globals.** Use ES module `import`/`export`.
2. **No in-browser transpilation / CDN React.** Everything goes through Vite.
3. **No hardcoded content arrays.** `FRAMES`, `ALBUMS`, posts, projects all come
   from the API (`../docs/01-backend-api-routes.md`). The prototype inlines them;
   we don't.
4. **No state-as-router.** URLs drive views: `/blog/:slug` opens a post,
   `/photo/:id` opens a frame's modal/detail. Filter/search state lives in the
   URL query (`?tag=street&q=tokyo`) so views are shareable.
5. **No raw HTML injection.** Blog post `body` is markdown — render with a vetted
   library (`react-markdown` + `remark`) and sanitize. Don't port the prototype's
   hand-rolled `parseInline` parser.
6. **No stray hex / magic numbers.** Use design tokens for color, spacing, radii,
   and motion. Add a token rather than a one-off value.

## Conventions

- **Breakpoints** come from one hook, `useViewport` (`mobile < 760`,
  `narrow < 980`). Don't scatter media-query magic numbers; prefer real CSS
  media/container queries where possible.
- **Primitives first.** Build the design-system primitives (`Bracket`, `Tile`,
  `Tag`, `Btn`, `Kbd`, `Prompt`, `Cursor`, `Status`, `SectionH`, `Wordmark`) and
  `useViewport` before pages — everything depends on them.
- **Server state** → TanStack Query keyed by route/filter params. **UI state**
  (modal/palette/drawer open, copied-toast) → local component state. No global
  store needed at this size.
- **Every data-driven component** ships loading, error, and empty states.
  `NoResults` is the empty-state model; add skeletons for loading.
- **Accessibility is not optional:** real `<button>`/`<a>` (not clickable
  `<div>`/`<span>`), focus trapping in `PhotoModal`/`Palette`/mobile drawer,
  visible focus rings, `alt` text on photos, and respect
  `prefers-reduced-motion` (already in the token CSS).

## Suggested structure

```
src/
├─ app/          # router, root layout, providers (Query client)
├─ components/
│  ├─ primitives/  # Bracket, Tile, Tag, Btn, Kbd, Prompt, Cursor, Status, SectionH, Wordmark
│  └─ nav/         # Nav, Palette, Footer
├─ features/
│  ├─ home/  about/  blog/  contact/
│  └─ photo/       # Photo orchestrator, views, overlays (modal + detail), data hooks
├─ hooks/        # useViewport, …
├─ lib/          # api client, query keys, formatters
├─ styles/       # tokens.css (from colors_and_type.css), globals
└─ types/        # Frame, Album, Post, Project, Site
```

## Build order

1. Tooling: Vite + TS + router + Query + token CSS + self-hosted font.
2. Primitives + `useViewport`.
3. Shell: router/layout, `Nav`, `Footer`, `Palette` (⌘K).
4. Home, About, Contact (simplest data).
5. Blog + BlogPost (markdown rendering).
6. Photo subsystem last — most components and interaction (gallery/albums/album
   views, portal modal, full-detail page, search/filter).

## Definition of done (per component)

Typed props (no `any`); token-backed styling; keyboard-operable with correct
semantics and visible focus; loading/error/empty states where data is fetched;
responsive at mobile/narrow/desktop; no `window.*` globals or in-browser
transpilation.

## Photo data notes

There are **no real images yet** — the prototype draws deterministic OKLCH
gradient placeholders (`FramePlate`/`frameBg`) from each frame's `hue`/`lightness`.
Keep that gradient as the blurhash/LQIP loading shim; `image.src` from the API is
the real source once photos exist. EXIF (camera/lens/aperture/shutter/iso) should
be parsed server-side, not hand-entered.

## Commits

Commit every change. Make small, focused commits as you go rather than batching
many edits into one — each logical change gets its own commit and is pushed.
Work on a branch, not `main`. Commit messages end with the `Co-Authored-By`
trailer (see git log).
