# Database Schema & Workflow

```text
iz@web:~/site$ sqlite content
```

SQLite is the runtime content source for the Express stand-in and the future
handwritten Go API. This work authors no Go. Migrations and language-neutral SQL
live in `database/`, outside the owner's `backend/` learning project.

## Local commands

Use the supported Node version from `.nvmrc` (22.14+ in Node 22, or Node 24+).
The stand-in uses built-in `node:sqlite`; there is no database daemon or native
npm database extension. Node may print an experimental SQLite warning.

From `frontend/`:

```bash
npm install
npm run dev
npm run db:migrate
npm run db:seed
npm run db:import
npm run db:import -- --photos
npm run db:backup -- --output=/tmp/site-backup.sqlite
npm run test:api
```

These are separate operations, not a sequence to run together. API startup
applies unapplied migrations and seeds **only an empty content database**. Once
seeded, restarting or deploying never overwrites content from JSON. `db:seed`
requires an empty content database and refuses populated or partially populated
content. `db:migrate` applies migrations without seeding.

Default file: `database/local/site.sqlite`. Set `DATABASE_PATH` to override it;
relative paths are resolved from the process working directory. SQLite files,
WAL/SHM sidecars, and `.sqlite` backups are ignored by Git. Do not commit a live
database or store it inside the frontend public directory.

## Tables

The exact columns, constraints, and indexes are defined by
`database/migrations/001_content.sql`.

| Table | Ownership / content |
|---|---|
| `site_settings` | Singleton `id = 1`; email, version, content update date, hero tagline/prompts, now body/cadence/tags |
| `social_links` | Social key, label, URL, explicit display position |
| `about_page` | Singleton `id = 1`; raw Markdown and file-display metadata |
| `posts` | Stable slug, date, category, title, blurb, raw Markdown body |
| `post_tags` | Ordered tags per post; distinct from the single blog filter category |
| `post_selected_work` | Optional one-to-one post opt-in, status, metric, stack, position |
| `projects` | Legacy project routes, stack, status, metric, position, README and its URL |
| `albums` | Stable text ID, title, subtitle, location, nullable date/cover, position |
| `frames` | Stable text ID, album FK, aspect ratio, EXIF display fields, location, nullable date, position |
| `frame_tags` | Ordered unique tags per frame |
| `frame_images` | One-to-one canonical URL, dimensions, filename, optional reviewed alt text, blurhash, placeholder |
| `image_variants` | Frame/image FK, actual positive pixel width, URL, position; unique width per frame |
| `frame_captions` | Optional one-to-one title, ordered paragraphs, optional note |
| `schema_migrations` | Filename/version, SHA-256 checksum, applied timestamp |

Small ordered values that are not independently queried (prompts, now tags,
stacks, caption paragraphs) use JSON-array text with validity/type checks. Tags
used for filters have relational tables. Photos themselves are not BLOBs: image
bytes remain in existing R2/CDN storage.

All tables are `STRICT`. Every connection enables foreign keys and a five-second
busy timeout. File databases use WAL mode. Each migration and content import is
transactional. Applied migrations are immutable; a changed checksum or unknown
newer migration fails startup instead of silently changing a database.

## Relationships and constraints

- A post has ordered tags and zero or one selected-work record.
- An album has many frames; each frame belongs to exactly one album.
- A frame has one imported image record, responsive variants, tags, and zero or
  one caption. Child records cascade when their parent is deleted. The importer
  creates the image record; the reverse one-to-one requirement is not a SQL FK.
- An album cover is nullable. Its composite FK `(cover_frame_id, album.id)`
  references `(frame.id, frame.album_id)`, so another album's frame cannot be
  used as a cover. The FK is deferred until commit to allow albums and their
  frames to be imported in one transaction.
- Post categories are `systems | security | photo | notes`. Project and
  selected-work statuses are `shipped | progress | archived`.
- Dimensions and variant widths must be positive; placeholder hue/lightness
  have range checks. SQL `NULL` represents absent optional image values.
- Known photo dates use `YYYY-MM-DD`; the importer validates actual dates.
  Unknown dates are `NULL`, serialized as the existing `unknown date` fallback.
  EXIF display strings retain their existing safe fallbacks and formatting.
- Slugs/IDs are the public keys. There is no ID renumbering or new multi-album
  relationship to disrupt existing routes.

## Derived values, not columns

`words` and `readMinutes` are calculated from post Markdown at request time by
`frontend/mock-server/reading-stats.js`. The parser strips Markdown structure,
link targets, reference definitions, and raw HTML nodes; it retains visible text,
image alt text, inline code, and fenced code contents. Words are nonempty
whitespace-delimited tokens. Reading minutes are `max(1, ceil(words / 230))`.
The list returns minutes; detail returns minutes and word count. Seed values for
both fields are intentionally ignored.

Album `count`, photo `meta.total`, and `/frames/meta` facets are queried/derived
from the current database. They are not counters requiring manual synchronization.
Deployed build branch/commit/timestamp are runtime metadata from environment/git,
not editorial content; post `commit` uses the same runtime build commit.

## Import and authoring policy

The six existing files under `frontend/mock-server/data/` remain bootstrap/import
fixtures. Requests do not read them. Do not edit JSON and expect a running API
to change until an explicit import succeeds.

`db:import` upserts all fixture records transactionally by their stable keys.
It replaces supplied non-photo content, social links, tags, variants, and
selected-work metadata. Missing posts/projects/albums/frames are **not deleted**.
Existing frame captions and image alt text are preserved, even when null or empty.
Use `--overwrite-editorial` only when intentionally replacing those fields from
the source JSON. Back up first if the database contains hand-edited content.

`db:import -- --photos` reads only albums/frames, leaving site/about/posts/projects
untouched. This follows `photos:seed` or `photos:all`. Use a different source
directory with `--source=/absolute/path/to/seeds`; a full import expects all six
files, while `--photos` requires only `albums.json` and `frames.json`.

There is no public write API or admin UI. For now, edit/import content locally
or use a SQLite client with foreign keys enabled. Explicit removals must be
transactional: clear/change an album cover before deleting its cover frame;
delete an album's frames and album in the same transaction. Take a backup before
manual deletions. Do not use `INSERT OR REPLACE` for upserts: it deletes/recreates
parents and can cascade-delete children. The importer uses `ON CONFLICT UPDATE`.

## Query and response compatibility

The repository adapter is `frontend/mock-server/repository.js`. Existing GET
routes and nested camelCase response fields stay unchanged. SQL statements bind
request values; only internal identifiers and whitelisted sort directions are
interpolated. Repeated scalar query parameters return a JSON 400 error; only
photo tags support repetition.

- Posts filter by category and sort by date; projects filter by status and
  sort by explicit position. Project lists still default to 12 records.
- Photo tags are OR-matched through `EXISTS`, avoiding duplicate result rows.
- Photo `meta.total` counts album-scoped frames **before** tag/search filters
  and limits; it is not the number remaining after filters.
- Album/tag predicates and ordering run in SQL. Search retains the existing
  Unicode-aware JavaScript substring behavior over the candidate rows, including
  caption text, tags, filename, URL, and EXIF. Limit applies after search. This
  intentionally avoids changing the contract to SQLite's ASCII-only `lower()`
  or full-text token matching. A Go implementation should match these semantics.
- Position breaks equal-date ties, preserving fixture ordering. Unknown dates
  retain the existing lexical `unknown date` sort behavior.
- Lists omit post body/tags/words/commit and project README; detail adds them.
- Image variants and tags preserve source ordering. Optional dimensions,
  filename, alt text, and caption note omit SQL nulls; caption itself may be null.
- Responses keep public GET/OPTIONS CORS, cache headers, and JSON 404s. Read
  failures return a non-cacheable generic JSON 500 rather than database details.

Indexes cover post dates/categories, project statuses/order, frame dates/albums,
and tag lookups. Small related collections are assembled with straightforward
queries; no ORM, search engine, cache table, or premature authoring schema.

## Deployment and backups

The image build context is now the **repository root**:

```bash
docker build -f frontend/mock-server/Dockerfile -t mock-api .
```

The Dockerfile-specific allowlist excludes unrelated files, originals, local
databases, and `backend/`. The distroless runtime stays unprivileged (UID 65532).
It uses `/data/site.sqlite`; the Compose file mounts the named `mock-api-data`
volume at `/data`. The fresh image provides the directory with writable ownership.

**Before deploying the first database-backed image**, update the VPS Compose
file from `infrastructure/docker-compose.yml`, including its volume. The polling
updater pulls images but does not copy changed Compose files from this checkout.
On first start the service migrates/seeds; subsequent image updates preserve the
database. New fixture content in an image is not automatically imported.

Explicit photo update in a running container:

```bash
docker compose exec mock-api /nodejs/bin/node /app/database/cli.mjs import --photos
```

Create a consistent live snapshot using `VACUUM INTO`, not `cp` of a live WAL DB:

```bash
docker compose exec mock-api /nodejs/bin/node /app/database/cli.mjs backup --output=/data/backup.sqlite
docker compose cp mock-api:/data/backup.sqlite ./backup.sqlite
```

The destination must not already exist. Copy snapshots off the VPS. A snapshot
in the same volume is not disaster recovery. Continuous Litestream-to-R2 backups
remain planned infrastructure work, not enabled by this change.

Restore procedure: stop the API and any other DB writers, preserve the current
database and its WAL/SHM files together, and place a verified snapshot at the
configured database path with correct ownership. Do not leave old WAL/SHM files
beside the restored DB. Start the API, check `PRAGMA integrity_check` returns
`ok`, check `PRAGMA foreign_key_check` returns no rows, and verify site/photo/post
routes. Test a restore in a separate scratch directory first.

API tests include file reopen, consistent backup restore, integrity/FK checks,
import rollback, editorial preservation, and HTTP compatibility with the JSON
fixtures. Container/remote restore rehearsal still belongs to deployment.

Prerendering still reads the checked-in seeds or an explicit `PRERENDER_DATA_DIR`
snapshot, as before. For database-only editorial changes, supply a matching API
snapshot and rebuild the frontend when updating prerendered HTML; a DB import
alone does not redeploy static metadata. See `06-page-metadata.md`.

## Go handoff

Keep this schema, database file, stable public IDs, and API contract. Implement
Go connections, migration application, queries, Markdown reading-stat parity,
response assembly, and error handling by hand. Enable foreign keys/busy timeout
for every Go connection. Replace the Express image while keeping the persistent
volume. Do not run two different schema writers during cutover. Admin/auth,
contact storage, drafts, and multi-author support are deliberately deferred.
