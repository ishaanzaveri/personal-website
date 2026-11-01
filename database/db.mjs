import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export const defaultPath = fileURLToPath(new URL('./local/site.sqlite', import.meta.url));
const migrationsDirectory = fileURLToPath(new URL('./migrations/', import.meta.url));

export function transaction(database, work) {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function migrate(database) {
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ) STRICT`);
  const files = readdirSync(migrationsDirectory).filter((name) => name.endsWith('.sql')).sort();
  const known = new Set(files);
  for (const row of database.prepare('SELECT version FROM schema_migrations').all()) {
    if (!known.has(row.version)) throw new Error(`Database has an unsupported migration: ${row.version}`);
  }
  for (const version of files) {
    const sql = readFileSync(path.join(migrationsDirectory, version), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    transaction(database, () => {
      const applied = database.prepare('SELECT checksum FROM schema_migrations WHERE version = ?').get(version);
      if (applied) {
        if (applied.checksum !== checksum) throw new Error(`Applied migration was edited: ${version}`);
        return;
      }
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)').run(version, checksum);
    });
  }
}

export function openDatabase(filename = process.env.DATABASE_PATH || defaultPath) {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const database = new DatabaseSync(filename);
  try {
    database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    migrate(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
