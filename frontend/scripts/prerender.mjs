import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { pageMetadata, publicPath, safeUrl, serializeStructured, siteOrigin } from '../src/lib/pageMetadata.mjs';

const h = React.createElement;
const ROOT = fileURLToPath(new URL('..', import.meta.url));

export async function loadSnapshot(directory = path.join(ROOT, 'mock-server/data')) {
  const entries = await Promise.all(['site', 'about', 'posts', 'frames', 'albums'].map(async (name) => [name, JSON.parse(await readFile(path.join(directory, `${name}.json`), 'utf8'))]));
  return Object.fromEntries(entries);
}

function markdown(source) {
  return h(ReactMarkdown, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSanitize] }, source ?? '');
}

export function publicRoutes(data) {
  const routes = ['/', '/about', '/blog', '/contact', '/photo', '/photo/albums',
    ...data.posts.map((post) => publicPath('blog', post.slug)),
    ...data.albums.map((album) => publicPath('photo/albums', album.id)),
    ...data.frames.map((frame) => publicPath('photo', frame.id))];
  if (new Set(routes).size !== routes.length) throw new Error('duplicate public route in content snapshot');
  return routes;
}

function frameImage(frame, origin) {
  const src = safeUrl(frame.image.src, origin);
  const alt = frame.image.alt || (frame.caption?.note?.startsWith('// generated from ') ? undefined : frame.caption?.title) || `Photograph from ${frame.location}, ${frame.date}`;
  return src ? h('img', { src, alt, width: frame.image.width, height: frame.image.height, loading: 'lazy', style: { maxWidth: '100%', height: 'auto' } }) : h('p', null, alt);
}

export function renderContent(route, data, origin) {
  const post = data.posts.find((entry) => publicPath('blog', entry.slug) === route);
  const frame = data.frames.find((entry) => publicPath('photo', entry.id) === route);
  const album = data.albums.find((entry) => publicPath('photo/albums', entry.id) === route);
  const links = (items, section, label) => h('ul', null, items.map((item) => h('li', { key: item.id ?? item.slug }, h('a', { href: publicPath(section, item.id ?? item.slug) }, label(item)))));
  const photos = (items) => h('div', null, items.map((item) => h('figure', { key: item.id }, h('a', { href: publicPath('photo', item.id) }, frameImage(item, origin)), h('figcaption', null, `${item.location} · ${item.date}`))));
  let content;
  if (post) content = h('article', null, h('h1', null, post.title), h('p', null, post.date), markdown(post.body));
  else if (frame) content = h('article', null, h('h1', null, frame.caption?.title ?? `photo · ${frame.id}`), frameImage(frame, origin), h('p', null, `${frame.location} · ${frame.date}`), ...(frame.caption?.paragraphs ?? []).map((text, i) => h('p', { key: i }, text)));
  else if (album) content = h('section', null, h('h1', null, album.title), h('p', null, album.subtitle), photos(data.frames.filter((item) => item.album === album.id)));
  else if (route === '/about') content = h('section', null, h('h1', null, 'about · bio'), markdown(data.about.source));
  else if (route === '/blog') content = h('section', null, h('h1', null, 'blog · writing'), links(data.posts, 'blog', (item) => item.title));
  else if (route === '/photo/albums') content = h('section', null, h('h1', null, 'photo · albums'), links(data.albums, 'photo/albums', (item) => item.title));
  else if (route === '/photo') content = h('section', null, h('h1', null, 'photo · gallery'), photos(data.frames));
  else if (route === '/contact') content = h('section', null, h('h1', null, 'contact'), data.site.email ? h('p', null, h('a', { href: `mailto:${data.site.email}` }, data.site.email)) : null, h('ul', null, data.site.socials.map((social) => h('li', { key: social.key }, h('a', { href: safeUrl(social.url, origin) }, social.label)))));
  else content = h('section', null, h('h1', null, 'Ishaan Zaveri'), h('p', null, data.site.hero.tagline), h('h2', null, 'now'), h('p', null, data.site.now.body), h('h2', null, 'selected work'), links(data.posts.filter((item) => item.selectedWork?.enabled), 'blog', (item) => item.title));
  return renderToStaticMarkup(h('div', { className: 'doc' }, h('nav', { 'aria-label': 'Main navigation' }, ...[['/', 'Home'], ['/about', 'About'], ['/blog', 'Blog'], ['/photo', 'Photo'], ['/contact', 'Contact']].map(([href, label]) => h('a', { key: href, href, style: { marginRight: '1em' } }, label))), h('main', { id: 'main-content' }, content)));
}

export function renderPage(template, route, data, origin) {
  const metadata = pageMetadata(route, data, origin);
  const metas = [
    ['name', 'description', metadata.description],
    ['property', 'og:title', metadata.title], ['property', 'og:description', metadata.description],
    ['property', 'og:type', metadata.type], ['property', 'og:url', metadata.canonical],
    ['name', 'twitter:card', metadata.image ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', metadata.title], ['name', 'twitter:description', metadata.description],
    ...(metadata.image ? [['property', 'og:image', metadata.image], ['name', 'twitter:image', metadata.image]] : []),
  ];
  const head = renderToStaticMarkup(h(React.Fragment, null, h('title', null, metadata.title), h('link', { rel: 'canonical', href: metadata.canonical }), ...metas.map(([attribute, key, content]) => h('meta', { key, [attribute]: key, content })), metadata.structured ? h('script', { id: 'page-structured-data', type: 'application/ld+json', dangerouslySetInnerHTML: { __html: serializeStructured(metadata.structured) } }) : null));
  if (!template.includes('<div id="root"></div>')) throw new Error('prerender expects a fresh Vite build with an empty #root');
  return template.replace(/<title>[^]*?<\/title>/, '').replace(/<meta\s+name="description"[^>]*>/, '').replace('</head>', () => `${head}\n</head>`).replace('<div id="root"></div>', () => `<div id="root">${renderContent(route, data, origin)}</div>`);
}

export async function prerender({ directory = path.join(ROOT, 'dist'), snapshotDirectory = process.env.PRERENDER_DATA_DIR, origin = process.env.SITE_URL } = {}) {
  origin = siteOrigin(origin);
  const data = await loadSnapshot(snapshotDirectory ? path.resolve(snapshotDirectory) : undefined);
  const template = await readFile(path.join(directory, 'index.html'), 'utf8');
  const routes = publicRoutes(data);
  // Render everything first, so invalid content fails before replacing output.
  const pages = routes.map((route) => [route, renderPage(template, route, data, origin)]);
  for (const [route, html] of pages) {
    const destination = path.join(directory, route.slice(1), 'index.html');
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html);
  }
  console.log(`prerendered ${routes.length} public routes from ${snapshotDirectory ?? 'checked-in mock API seeds'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prerender();
