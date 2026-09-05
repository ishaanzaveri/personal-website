const DEFAULT_ORIGIN = 'https://ishaanzaveri.com';

export function siteOrigin(value = DEFAULT_ORIGIN) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must be an http(s) origin without credentials, path, query, or fragment');
  }
  return url.origin;
}

export function publicPath(section, id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new Error(`unsafe public route id: ${id}`);
  return `/${section}/${id}`;
}

export function safeUrl(value, origin) {
  if (!value) return undefined;
  try {
    const url = new URL(value, origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

function summary(value) {
  return String(value ?? '').replace(/[`#*_>]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function pageMetadata(pathname, data = {}, origin = DEFAULT_ORIGIN) {
  origin = siteOrigin(origin);
  const path = pathname.replace(/\/+$/, '') || '/';
  const post = (data.posts ?? []).find((entry) => publicPath('blog', entry.slug) === path);
  const frame = (data.frames ?? []).find((entry) => publicPath('photo', entry.id) === path);
  const album = (data.albums ?? []).find((entry) => publicPath('photo/albums', entry.id) === path);
  const generic = {
    '/': ['Ishaan Zaveri', data.site?.hero?.tagline ?? 'Software developer and photographer.'],
    '/about': ['about · bio', summary(data.about?.source) || 'About Ishaan Zaveri — developer and photographer.'],
    '/blog': ['blog · writing', 'Writing by Ishaan Zaveri about software, security, photography, and learning Go.'],
    '/photo': ['photo · gallery', 'Photographs by Ishaan Zaveri. Browse frames, trips, and series.'],
    '/photo/albums': ['photo · albums', 'Photo albums by Ishaan Zaveri — trips, series, and themes.'],
    '/contact': ['contact', 'Find Ishaan Zaveri online and get in touch.'],
  };
  const known = Boolean(generic[path] || post || frame || album);
  const title = post?.title ?? frame?.caption?.title ?? (frame ? `photo · ${frame.id}` : undefined) ?? album?.title ?? generic[path]?.[0] ?? 'page not found';
  const description = summary(post?.blurb ?? (frame ? `Photograph from ${frame.location}, ${frame.date}. ${frame.camera}.` : undefined) ?? album?.subtitle ?? generic[path]?.[1] ?? 'The requested page could not be found.');
  const canonical = new URL(`${origin}${path}`).href;
  const image = safeUrl(frame?.image?.src, origin);
  let structured;
  if (post) {
    structured = { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description, url: canonical, author: { '@type': 'Person', name: 'Ishaan Zaveri' }, ...( /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? { datePublished: post.date } : {}) };
  } else if (frame && image) {
    structured = { '@context': 'https://schema.org', '@type': 'ImageObject', name: title, description, contentUrl: image, url: canonical, creator: { '@type': 'Person', name: 'Ishaan Zaveri' } };
  }
  return { title: `${title} · ~/site`, description, canonical, image, type: post ? 'article' : 'website', noindex: !known, structured };
}

// JSON-LD is data inside a script element: prevent HTML parser termination.
export function serializeStructured(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
