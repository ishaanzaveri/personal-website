# React Components

A catalogue of every React component needed to implement the site, grouped by
layer. Names follow the existing prototype (`Website.html` + `src/*.jsx`). The
prototype loads React 18 from a CDN and transpiles JSX in-browser with Babel; this
doc describes the components themselves, independent of that delivery mechanism.

Legend
- **Source** — where it lives in the prototype.
- **Props** — the public interface a production rebuild should preserve.

---

## 1. Application shell

### `App`
Root component. Owns top-level state and routing-by-state.
- **Source:** inline `<script>` in `Website.html`
- **State:** `page` (`home | about | blog | photo | contact`), `navArg`
  (deep-link payload), `palOpen`, plus `tweaks`.
- **Responsibilities:** `go(page, arg)` navigation, global keyboard shortcuts
  (`⌘K`, the two-key `g`+letter "go" chords), scroll-to-top on page change,
  renders `Nav`, the active view, footer, `Palette`, and `TweaksPanel`.
- **Rebuild note:** replace the `views` object + `page` state with a real router
  (`react-router`/file-based routing). `navArg` becomes route params/query.

### `Nav`
Sticky top navigation bar with responsive mobile drawer.
- **Source:** `src/components.jsx`
- **Props:** `active` (current page id), `onNav(id)`
- **Behavior:** desktop shows inline links (`./about`, `./blog`, `./photo`,
  `./contact`) + `⌘K` hint; mobile collapses to a `[ ≡ ]` hamburger that opens a
  dropdown drawer. Uses `useViewport`.

### `Palette` (⌘K command menu)
Fuzzy "jump to" overlay opened with ⌘/Ctrl-K.
- **Source:** inline in `Website.html`
- **Props:** `onNav(id)`, `onClose()`
- **Behavior:** text filter over nav targets, arrow-key selection, Enter to
  navigate, Esc to close.

### `Footer`
Terminal-prompt footer with build info + social links. Currently inline markup in
`App`; extract into its own component fed by `GET /api/site`.

---

## 2. Design-system primitives

All in `src/components.jsx`. These are the reusable vocabulary; every page is built
from them.

| Component | Props | Purpose |
|---|---|---|
| `Wordmark` | `variant` (`primary`\|`compact`\|`monogram`), `size` | Brand logo. `primary` is an ASCII-box SVG, others are inline text. |
| `Bracket` | `children`, `style`, …rest | Panel with hairline corner brackets (the signature card frame). |
| `Tile` | `children`, `style`, …rest | Plain bordered panel with hover transition. |
| `Tag` | `children`, `color` | Small uppercase outlined chip. |
| `Btn` | `variant` (`default`\|`pri`\|`ghost`\|`warn`\|`danger`), `size` (`sm`\|`md`\|`lg`) | Button. |
| `Kbd` | `children` | Keycap glyph (used for `⌘`, `K`, etc.). |
| `Prompt` | `path`, `children` | Renders `iz@web:~/path$` shell prompt. |
| `Cursor` | — | Blinking block cursor. |
| `Status` | `kind` (`shipped`\|`progress`\|`archived`) | Colored status dot + label. |
| `SectionH` | `num`, `title`, `side` | Numbered section header with dashed rule. |

### Hook: `useViewport`
- **Source:** `src/components.jsx`
- **Returns:** `{ w, mobile (<760), narrow (<980) }`. The single source of truth
  for responsive breakpoints across the app.

### Hook: `useTweaks`
- Referenced by `App`/`TweaksPanel` (prototype-only). Persists the live tweak
  values (hero prompt, section toggles, scanlines). **Omit in production** unless
  you keep the design playground.

---

## 3. Page views

### `Home`
- **Source:** `src/Home.jsx`
- **Props:** `onNav`, `tweaks`
- **Composes:** hero (`Prompt` + `Cursor`), CTA `Btn` row, a 4-up meta `<dl>`,
  the 3-column "now / jump-to / shortcuts" row (`Bracket` + two `Tile`s), the
  "selected work" grid (`Tile` + `Status` + `Tag`), the "recent frames" masonry
  (`FramePlate`), and the "writing" list (`Bracket` + post rows).
- **Data:** projects, frames (first 6), recent posts. Deep-links into `./photo`
  and `./blog` via `onNav(page, arg)`.

### `About`
- **Source:** `src/About.jsx`
- **Props:** none
- **Sub-components (same file):**
  - `BioCat` — renders the bio as a numbered markdown "source file".
  - `FileBar` — mac-style window title bar (3 dots + path + right meta).
  - `ExtLink` — external link with hover styling.
  - `parseInline` / `renderLine` — the inline markdown tokenizer (code, links,
    bold, italic, headings, blockquote, lists). **In production, prefer a vetted
    markdown renderer** over this hand-rolled parser.

### `Blog`
- **Source:** `src/Blog.jsx`
- **Props:** `target` (deep-link `{ type:'post', title }`)
- **State:** `active` (tag filter), `openPost`
- **Composes:** header, the `grep ›` tag-filter pill row, and the post list
  (`article.post-row`). When a post is opened it renders `BlogPost` in place.

### `BlogPost`
- **Source:** `src/BlogPost.jsx`
- **Props:** `post`, `onBack`
- **Behavior:** scroll-driven UI — a fixed reading-progress bar and a condensed
  "frozen" title pane that sticks under the nav once the hero scrolls past.
  Renders a typed block body (`p`, `h`, `ol`, `code`, `quote`).
- **Sub-component:** `PostCode` — bracketed code panel with line numbers + comment
  styling.

### `Contact`
- **Source:** `src/Contact.jsx`
- **Props:** none
- **Behavior:** email display with copy-to-clipboard (`copied ✓` toast state),
  PGP button, and a socials list. Built from two `Bracket`s + `Btn` + `Kbd`.

---

## 4. Photography subsystem

The most component-rich area. Orchestrated by `Photo`, which manages views,
filters, and two overlay types (modal + full-detail page).

### `Photo` (orchestrator)
- **Source:** `src/Photo.jsx`
- **Props:** `target` (deep-link `{ type:'frame', id }`)
- **State:** `view` (`gallery | albums | album`), `albumId`, `query`, `tags`,
  `modal` (`{ list, id }`), `detail` (`{ list, id }`).
- **Behavior:** derives the visible frame set, owns prev/next stepping for both
  overlays, and switches the whole view to `PhotoDetailPage` when a frame is
  expanded.

### View components (in `src/Photo.jsx`)
| Component | Purpose |
|---|---|
| `GalleryView` | All-photos masonry + search band + result meta. |
| `AlbumsView` | List of album teasers + a "JUMP" chip row. |
| `AlbumTeaserBlock` | One album preview: hero frame + 3-up peek grid. |
| `AlbumView` | Opened album: 21:9 hero band, scoped search, masonry, prev/next album nav. |
| `HeroStat` | Label/value pair in the album hero band. |

### Shared photo pieces (in `src/photo/live/PhotoShared.jsx`)
| Component | Props | Purpose |
|---|---|---|
| `MasonryFrame` | `f`, `onOpen` | Clickable masonry tile with hover EXIF veil. |
| `PhotoSubNav` | `active`, `crumb`, `onNav` | `gallery` / `albums` tab bar + breadcrumb. |
| `SearchBand` | `query`, `onQuery`, `activeTags`, `onToggleTag`, `onClear`, `scope`, `onClearScope` | Search input + tag chips + album scope pill. |
| `ResultMeta` | `count`, `total`, `cols` | "N frames / total · masonry · columns" line. |
| `NoResults` | `onClear` | Empty-state for filters matching nothing. |
| `filterFrames(list, q, tags)` | — | Pure filter helper (move server-side eventually). |
| `captionFor(f)` | — | Returns hand-written or synthesized caption. |

### Overlays
- `PhotoModal` (`src/photo/live/PhotoModal.jsx`) — borderless full-viewport
  lightbox rendered via `ReactDOM.createPortal`. Props: `frame`, `index`,
  `total`, `onClose`, `onPrev`, `onNext`, `onExpand`. Locks body scroll; Esc/←/→
  keyboard nav; floating EXIF pill; "EXPAND · FULL DETAIL" button.
- `PhotoDetailPage` (`src/photo/live/PhotoDetail.jsx`) — editorial full-page view.
  Props: `frame`, `index`, `total`, `onPrev`, `onNext`, `onBack`, `onOpenFrame`.
  Letterboxed photo stage, title block, big-stat EXIF strip (`BigStat`), the
  written story, tags, and a "MORE FROM /album" related strip.

### Data layer (`src/photo/data.jsx`)
- `FramePlate` — gradient placeholder surface for a frame (replace with a real
  `<img>` + blurhash once photos exist; keep as the loading shim).
- `frameBg(f)` — deterministic OKLCH gradient from a frame's hue/lightness.
- `FRAMES`, `ALBUMS`, and derived `FRAMES_BY_ID`, `FRAMES_BY_ALBUM`, `ALL_TAGS`,
  `ALL_LOCATIONS`, `ALL_CAMERAS` — **all of this should come from the API**
  (`/api/frames`, `/api/albums`, `/api/frames/meta`) rather than ship in the bundle.

---

## 5. Decorative / chrome

- **Scanlines overlay** (`.scan`) — fixed CRT scanline layer, toggleable.
- **`TweaksPanel` / `TweakSection` / `TweakToggle` / `TweakRadio`** — the live
  design-playground panel (`tweaks-panel.jsx`). Prototype tooling only; **exclude
  from production** unless you want a public theme switcher.

---

## Component tree (production target)

```
App / Router
├─ Nav
├─ Palette (⌘K)
├─ <route: home>      Home
│                     ├─ Prompt, Cursor, Btn, Tag, Bracket, Tile, SectionH, Status
│                     ├─ FramePlate (recent frames)
│                     └─ post rows
├─ <route: about>     About → BioCat → FileBar, ExtLink, (markdown renderer)
├─ <route: blog>      Blog → SectionH, tag pills, post rows
├─ <route: blog/:slug> BlogPost → PostCode, progress bar, frozen title
├─ <route: photo>     Photo (orchestrator)
│   ├─ PhotoSubNav
│   ├─ GalleryView → SearchBand, ResultMeta, MasonryFrame, NoResults
│   ├─ AlbumsView  → AlbumTeaserBlock
│   ├─ AlbumView   → HeroStat, SearchBand, MasonryFrame
│   ├─ PhotoModal (portal)
│   └─ PhotoDetailPage → BigStat, related strip
├─ <route: contact>  Contact → Bracket, Btn, Kbd
└─ Footer
```

## Build priority

1. **Primitives + `useViewport`** — everything depends on them.
2. **Shell** (`App`/router, `Nav`, `Footer`, `Palette`).
3. **Home, About, Contact** — simplest data needs.
4. **Blog + BlogPost.**
5. **Photo subsystem** — most components, most interaction; build last.
