import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { openDatabase } from '../../database/db.mjs';
import { importContent, readSeeds } from '../../database/import.mjs';
import { createApp } from './server.js';
import { readingStats } from './reading-stats.js';

const source = readSeeds();
const build = { branch: 'test', commit: 'abc123', lastCommit: '2026-01-01T00:00:00Z' };

async function setup(context, data = source) {
  const database = openDatabase(':memory:');
  importContent(database, data);
  const server = createApp(database, build).listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    database.close();
  });
  const request = (route, options) => fetch(`http://127.0.0.1:${server.address().port}/api${route}`, options);
  const json = async (route) => {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    return response.json();
  };
  return { database, request, json };
}

const sorted = (list, ascending = false) => [...list].sort((first, second) => {
  const comparison = first.date < second.date ? 1 : first.date > second.date ? -1 : 0;
  return ascending ? -comparison : comparison;
});

test('public API preserves the seeded site/about/project/post shapes', async (context) => {
  const { json } = await setup(context);
  assert.deepEqual(await json('/site'), { ...source.site, build });
  assert.deepEqual(await json('/about'), source.about);
  const projects = source.projects.map(({ readme, ...project }) => project).sort((first, second) => first.order - second.order);
  assert.deepEqual(await json('/projects'), projects.slice(0, 12));
  for (const project of source.projects) assert.deepEqual(await json(`/projects/${project.slug}`), project);
  const posts = sorted(source.posts).map(({ body, words, commit, tags, readMinutes, ...post }) => ({ ...post, readMinutes: readingStats(body).readMinutes }));
  assert.deepEqual(await json('/posts'), posts);
  for (const post of source.posts) {
    assert.deepEqual(await json(`/posts/${post.slug}`), { ...post, ...readingStats(post.body), commit: build.commit });
  }
});

test('photo APIs preserve every seeded image, caption, count, and facet', async (context) => {
  const { json } = await setup(context);
  assert.deepEqual(await json('/albums'), { data: source.albums, meta: { total: source.albums.length } });
  assert.deepEqual(await json('/frames'), { data: sorted(source.frames), meta: { total: source.frames.length, filteredBy: { tag: [], q: '' } } });
  for (const album of source.albums) {
    const frames = sorted(source.frames.filter((frame) => frame.album === album.id));
    assert.deepEqual(await json(`/albums/${album.id}`), { ...album, frames, meta: { total: frames.length } });
  }
  for (const frame of source.frames) assert.deepEqual(await json(`/frames/${frame.id}`), frame);
  assert.deepEqual(await json('/frames/meta'), {
    tags: [...new Set(source.frames.flatMap((frame) => frame.tags))].sort(),
    locations: [...new Set(source.frames.map((frame) => frame.location.split(' · ')[0]))].sort(),
    cameras: [...new Set(source.frames.map((frame) => frame.camera))].sort(),
  });
});

test('filters, OR tags, search, limits, sorting, and SQL-like input keep existing semantics', async (context) => {
  const data = structuredClone(source);
  data.posts.push({ ...data.posts[0], slug: 'older-post', date: '2000-01-01', tag: 'systems' });
  data.frames[0].caption.title = 'Montréal — reviewed caption';
  const { json } = await setup(context, data);
  assert.equal((await json('/posts?sort=date&limit=1'))[0].slug, 'older-post');
  assert.deepEqual((await json('/posts?tag=systems')).map((post) => post.slug), ['older-post']);
  assert.equal((await json('/posts?tag=all')).length, 2);
  assert.equal((await json('/posts?limit=999999999999999999999999')).length, 2);
  assert.equal((await json('/projects?limit=999999999999999999999999')).length, data.projects.length);
  assert.deepEqual(await json('/projects?status=archived'), []);
  const frame = data.frames[0];
  const path = `/frames?album=${frame.album}&tag=${frame.tags[0]}&tag=nonexistent&sort=date&limit=2`;
  const expected = sorted(data.frames.filter((item) => item.album === frame.album && item.tags.includes(frame.tags[0])), true).slice(0, 2);
  assert.deepEqual(await json(path), { data: expected, meta: {
    total: data.frames.filter((item) => item.album === frame.album).length,
    filteredBy: { tag: [frame.tags[0], 'nonexistent'], q: '' },
  } });
  assert.deepEqual(await json(path.replace('/frames?', '/frames/?')), await json(path));
  assert.deepEqual((await json('/frames?q=MONTR%C3%89AL')).data.map((item) => item.id), [frame.id]);
  assert.equal((await json('/frames?limit=0')).data.length, data.frames.length);
  assert.equal((await json('/frames?limit=2abc')).data.length, 2);
  assert.deepEqual((await json('/frames?q=%25')).data, []);
  assert.deepEqual((await json('/frames?album=%27%20OR%201%3D1--')).data, []);
  assert.deepEqual((await json('/frames?tag=%27%20OR%201%3D1--')).data, []);
});

test('requests query current database content and compute counts and reading statistics', async (context) => {
  const { database, json } = await setup(context);
  const post = source.posts[0];
  database.prepare('UPDATE posts SET body = ? WHERE slug = ?').run('one two three', post.slug);
  assert.equal((await json(`/posts/${post.slug}`)).words, 3);
  assert.equal((await json('/posts'))[0].readMinutes, 1);
  database.prepare('UPDATE posts SET body = ? WHERE slug = ?').run(Array(231).fill('word').join(' '), post.slug);
  assert.equal((await json('/posts'))[0].readMinutes, 2);
  const frame = source.frames.find((item) => !source.albums.some((album) => album.coverFrameId === item.id));
  database.prepare('DELETE FROM frames WHERE id = ?').run(frame.id);
  const album = await json(`/albums/${frame.album}`);
  assert.equal(album.count, source.frames.filter((item) => item.album === frame.album).length - 1);
  assert.equal(album.count, album.frames.length);
});

test('optional photo metadata and unknown dates retain API fallbacks', async (context) => {
  const data = structuredClone(source);
  const frame = data.frames[0];
  frame.date = 'unknown date';
  frame.caption = null;
  frame.image = { src: null, blurhash: null, placeholder: { hue: 0, lightness: 0 } };
  const { json } = await setup(context, data);
  assert.deepEqual(await json(`/frames/${frame.id}`), { ...frame, image: { ...frame.image, variants: [] } });
  assert.equal((await json('/frames')).data[0].id, frame.id);
});

test('HTTP headers, missing records, malformed queries, and unsupported writes', async (context) => {
  const { request } = await setup(context);
  for (const route of ['/posts/missing', '/projects/missing', '/albums/missing', '/frames/missing', '/missing']) {
    const response = await request(route);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'not_found');
  }
  const response = await request('/site');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300, stale-while-revalidate=86400');
  assert.equal((await request('/site', { method: 'OPTIONS' })).status, 204);
  assert.equal((await request('/contact', { method: 'POST' })).status, 404);
  for (const route of ['/frames?q=one&q=two', '/frames?limit=1&limit=2', '/posts?tag=notes&tag=photo']) {
    assert.equal((await request(route)).status, 400);
  }
});

test('reading statistics exclude Markdown syntax and link targets, include code and image alt', () => {
  assert.deepEqual(readingStats(''), { words: 0, readMinutes: 1 });
  assert.deepEqual(readingStats('# Hello **world**\n\n[Read this](https://example.com/long-url) ![a photograph](image.jpg)\n\n```js\nconst example = true;\n```'), { words: 10, readMinutes: 1 });
  assert.equal(readingStats('a**b**c and `inline`\n\n[ref]: https://example.com\n\n<!-- hidden words -->').words, 3);
  assert.equal(readingStats('one  \ntwo').words, 2);
  assert.equal(readingStats('| first | second |\n| --- | --- |\n| third | fourth |').words, 4);
});
