# Frontend Build Guidelines

How to build this site as a production frontend application. The prototype
(`Website.html` + `src/*.jsx`) is a single HTML file that pulls React from a CDN
and transpiles JSX in the browser with Babel. That is great for design iteration
and terrible for production. This document is the bridge from prototype to a real
app.

---

## 1. Tech stack

| Concern | Recommendation | Why |
|---|---|---|
| Framework | React 18+ with **Vite** (or Next.js if you want SSR/SSG) | Kill in-browser Babel; get HMR, bundling, code-splitting. |
| Language | **TypeScript** | The data shapes (frames, posts, projects) are well-defined — type them. |
| Routing | `react-router` (Vite) or file-based routes (Next) | Replace the `page` state machine with real URLs. |
| Styling | Keep the CSS-variable token system (`colors_and_type.css`); add CSS Modules or vanilla-extract | Tokens are already excellent; just stop using inline-style objects everywhere. |
| Data fetching | **TanStack Query** | Caching, dedup, and loading/error states for the read-mostly API. |
| Fonts | Self-host **JetBrains Mono** | Currently loaded from Google Fonts; self-host for performance + privacy. |

Because the site is single-author and read-mostly, **static generation (SSG)** is
the natural fit: pre-render every page and inline the API JSON at build time.
Reach for SSR only if content must update without a rebuild.

---

## 2. Migrate off the prototype patterns

The prototype uses several shortcuts that must not survive into production:

1. **In-browser Babel + CDN React** → bundle with Vite/Next. Ship transpiled,
   minified, tree-shaken code.
2. **`window.X = Component` globals** → real ES module `import`/`export`. Every
   `src/*.jsx` ends with `window.Home = Home` / `Object.assign(window, {…})`;
   replace with module exports.
3. **State-as-router** (`page`, `navArg`) → URL routes. `./photo` deep-linking to
   a frame becomes `/photo/p001`; a blog post becomes `/blog/:slug`. This gives
   you shareable links, back/forward, and SEO for free.
4. **Hardcoded data arrays** → fetch from the API (see `01-backend-api-routes.md`).
   `FRAMES`, `ALBUMS`, `posts`, `work` all move out of the bundle.
5. **Hand-rolled markdown parser** (`parseInline` in `About.jsx`) → a vetted
   library (`react-markdown` + `remark`) with sanitization. Keep the visible-source
   *styling* if you like that look, but not the parser.
6. **Inline-style objects** → token-backed CSS classes. Hundreds of `style={{…}}`
   props hurt readability and re-render cost. The design tokens already exist as
   CSS variables — lean on them.

---

## 3. Design tokens & theming

`colors_and_type.css` is the contract. Treat it as the single source of truth.

- **Color:** dark-first surfaces (`--bg`, `--panel`, `--rule`), a restrained text
  ramp (`--text-dim → --text-hi`), and signal colors (`--teal` brand, `--amber`
  warn/WIP, `--rose` error only, `--violet` annotation). Never introduce ad-hoc
  hex values — add a token.
- **Type:** one family for everything — JetBrains Mono. Semantic roles `.t-display`
  → `.t-label` are defined; use them instead of re-specifying sizes inline.
- **Radii:** sharp by default (`--r-1: 0`), `2px` for inputs/buttons, `4px` max.
- **Spacing:** base-4 scale (`--s-1`…`--s-8`).
- **Motion:** named durations (`--t-micro`/`--t-default`/`--t-reveal`/`--t-page`)
  and one easing curve (`--ease`). Use them; don't hardcode `0.18s`.

The aesthetic is a **terminal / CRT** theme: ASCII brackets, shell prompts
(`iz@web:~/site$`), blinking cursors, monospace everywhere, scanline overlay,
`◢`/`▸` glyphs. Preserve this voice when adding components.

---

## 4. Responsive strategy

- Breakpoints come from one hook, `useViewport`: `mobile < 760`, `narrow < 980`.
  Keep a single source of truth — don't scatter media-query magic numbers.
- The doc container is `max-width: 1180px` with `56px` desktop / `20px` mobile
  padding.
- Layouts collapse predictably: 3/4-column grids → 1 column on `narrow`/`mobile`;
  masonry goes from 3 columns to 2.
- Nav swaps the primary wordmark for the compact wordmark and an inline menu for a
  hamburger drawer on mobile.

When you move to CSS Modules, prefer real CSS media queries / container queries
over JS breakpoints where possible; reserve `useViewport` for genuinely
JS-dependent decisions (e.g. column counts passed to masonry logic).

---

## 5. Accessibility

The prototype is keyboard-rich but has gaps to close in production:

- **Semantic markup:** many clickable `<span>`/`<div>`/`<figure>` elements act as
  buttons/links. Use real `<button>`/`<a>` with `href`s so they're focusable and
  announce correctly. (Nav already uses `<button>`; the photo grid and post rows
  do not.)
- **Focus management:** when `PhotoModal` opens, trap focus inside it and restore
  focus to the trigger on close. Same for the `Palette` overlay and mobile drawer.
- **Keyboard:** keep the existing shortcuts (`⌘K`, `g`+letter chords, modal
  Esc/←/→) but ensure all interactive elements are tab-reachable and have visible
  focus rings.
- **Color contrast:** verify `--text-mid`/`--text-dim` on `--bg` meet WCAG AA for
  the sizes used; the dim ramp is intentionally low-contrast — audit it.
- **Reduced motion:** already handled (`@media (prefers-reduced-motion: reduce)`
  kills animations + cursor blink). Keep this; extend it to any new animation.
- **Alt text:** real photos need `alt`. The frame data should carry a description;
  fall back to `caption.title`.
- **`aria`:** label icon-only buttons (close `×`, chevrons), mark the scanline
  overlay `aria-hidden` (already done), and give the command palette
  `role="dialog"` + `aria-modal`.

---

## 6. Performance

- **Images are the budget.** There are none yet (gradient placeholders). When real
  photos land: serve from a CDN with responsive `srcset`/`sizes`, lazy-load
  off-screen frames, use blurhash/LQIP for load-in (the existing `FramePlate`
  gradient is a ready-made placeholder), and use modern formats (AVIF/WebP).
- **Code-split by route.** The photo subsystem is the heaviest; don't ship it to
  someone who only reads the blog. Lazy-load `PhotoModal`/`PhotoDetailPage`.
- **Reduce inline-style churn.** Inline-style objects allocate on every render;
  move static styling to CSS classes so React only diffs dynamic bits.
- **Cache API reads** with TanStack Query; pre-fetch likely next routes (e.g. on
  hover of a blog row).
- **Scroll listeners:** `BlogPost` attaches a `scroll` handler for the progress
  bar / frozen title — keep it `passive`, throttle with `requestAnimationFrame`,
  and prefer `IntersectionObserver` for the "frozen" trigger.

---

## 7. State & data flow

- **Server state** (frames, albums, posts, projects, site config) → TanStack Query
  keyed by route/filter params. The filter/search state lives in the **URL**
  (`?tag=street&q=tokyo`) so views are shareable and restorable.
- **UI state** (modal open, palette open, drawer open, copied-toast) → local
  component state; no global store needed for a site this size.
- **Filtering** currently runs client-side (`filterFrames`). Fine while the
  dataset is ~35 frames; push `q`/`tag` to the API once the library grows.
- **Deep-linking:** the prototype passes `navArg` payloads between pages. Replace
  with route params — `/photo/p001` opens that frame's modal/detail directly;
  `/blog/:slug` opens the post.

---

## 8. SEO & metadata

The state-machine prototype has one URL and no per-page metadata — a real problem
for a portfolio. Fix with routing + SSG/SSR:

- Per-route `<title>` and meta description.
- Open Graph / Twitter cards (especially for blog posts and photo detail pages —
  use the frame image as the OG image).
- `/feed.xml` RSS (already advertised in the UI).
- `sitemap.xml` and structured data (`Article` for posts, `ImageObject` for
  frames).
- Pre-render content so crawlers see real HTML, not an empty `#root`.

---

## 9. Project structure (suggested)

```
src/
├─ app/                 # router setup, root layout, providers
├─ components/
│  ├─ primitives/       # Bracket, Tile, Tag, Btn, Kbd, Prompt, Cursor, Status, SectionH, Wordmark
│  ├─ nav/              # Nav, Palette, Footer
│  └─ ...
├─ features/
│  ├─ home/             # Home + sections
│  ├─ about/            # About, BioCat, markdown renderer
│  ├─ blog/             # Blog, BlogPost, PostCode
│  ├─ contact/          # Contact
│  └─ photo/            # Photo orchestrator, views, overlays, shared, data hooks
├─ hooks/               # useViewport, etc.
├─ lib/                 # api client, query keys, formatters
├─ styles/              # tokens.css (from colors_and_type.css), globals
└─ types/               # Frame, Album, Post, Project, Site
```

---

## 10. Definition of done (per component)

- Typed props (no `any`).
- Token-backed styling (no stray hex / magic numbers).
- Keyboard operable + visible focus + correct semantics.
- Loading + error + empty states for anything fetching data
  (`NoResults` is the model for empty; add skeletons for loading).
- Responsive at `mobile`/`narrow`/desktop.
- No reliance on `window.*` globals or in-browser transpilation.

---

## Reference

- Data contracts: `01-backend-api-routes.md`
- Component inventory: `02-react-components.md`
- Design tokens: `colors_and_type.css`
- Working prototype: `Website.html` + `src/*.jsx`
