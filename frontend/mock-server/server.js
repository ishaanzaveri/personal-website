// Tiny mock API server for local dev and the deployed stand-in. Serves the
// public, read-only GET routes from ../docs/01-backend-api-routes.md with seed
// data ported from the prototype. No auth/admin, no /feed.xml, no contact POST.
// CORS is open (public read-only GETs) so the built site can fetch it directly
// from another origin; local dev still works via the Vite proxy.
// Run via `npm run dev` (concurrently) or `npm run dev:api`.
import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const load = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./data/${name}.json`, import.meta.url)), 'utf-8'));

const SITE = load('site');
const ABOUT = load('about');
const PROJECTS = load('projects');
const POSTS = load('posts');
const FRAMES = load('frames');
const ALBUMS = load('albums');

const PORT = process.env.PORT || 8787;
const app = express();

// ---- helpers ---------------------------------------------------------------

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const byDateAsc = (a, b) => -byDateDesc(a, b);

// `sort` defaults to -date (newest first, the UI's "ls -t"); `date` flips it.
function applySort(list, sort) {
  const sorted = [...list];
  sorted.sort(sort === 'date' ? byDateAsc : byDateDesc);
  return sorted;
}

function applyLimit(list, limit) {
  const n = Number.parseInt(limit, 10);
  return Number.isFinite(n) && n > 0 ? list.slice(0, n) : list;
}

// Normalize a repeatable query param into an array (?tag=a&tag=b or ?tag=a).
function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function notFound(res, message) {
  res.status(404).json({ error: { code: 'not_found', message } });
}

// Open CORS for the public read-only API: any origin may GET. No credentials are
// used, so a wildcard origin is safe and simplest. Answer preflights here so the
// catch-all 404 below never shadows an OPTIONS request.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.set('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Light caching touch, matching the docs' recommendation for public GETs.
app.use((_req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
  next();
});

// ---- site / about ----------------------------------------------------------

app.get('/api/site', (_req, res) => res.json(SITE));
app.get('/api/about', (_req, res) => res.json(ABOUT));

// ---- projects --------------------------------------------------------------

// List omits the heavy `readme`; detail includes it.
const projectListItem = ({ readme, ...rest }) => rest;

app.get('/api/projects', (req, res) => {
  let list = PROJECTS.map(projectListItem);
  if (req.query.status) list = list.filter((p) => p.status === req.query.status);
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(applyLimit(list, req.query.limit ?? 12));
});

app.get('/api/projects/:slug', (req, res) => {
  const project = PROJECTS.find((p) => p.slug === req.params.slug);
  if (!project) return notFound(res, `no project '${req.params.slug}'`);
  res.json(project);
});

// ---- blog ------------------------------------------------------------------

const postListItem = ({ body, words, commit, tags, ...rest }) => rest;

app.get('/api/posts', (req, res) => {
  let list = POSTS.map(postListItem);
  if (req.query.tag && req.query.tag !== 'all') {
    list = list.filter((p) => p.tag === req.query.tag);
  }
  list = applySort(list, req.query.sort);
  res.json(applyLimit(list, req.query.limit));
});

app.get('/api/posts/:slug', (req, res) => {
  const post = POSTS.find((p) => p.slug === req.params.slug);
  if (!post) return notFound(res, `no post '${req.params.slug}'`);
  res.json(post);
});

// ---- photography -----------------------------------------------------------

app.get('/api/albums', (_req, res) => {
  res.json({ data: ALBUMS, meta: { total: ALBUMS.length } });
});

app.get('/api/albums/:id', (req, res) => {
  const album = ALBUMS.find((a) => a.id === req.params.id);
  if (!album) return notFound(res, `no album '${req.params.id}'`);
  const frames = applySort(FRAMES.filter((f) => f.album === album.id), '-date');
  res.json({ ...album, frames, meta: { total: frames.length } });
});

// Free-text search across id, camera, lens, location, EXIF, tags (mirrors filterFrames).
function matchesQuery(frame, q) {
  if (!q) return true;
  const caption = frame.caption
    ? [frame.caption.title, ...(frame.caption.paragraphs || []), frame.caption.note].filter(Boolean)
    : [];
  const hay = [
    frame.id, frame.camera, frame.lens, frame.aperture, frame.shutter,
    frame.iso, frame.location, frame.date, frame.image?.filename, frame.image?.src,
    ...(frame.tags || []), ...caption,
  ].join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

// NOTE: register /api/frames/meta before /api/frames/:id so it isn't shadowed.
app.get('/api/frames/meta', (_req, res) => {
  const tags = [...new Set(FRAMES.flatMap((f) => f.tags))].sort();
  const locations = [...new Set(FRAMES.map((f) => f.location.split(' · ')[0]))].sort();
  const cameras = [...new Set(FRAMES.map((f) => f.camera))].sort();
  res.json({ tags, locations, cameras });
});

app.get('/api/frames', (req, res) => {
  const tags = asArray(req.query.tag);
  const q = req.query.q || '';
  let list = FRAMES;
  if (req.query.album) list = list.filter((f) => f.album === req.query.album);
  // `total` is the scope size (after album scoping, before tag/q filters), so
  // the gallery can show "N frames / total".
  const total = list.length;
  if (tags.length) list = list.filter((f) => tags.some((t) => f.tags.includes(t))); // OR-match
  if (q) list = list.filter((f) => matchesQuery(f, q));
  list = applySort(list, req.query.sort);
  list = applyLimit(list, req.query.limit);
  res.json({ data: list, meta: { total, filteredBy: { tag: tags, q } } });
});

app.get('/api/frames/:id', (req, res) => {
  const frame = FRAMES.find((f) => f.id === req.params.id);
  if (!frame) return notFound(res, `no frame '${req.params.id}'`);
  res.json(frame);
});

// ---- fallthrough -----------------------------------------------------------

app.use('/api', (_req, res) => notFound(res, 'unknown endpoint'));

app.listen(PORT, () => {
  console.log(`mock-api listening on http://localhost:${PORT}`);
});
