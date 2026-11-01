import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transaction } from './db.mjs';

export const seedDirectory = fileURLToPath(new URL('../frontend/mock-server/data/', import.meta.url));

export function readSeeds(directory = seedDirectory, photosOnly = false) {
  const names = photosOnly ? ['albums', 'frames'] : ['site', 'about', 'projects', 'posts', 'albums', 'frames'];
  return Object.fromEntries(names.map((name) => [name, JSON.parse(readFileSync(path.join(directory, `${name}.json`), 'utf8'))]));
}

function upsert(database, table, key, values) {
  const columns = Object.keys(values);
  const updates = columns.filter((column) => column !== key).map((column) => `${column} = excluded.${column}`);
  database.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
    ON CONFLICT (${key}) DO UPDATE SET ${updates.join(', ')}`).run(...Object.values(values));
}

function replaceTags(database, table, key, id, tags) {
  database.prepare(`DELETE FROM ${table} WHERE ${key} = ?`).run(id);
  const insert = database.prepare(`INSERT INTO ${table} (${key}, tag, position) VALUES (?, ?, ?)`);
  tags.forEach((tag, position) => insert.run(id, tag, position));
}

function photoDate(value) {
  if (value == null || value === 'unknown date') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid photo date: ${value}`);
  }
  return value;
}

export function importContent(database, data, { overwriteEditorial = false, initial = false } = {}) {
  transaction(database, () => {
    if (initial && ['site_settings', 'about_page', 'posts', 'projects', 'albums', 'frames'].some((table) => database.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get())) {
      throw new Error('Seed requires an empty content database; use import for explicit updates.');
    }
    if (data.site) {
      const site = data.site;
      upsert(database, 'site_settings', 'id', {
        id: 1, email: site.email ?? null, version: site.version, updated: site.updated,
        hero_tagline: site.hero.tagline, hero_prompts: JSON.stringify(site.hero.prompts),
        now_body: site.now.body, now_cadence: site.now.updatedCadence, now_tags: JSON.stringify(site.now.tags),
      });
      database.exec('DELETE FROM social_links');
      const insert = database.prepare('INSERT INTO social_links (key, label, url, position) VALUES (?, ?, ?, ?)');
      site.socials.forEach((social, position) => insert.run(social.key, social.label, social.url, position));
    }
    if (data.about) {
      const about = data.about;
      upsert(database, 'about_page', 'id', {
        id: 1, title: about.title, subtitle: about.subtitle, filename: about.filename,
        format: about.format, source: about.source, encoding: about.encoding, eol: about.eol,
      });
    }
    for (const project of data.projects ?? []) {
      upsert(database, 'projects', 'slug', {
        slug: project.slug, name: project.name, blurb: project.blurb, status: project.status,
        metric: project.metric, position: project.order ?? 0, stack: JSON.stringify(project.stack),
        readme_url: project.readmeUrl, readme: project.readme,
      });
    }
    for (const post of data.posts ?? []) {
      upsert(database, 'posts', 'slug', {
        slug: post.slug, date: post.date, category: post.tag, title: post.title, blurb: post.blurb, body: post.body,
      });
      replaceTags(database, 'post_tags', 'post_slug', post.slug, post.tags ?? []);
      database.prepare('DELETE FROM post_selected_work WHERE post_slug = ?').run(post.slug);
      if (post.selectedWork) {
        const selected = post.selectedWork;
        upsert(database, 'post_selected_work', 'post_slug', {
          post_slug: post.slug, enabled: Number(selected.enabled), status: selected.status,
          metric: selected.metric, position: selected.order, stack: JSON.stringify(selected.stack),
        });
      }
    }
    (data.albums ?? []).forEach((album, position) => {
      upsert(database, 'albums', 'id', {
        id: album.id, title: album.title, subtitle: album.subtitle, location: album.location,
        date: photoDate(album.date), cover_frame_id: album.coverFrameId ?? null, position,
      });
    });
    (data.frames ?? []).forEach((frame, position) => {
      const existing = database.prepare('SELECT 1 FROM frames WHERE id = ?').get(frame.id);
      const previousImage = database.prepare('SELECT alt FROM frame_images WHERE frame_id = ?').get(frame.id);
      upsert(database, 'frames', 'id', {
        id: frame.id, album_id: frame.album, aspect_ratio: frame.aspectRatio,
        camera: frame.camera, lens: frame.lens, aperture: frame.aperture, shutter: frame.shutter,
        iso: frame.iso, location: frame.location, date: photoDate(frame.date), position,
      });
      replaceTags(database, 'frame_tags', 'frame_id', frame.id, frame.tags ?? []);
      const image = frame.image;
      upsert(database, 'frame_images', 'frame_id', {
        frame_id: frame.id, src: image.src ?? null, width: image.width ?? null, height: image.height ?? null,
        filename: image.filename ?? null, alt: existing && !overwriteEditorial ? previousImage?.alt ?? null : image.alt ?? null,
        blurhash: image.blurhash ?? null, placeholder_hue: image.placeholder.hue,
        placeholder_lightness: image.placeholder.lightness,
      });
      database.prepare('DELETE FROM image_variants WHERE frame_id = ?').run(frame.id);
      const insert = database.prepare('INSERT INTO image_variants (frame_id, width, src, position) VALUES (?, ?, ?, ?)');
      (image.variants ?? []).forEach((variant, order) => insert.run(frame.id, variant.width, variant.src, order));
      if (!existing || overwriteEditorial) {
        database.prepare('DELETE FROM frame_captions WHERE frame_id = ?').run(frame.id);
        if (frame.caption) upsert(database, 'frame_captions', 'frame_id', {
          frame_id: frame.id, title: frame.caption.title, paragraphs: JSON.stringify(frame.caption.paragraphs),
          note: frame.caption.note ?? null,
        });
      }
    });
  });
}

export function seedIfEmpty(database) {
  if (database.prepare('SELECT 1 FROM site_settings').get()) return false;
  importContent(database, readSeeds(), { initial: true });
  return true;
}
