import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pageMetadata, publicPath, serializeStructured, siteOrigin } from '../src/lib/pageMetadata.mjs';
import { loadSnapshot, prerender, publicRoutes, renderPage } from './prerender.mjs';

const origin = 'https://portfolio.example';
const template = '<html><head><title>default</title><meta name="description" content="default"></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';
const data = await loadSnapshot();

test('public posts and photos receive canonical, social and structured metadata', () => {
  const post = data.posts[0];
  const metadata = pageMetadata(`/blog/${post.slug}`, data, origin);
  assert.equal(metadata.canonical, `${origin}/blog/${post.slug}`);
  assert.equal(metadata.description, post.blurb);
  assert.equal(metadata.structured['@type'], 'Article');
  assert.equal(metadata.noindex, false);
  const photo = pageMetadata(`/photo/${data.frames[0].id}`, data, origin);
  assert.equal(photo.image, data.frames[0].image.src);
  assert.equal(photo.structured['@type'], 'ImageObject');
});

test('unknown and ordinary routes do not inherit prior photo metadata', () => {
  for (const route of ['/contact', '/does-not-exist']) {
    const metadata = pageMetadata(route, data, origin);
    assert.equal(metadata.image, undefined);
    assert.equal(metadata.structured, undefined);
    assert.equal(metadata.noindex, route === '/does-not-exist');
  }
});

test('site origin and output routes reject credentials, traversal, and non-web schemes', () => {
  for (const value of ['javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/sub', 'https://example.com?query']) assert.throws(() => siteOrigin(value));
  for (const id of ['../escape', 'a/b', '%2f', '.']) assert.throws(() => publicPath('blog', id));
  assert.throws(() => publicRoutes({ ...data, posts: [data.posts[0], data.posts[0]] }), /duplicate/);
});

test('static HTML contains readable article text and preserves the client entrypoint', () => {
  const html = renderPage(template, `/blog/${data.posts[0].slug}`, data, origin);
  assert.match(html, /<main id="main-content"><article>/);
  assert.match(html, /The site stopped being a wall/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /src="\/assets\/app.js"/);
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
  assert.equal((html.match(/name="description"/g) ?? []).length, 1);
});

test('HTML, Markdown and JSON-LD cannot escape their contexts', () => {
  const malicious = { ...data.posts[0], title: '</script><script>alert(1)</script> $&', blurb: '"><img src=x onerror=alert(1)>', body: '<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n**still readable**' };
  const html = renderPage(template, `/blog/${malicious.slug}`, { ...data, posts: [malicious] }, origin);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /<strong>still readable<\/strong>/);
  const json = html.match(/type="application\/ld\+json">([^]*?)<\/script>/)[1];
  assert.equal(JSON.parse(json).headline, malicious.title);
  assert.doesNotMatch(serializeStructured({ value: '</script>\u2028\u2029' }), /[<\u2028\u2029]/);
});

test('postbuild writes every nested route and a readable home document', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'portfolio-prerender-'));
  try {
    await writeFile(path.join(directory, 'index.html'), template);
    await prerender({ directory, origin });
    for (const route of publicRoutes(data)) {
      const html = await readFile(path.join(directory, route.slice(1), 'index.html'), 'utf8');
      assert.match(html, /<main id="main-content">/);
      assert.ok(html.includes(`href="${origin}${route}"`));
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
