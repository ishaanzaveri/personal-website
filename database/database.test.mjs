import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { openDatabase, migrate } from './db.mjs';
import { importContent, readSeeds, seedIfEmpty } from './import.mjs';

function setup(context) {
  const database = openDatabase(':memory:');
  context.after(() => database.close());
  return database;
}

test('migrations are repeatable, foreign keys enabled, and derived fields are not stored', (context) => {
  const database = setup(context);
  migrate(database);
  assert.equal(database.prepare('SELECT count(*) AS count FROM schema_migrations').get().count, 1);
  assert.equal(database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  const columns = database.prepare('PRAGMA table_info(posts)').all().map((column) => column.name);
  assert.deepEqual(columns, ['slug', 'date', 'category', 'title', 'blurb', 'body']);
  database.prepare('UPDATE schema_migrations SET checksum = ?').run('edited');
  assert.throws(() => migrate(database), /Applied migration was edited/);
});

test('future schema versions cannot be opened by older code', (context) => {
  const database = setup(context);
  database.prepare('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)').run('999_future.sql', 'future');
  assert.throws(() => migrate(database), /unsupported migration/);
});

test('initial seed imports all content once and never reseeds existing content', (context) => {
  const database = setup(context);
  assert.equal(seedIfEmpty(database), true);
  database.prepare('UPDATE site_settings SET now_body = ?').run('hand-edited');
  assert.equal(seedIfEmpty(database), false);
  assert.equal(database.prepare('SELECT now_body FROM site_settings').get().now_body, 'hand-edited');
  assert.throws(() => importContent(database, readSeeds(), { initial: true }), /empty content database/);
  const counts = (table) => database.prepare(`SELECT count(*) AS count FROM ${table}`).get().count;
  const source = readSeeds();
  assert.equal(counts('frames'), source.frames.length);
  assert.equal(counts('albums'), source.albums.length);
  assert.equal(counts('posts'), source.posts.length);
  assert.equal(database.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('failed imports roll back every change, including deferred cover constraints', (context) => {
  const database = setup(context);
  const source = readSeeds();
  importContent(database, source);
  const invalid = structuredClone(source);
  invalid.site.version = 'should-roll-back';
  invalid.albums[0].coverFrameId = source.frames.find((frame) => frame.album !== invalid.albums[0].id).id;
  assert.throws(() => importContent(database, invalid), /FOREIGN KEY/);
  assert.equal(database.prepare('SELECT version FROM site_settings').get().version, source.site.version);
  invalid.albums[0].coverFrameId = source.albums[0].coverFrameId;
  invalid.frames[0].image.variants.push(invalid.frames[0].image.variants[0]);
  assert.throws(() => importContent(database, invalid), /UNIQUE/);
  assert.equal(database.prepare('SELECT version FROM site_settings').get().version, source.site.version);
});

test('imports are idempotent, preserve editorial fields, and do not delete absent records', (context) => {
  const database = setup(context);
  const source = readSeeds();
  importContent(database, source);
  const frame = source.frames[0];
  database.prepare('UPDATE frame_images SET alt = ? WHERE frame_id = ?').run('Reviewed description', frame.id);
  database.prepare('UPDATE frame_captions SET title = ? WHERE frame_id = ?').run('Reviewed title', frame.id);
  importContent(database, source);
  assert.equal(database.prepare('SELECT count(*) AS count FROM frames').get().count, source.frames.length);
  assert.equal(database.prepare('SELECT alt FROM frame_images WHERE frame_id = ?').get(frame.id).alt, 'Reviewed description');
  assert.equal(database.prepare('SELECT title FROM frame_captions WHERE frame_id = ?').get(frame.id).title, 'Reviewed title');
  importContent(database, { albums: source.albums, frames: [frame] });
  assert.equal(database.prepare('SELECT count(*) AS count FROM frames').get().count, source.frames.length);
  importContent(database, { frames: [frame] }, { overwriteEditorial: true });
  assert.equal(database.prepare('SELECT alt FROM frame_images WHERE frame_id = ?').get(frame.id).alt, null);
  assert.equal(database.prepare('SELECT title FROM frame_captions WHERE frame_id = ?').get(frame.id).title, frame.caption.title);
});

test('missing EXIF date is nullable and invalid dates and sizes fail import', (context) => {
  const database = setup(context);
  const source = readSeeds();
  source.frames[0].date = 'unknown date';
  source.frames[0].caption = null;
  source.frames[0].image = { src: null, blurhash: null, placeholder: { hue: 0, lightness: 0 } };
  importContent(database, source);
  assert.equal(database.prepare('SELECT date FROM frames WHERE id = ?').get(source.frames[0].id).date, null);
  source.frames[0].date = '2026-02-30';
  assert.throws(() => importContent(database, source), /Invalid photo date/);
  source.frames[0].date = 'unknown date';
  source.frames[0].image.width = 0;
  assert.throws(() => importContent(database, source), /CHECK constraint/);
});

test('file databases survive restarts and consistent backups restore', (context) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'portfolio-db-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'site.sqlite');
  const backup = path.join(directory, 'backup.sqlite');
  let database = openDatabase(filename);
  try {
    seedIfEmpty(database);
    database.prepare('UPDATE site_settings SET now_body = ?').run('persisted content');
    database.prepare('VACUUM INTO ?').run(backup);
    assert.throws(() => database.prepare('VACUUM INTO ?').run(backup), /already exists/);
  } finally {
    database.close();
  }
  for (const file of [filename, backup]) {
    database = openDatabase(file);
    try {
      assert.equal(seedIfEmpty(database), false);
      assert.equal(database.prepare('SELECT now_body FROM site_settings').get().now_body, 'persisted content');
      assert.equal(database.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
      assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
    } finally {
      database.close();
    }
  }
});

test('CLI supports explicit migrate/seed/import/backup and rejects unsafe usage', (context) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'portfolio-cli-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'site.sqlite');
  const backup = path.join(directory, 'backup.sqlite');
  const cli = (...args) => spawnSync(process.execPath, [fileURLToPath(new URL('./cli.mjs', import.meta.url)), ...args], {
    env: { ...process.env, DATABASE_PATH: filename }, encoding: 'utf8',
  });
  assert.equal(cli('migrate').status, 0);
  assert.equal(cli('seed').status, 0);
  assert.notEqual(cli('seed').status, 0);
  assert.equal(cli('import', '--photos').status, 0);
  assert.equal(cli('import', '--overwrite-editorial').status, 0);
  assert.equal(cli('backup', `--output=${backup}`).status, 0);
  assert.notEqual(cli('backup', `--output=${backup}`).status, 0);
  assert.notEqual(cli('backup').status, 0);
  assert.notEqual(cli('seed', '--photos').status, 0);
  assert.notEqual(cli('import', '--delete').status, 0);
  const database = openDatabase(backup);
  try {
    assert.equal(database.prepare('SELECT count(*) AS count FROM frames').get().count, readSeeds().frames.length);
  } finally {
    database.close();
  }
});
