import { readingStats } from './reading-stats.js';

function limitValue(value, fallback = -1) {
  const limit = Number.parseInt(value, 10);
  return Number.isFinite(limit) && limit > 0 ? Math.min(limit, Number.MAX_SAFE_INTEGER) : fallback;
}

function matchesQuery(frame, query) {
  const caption = frame.caption
    ? [frame.caption.title, ...frame.caption.paragraphs, frame.caption.note].filter(Boolean) : [];
  return [
    frame.id, frame.camera, frame.lens, frame.aperture, frame.shutter, frame.iso,
    frame.location, frame.date, frame.image.filename, frame.image.src, ...frame.tags, ...caption,
  ].join(' ').toLowerCase().includes(query.toLowerCase());
}

export function createRepository(database) {
  const get = (sql, ...parameters) => database.prepare(sql).get(...parameters);
  const all = (sql, ...parameters) => database.prepare(sql).all(...parameters);
  const tags = (table, key, id) => all(`SELECT tag FROM ${table} WHERE ${key} = ? ORDER BY position`, id).map((row) => row.tag);

  function mapPost(row, detail = false) {
    if (!row) return undefined;
    const stats = readingStats(row.body);
    const post = {
      slug: row.slug, date: row.date, tag: row.category, title: row.title,
      blurb: row.blurb, readMinutes: stats.readMinutes,
    };
    const selected = get('SELECT * FROM post_selected_work WHERE post_slug = ?', row.slug);
    if (selected) post.selectedWork = {
      enabled: Boolean(selected.enabled), status: selected.status, metric: selected.metric,
      stack: JSON.parse(selected.stack), order: selected.position,
    };
    if (detail) Object.assign(post, { words: stats.words, tags: tags('post_tags', 'post_slug', row.slug), body: row.body });
    return post;
  }

  function mapProject(row, detail = false) {
    if (!row) return undefined;
    const project = {
      slug: row.slug, name: row.name, blurb: row.blurb, stack: JSON.parse(row.stack),
      status: row.status, metric: row.metric, readmeUrl: row.readme_url, order: row.position,
    };
    if (detail) project.readme = row.readme;
    return project;
  }

  function mapFrame(row) {
    if (!row) return undefined;
    const storedImage = get('SELECT * FROM frame_images WHERE frame_id = ?', row.id);
    const image = {
      src: storedImage.src,
      variants: all('SELECT width, src FROM image_variants WHERE frame_id = ? ORDER BY position', row.id),
      blurhash: storedImage.blurhash,
      placeholder: { hue: storedImage.placeholder_hue, lightness: storedImage.placeholder_lightness },
    };
    for (const key of ['width', 'height', 'filename', 'alt']) {
      if (storedImage[key] !== null) image[key] = storedImage[key];
    }
    const storedCaption = get('SELECT * FROM frame_captions WHERE frame_id = ?', row.id);
    const caption = storedCaption ? {
      title: storedCaption.title, paragraphs: JSON.parse(storedCaption.paragraphs),
      ...(storedCaption.note !== null ? { note: storedCaption.note } : {}),
    } : null;
    return {
      id: row.id, album: row.album_id, aspectRatio: row.aspect_ratio,
      camera: row.camera, lens: row.lens, aperture: row.aperture, shutter: row.shutter,
      iso: row.iso, location: row.location, date: row.date ?? 'unknown date',
      tags: tags('frame_tags', 'frame_id', row.id), image, caption,
    };
  }

  function mapAlbum(row) {
    if (!row) return undefined;
    return {
      id: row.id, title: row.title, subtitle: row.subtitle, location: row.location,
      date: row.date ?? 'unknown date', coverFrameId: row.cover_frame_id,
      count: get('SELECT count(*) AS count FROM frames WHERE album_id = ?', row.id).count,
    };
  }

  function frames(query = {}) {
    const conditions = [];
    const parameters = [];
    const selectedTags = query.tag == null ? [] : Array.isArray(query.tag) ? query.tag : [query.tag];
    if (query.album) {
      conditions.push('album_id = ?');
      parameters.push(query.album);
    }
    const scope = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = get(`SELECT count(*) AS count FROM frames ${scope}`, ...parameters).count;
    if (selectedTags.length) {
      conditions.push(`EXISTS (SELECT 1 FROM frame_tags WHERE frame_id = frames.id AND tag IN (${selectedTags.map(() => '?').join(', ')}))`);
      parameters.push(...selectedTags);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const direction = query.sort === 'date' ? 'ASC' : 'DESC';
    let list = all(`SELECT * FROM frames ${where} ORDER BY coalesce(date, 'unknown date') ${direction}, position`, ...parameters).map(mapFrame);
    if (query.q) list = list.filter((frame) => matchesQuery(frame, query.q));
    const limit = limitValue(query.limit);
    if (limit !== -1) list = list.slice(0, limit);
    return { data: list, meta: { total, filteredBy: { tag: selectedTags, q: query.q || '' } } };
  }

  return {
    site() {
      const row = get('SELECT * FROM site_settings WHERE id = 1');
      return {
        ...(row.email !== null ? { email: row.email } : {}), version: row.version, updated: row.updated,
        hero: { tagline: row.hero_tagline, prompts: JSON.parse(row.hero_prompts) },
        now: { body: row.now_body, updatedCadence: row.now_cadence, tags: JSON.parse(row.now_tags) },
        socials: all('SELECT key, label, url FROM social_links ORDER BY position'),
      };
    },
    about() {
      const { id, ...about } = get('SELECT * FROM about_page WHERE id = 1');
      return about;
    },
    projects(query = {}) {
      const where = query.status ? 'WHERE status = ?' : '';
      const parameters = query.status ? [query.status] : [];
      return all(`SELECT * FROM projects ${where} ORDER BY position, rowid LIMIT ?`, ...parameters, limitValue(query.limit ?? 12)).map((row) => mapProject(row));
    },
    project(slug) { return mapProject(get('SELECT * FROM projects WHERE slug = ?', slug), true); },
    posts(query = {}) {
      const filtered = query.tag && query.tag !== 'all';
      const where = filtered ? 'WHERE category = ?' : '';
      const parameters = filtered ? [query.tag] : [];
      return all(`SELECT * FROM posts ${where} ORDER BY date ${query.sort === 'date' ? 'ASC' : 'DESC'}, rowid LIMIT ?`, ...parameters, limitValue(query.limit)).map((row) => mapPost(row));
    },
    post(slug) { return mapPost(get('SELECT * FROM posts WHERE slug = ?', slug), true); },
    albums() {
      const data = all('SELECT * FROM albums ORDER BY position').map(mapAlbum);
      return { data, meta: { total: data.length } };
    },
    album(id) {
      const album = mapAlbum(get('SELECT * FROM albums WHERE id = ?', id));
      if (!album) return undefined;
      const list = frames({ album: id }).data;
      return { ...album, frames: list, meta: { total: list.length } };
    },
    frames,
    frame(id) { return mapFrame(get('SELECT * FROM frames WHERE id = ?', id)); },
    facets() {
      const tags = all('SELECT DISTINCT tag FROM frame_tags').map((row) => row.tag).sort();
      const locations = [...new Set(all('SELECT DISTINCT location FROM frames').map((row) => row.location.split(' · ')[0]))].sort();
      const cameras = all('SELECT DISTINCT camera FROM frames').map((row) => row.camera).sort();
      return { tags, locations, cameras };
    },
  };
}
