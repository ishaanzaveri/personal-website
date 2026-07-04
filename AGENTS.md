# AGENTS.md

Repo-wide guidance for AI agents (Claude Code, Codex, etc.) working in this
repository. Read this first. For deeper context, `README.md` is the human
overview and `docs/` is the contract.

## What this repo is

A terminal/CRT-themed personal portfolio for **Ishaan Zaveri**, with two
equally load-bearing goals:

1. **Ship the site** — a fast, read-mostly React portfolio with a real photo
   section (Home · About · Blog · Photo · Contact).
2. **Learn Go** — the API is a deliberate hand-built learning project.

## The one rule that matters most

**Do not write the Go backend.** Everything in `backend/` is handwritten by the
owner on purpose — writing Go there defeats the entire point of the project. If a
task would have you implement, scaffold, or "help along" the Go API, stop and ask
instead. You may *read* `backend/`, discuss design, review handwritten Go, or edit
the docs/spec that describe it — but the implementation is not yours to author.

Rule of thumb: **if it's not in `backend/`, it's fair game for AI; the Go backend
is the owner's.**

## Layout

```
personal-website/
├─ frontend/   # React app (built) + Express mock API + design tokens
│  └─ CLAUDE.md   # ← authoritative guide for any work under frontend/
├─ backend/    # the Go API — empty, handwritten by the owner (see rule above)
├─ docs/       # the contract: API routes, components, guidelines, hosting
└─ README.md   # human-facing overview
```

- **Working in `frontend/`?** `frontend/CLAUDE.md` is the source of truth for
  stack, conventions, hard rules, and build order. Follow it.
- **Working in `docs/`?** `docs/index.md` indexes the whole contract. The docs
  *are* the spec the frontend and (eventual) Go backend are built to — keep them
  accurate.

## Docs

Everything — the API contract, component inventory, frontend guidelines, hosting
architecture, and decision records — lives in `docs/`. If you need any of it,
start at `docs/index.md`, which indexes the whole set.

## Dev commands

```bash
cd frontend
npm install
npm run dev       # Vite (:5173) + Express mock API (:8787) concurrently
npm run dev:web   # Vite only
npm run dev:api   # mock API only
npm run build     # tsc -b && vite build (typecheck + production build)
npm run preview   # preview the production build
npm run lint      # eslint
```

The mock server (`frontend/mock-server/`) is a stand-in for the Go backend — it
serves the same routes from JSON seed files. Don't confuse it for the real thing.

## Voice & aesthetic

The terminal aesthetic is deliberate: JetBrains Mono everywhere, ASCII brackets,
shell prompts (`iz@web:~/site$`), blinking cursors, scanline overlay, `◢`/`▸`
glyphs. Preserve this voice in any new UI, docs, or copy.

## Working conventions

- **Branch, don't commit to `main`.** Work on a feature branch.
- **Small, focused commits.** One logical change per commit rather than batching.
- **Commit trailer:** end messages with the `Co-Authored-By` trailer (see
  `git log` for the exact format).
- **No hardcoded content.** Views are data-driven from the API; don't inline
  content arrays into JSX.
- **Match the surrounding code.** Mirror existing naming, comment density, and
  idioms rather than importing your own.

## Transparency

AI authorship is disclosed in the README: the frontend, docs, and tooling are
AI-generated (directed and reviewed by the owner); the Go backend is not. Keep
that line honest — see the rule at the top.
