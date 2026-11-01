import express from 'express';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../../database/db.mjs';
import { seedIfEmpty } from '../../database/import.mjs';
import { createRepository } from './repository.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));

function gitField(format) {
  try {
    return execFileSync('git', ['log', '-1', `--format=${format}`], {
      cwd: HERE, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export function createApp(database, build = {}) {
  const repository = createRepository(database);
  const site = repository.site();
  const buildInfo = {
    branch: process.env.BUILD_BRANCH || 'main',
    commit: process.env.BUILD_COMMIT || gitField('%h') || 'unknown',
    lastCommit: process.env.BUILD_COMMITTED_AT || gitField('%cI') || `${site.updated}T00:00:00Z`,
    ...build,
  };
  const app = express();
  app.set('query parser', 'simple');
  const notFound = (response, message) => response.status(404).json({ error: { code: 'not_found', message } });

  app.use((request, response, next) => {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    response.set('Access-Control-Max-Age', '86400');
    if (request.method === 'OPTIONS') return response.sendStatus(204);
    response.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
    next();
  });

  app.use('/api', (request, response, next) => {
    for (const key of ['status', 'limit', 'sort', 'album', 'q']) {
      if (request.query[key] !== undefined && typeof request.query[key] !== 'string') {
        return response.status(400).json({ error: { code: 'invalid_query', message: `${key} must be a single value` } });
      }
    }
    if (request.query.tag !== undefined && typeof request.query.tag !== 'string' &&
        !(request.path.replace(/\/+$/, '') === '/frames' && Array.isArray(request.query.tag) && request.query.tag.every((tag) => typeof tag === 'string'))) {
      return response.status(400).json({ error: { code: 'invalid_query', message: 'tag must be a string (repeatable for frames)' } });
    }
    next();
  });

  app.get('/api/site', (_request, response) => response.json({ ...repository.site(), build: buildInfo }));
  app.get('/api/about', (_request, response) => response.json(repository.about()));
  app.get('/api/projects', (request, response) => response.json(repository.projects(request.query)));
  app.get('/api/projects/:slug', (request, response) => {
    const project = repository.project(request.params.slug);
    return project ? response.json(project) : notFound(response, `no project '${request.params.slug}'`);
  });
  app.get('/api/posts', (request, response) => response.json(repository.posts(request.query)));
  app.get('/api/posts/:slug', (request, response) => {
    const post = repository.post(request.params.slug);
    return post ? response.json({ ...post, commit: buildInfo.commit }) : notFound(response, `no post '${request.params.slug}'`);
  });
  app.get('/api/albums', (_request, response) => response.json(repository.albums()));
  app.get('/api/albums/:id', (request, response) => {
    const album = repository.album(request.params.id);
    return album ? response.json(album) : notFound(response, `no album '${request.params.id}'`);
  });
  app.get('/api/frames/meta', (_request, response) => response.json(repository.facets()));
  app.get('/api/frames', (request, response) => response.json(repository.frames(request.query)));
  app.get('/api/frames/:id', (request, response) => {
    const frame = repository.frame(request.params.id);
    return frame ? response.json(frame) : notFound(response, `no frame '${request.params.id}'`);
  });
  app.use('/api', (_request, response) => notFound(response, 'unknown endpoint'));
  app.use((error, _request, response, _next) => {
    console.error(error);
    response.set('Cache-Control', 'no-store');
    response.status(500).json({ error: { code: 'internal_error', message: 'unable to read content' } });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const database = openDatabase();
  try {
    if (seedIfEmpty(database)) console.log('initialized SQLite content from JSON seeds');
    const server = createApp(database).listen(process.env.PORT || 8787, () => {
      console.log(`mock-api listening on http://localhost:${process.env.PORT || 8787} (SQLite)`);
    });
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => server.close(() => { database.close(); }));
    }
    server.on('error', (error) => { database.close(); throw error; });
  } catch (error) {
    database.close();
    throw error;
  }
}
