import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const INPUT_DIR = path.join(ROOT, 'images');
const OUTPUT_DIR = path.join(ROOT, 'images-web', 'prod');
const DATA_DIR = path.join(ROOT, 'frontend', 'mock-server', 'data');
const BASE_URL = process.env.PHOTO_BASE_URL ?? 'https://photos.ishaanzaveri.com/prod';
const WIDTHS = [480, 960, 1440, 2048];
const SOURCE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.heic']);

function usage() {
  console.log(`usage: node frontend/scripts/photo-pipeline.mjs <assets|seed|all>

commands:
  assets  scan images/ and write resized JPEGs to images-web/prod/
  seed    scan images/ and write mock-server/data/frames.json + albums.json
  all     run assets, then seed

env:
  PHOTO_BASE_URL  public URL prefix, defaults to ${BASE_URL}`);
}

function hasCommand(name) {
  try {
    execFileSync('command', ['-v', name], { shell: true, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function requireCommand(name) {
  if (!hasCommand(name)) {
    throw new Error(`missing required command '${name}'`);
  }
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function listSourceImages() {
  if (!existsSync(INPUT_DIR)) {
    throw new Error(`missing source image directory: ${INPUT_DIR}`);
  }

  const albums = readdirSync(INPUT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const files = [];
  for (const album of albums) {
    const albumDir = path.join(INPUT_DIR, album);
    for (const entry of readdirSync(albumDir, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name.startsWith('.')) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!SOURCE_EXTS.has(ext)) continue;
      files.push({
        album,
        name: entry.name,
        inputPath: path.join(albumDir, entry.name),
      });
    }
  }

  if (files.length === 0) {
    throw new Error(`no source images found under ${INPUT_DIR}`);
  }
  return files.sort((a, b) => `${a.album}/${a.name}`.localeCompare(`${b.album}/${b.name}`));
}

function outputName(sourceName, suffix = '') {
  const parsed = path.parse(sourceName);
  return `${parsed.name}${suffix}.jpg`;
}

function publicUrl(album, filename) {
  return `${BASE_URL}/${encodeURIComponent(album)}/${encodeURIComponent(filename)}`;
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleize(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseRatio(width, height) {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height) || 1;
  return `${Math.round(width / divisor)}/${Math.round(height / divisor)}`;
}

function parseRational(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (/^\d+\/\d+$/.test(text)) {
    const [num, den] = text.split('/').map(Number);
    return den ? num / den : null;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function formatAperture(raw) {
  const n = parseRational(raw);
  return n ? `f/${Number(n.toFixed(1))}` : 'unknown aperture';
}

function formatShutter(raw) {
  if (!raw) return 'unknown shutter';
  const text = String(raw).trim();
  if (/^\d+\/\d+$/.test(text)) return text;
  const n = Number(text);
  if (!Number.isFinite(n)) return text;
  if (n > 0 && n < 1) return `1/${Math.round(1 / n)}`;
  return `${Number(n.toFixed(3))}s`;
}

function formatIso(raw) {
  return raw ? `ISO ${String(raw).trim().replace(/^ISO\s+/i, '')}` : 'unknown ISO';
}

function formatDate(raw) {
  if (!raw) return null;
  const match = String(raw).match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function identifyVerbose(file) {
  const out = run('magick', ['identify', '-verbose', file], { maxBuffer: 1024 * 1024 * 16 });
  const data = {};
  for (const line of out.split('\n')) {
    const geometry = line.match(/^\s*Geometry:\s+(\d+)x(\d+)/);
    if (geometry) {
      data.ImageWidth = geometry[1];
      data.ImageHeight = geometry[2];
      continue;
    }
    const exif = line.match(/^\s*exif:([^:]+):\s*(.+)$/);
    if (exif) data[exif[1]] = exif[2].trim();
  }
  return data;
}

function exiftoolMetadata(file) {
  const raw = run('exiftool', ['-json', '-n', file], { maxBuffer: 1024 * 1024 * 16 });
  return JSON.parse(raw)[0] ?? {};
}

function metadataFor(file) {
  if (hasCommand('exiftool')) return normalizeExiftool(exiftoolMetadata(file));
  return normalizeMagick(identifyVerbose(file));
}

function normalizeExiftool(data) {
  return {
    width: Number(data.ImageWidth) || 1,
    height: Number(data.ImageHeight) || 1,
    camera: [data.Make, data.Model].filter(Boolean).join(' ') || data.Model || 'unknown camera',
    lens: data.LensModel || data.Lens || 'unknown lens',
    aperture: formatAperture(data.FNumber ?? data.ApertureValue),
    shutter: formatShutter(data.ExposureTime),
    iso: formatIso(data.ISO),
    date: formatDate(data.DateTimeOriginal ?? data.CreateDate ?? data.ModifyDate),
  };
}

function normalizeMagick(data) {
  return {
    width: Number(data.ImageWidth) || 1,
    height: Number(data.ImageHeight) || 1,
    camera: [data.Make, data.Model].filter(Boolean).join(' ') || data.Model || 'unknown camera',
    lens: data.LensModel || 'unknown lens',
    aperture: formatAperture(data.FNumber ?? data.ApertureValue),
    shutter: formatShutter(data.ExposureTime),
    iso: formatIso(data.ISOSpeedRatings ?? data.PhotographicSensitivity ?? data.ISO),
    date: formatDate(data.DateTimeOriginal ?? data.DateTime),
  };
}

function derivativeSet(album, name) {
  const canonical = outputName(name);
  return {
    src: publicUrl(album, canonical),
    variants: WIDTHS.map((width) => ({
      width,
      src: publicUrl(album, outputName(name, `-${width}`)),
    })),
  };
}

function generateAssets() {
  requireCommand('magick');
  const files = listSourceImages();

  for (const file of files) {
    const outDir = path.join(OUTPUT_DIR, file.album);
    mkdirSync(outDir, { recursive: true });

    const canonical = path.join(outDir, outputName(file.name));
    run('magick', [
      file.inputPath,
      '-auto-orient',
      '-resize',
      `${WIDTHS.at(-1)}x${WIDTHS.at(-1)}>`,
      '-strip',
      '-quality',
      '84',
      canonical,
    ]);

    for (const width of WIDTHS) {
      const out = path.join(outDir, outputName(file.name, `-${width}`));
      run('magick', [
        file.inputPath,
        '-auto-orient',
        '-resize',
        `${width}x${width}>`,
        '-strip',
        '-quality',
        '82',
        out,
      ]);
    }
  }

  console.log(`generated ${files.length} photo(s) into ${OUTPUT_DIR}`);
  console.log('upload this directory to Cloudflare before running the full visual app check:');
  console.log(`  ${OUTPUT_DIR}`);
}

function tagsFor(album, meta) {
  const tags = new Set(['photo', slugify(album)]);
  const year = meta.date?.slice(0, 4);
  if (year) tags.add(year);
  if (meta.width > meta.height) tags.add('landscape');
  else if (meta.height > meta.width) tags.add('portrait');
  else tags.add('square');
  tags.add('color');
  return [...tags].filter(Boolean);
}

function placeholderFor(album, index) {
  let hash = 0;
  for (const char of album) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return { hue: (hash + index * 17) % 360, lightness: Number((0.28 + (index % 5) * 0.025).toFixed(3)) };
}

function frameFor(file, index) {
  const meta = metadataFor(file.inputPath);
  const stem = path.parse(file.name).name;
  const albumTitle = titleize(file.album);
  const frameTitle = titleize(stem);
  const image = derivativeSet(file.album, file.name);
  const date = meta.date ?? 'unknown date';

  return {
    id: slugify(stem),
    album: slugify(file.album),
    albumFolder: file.album,
    filename: outputName(file.name),
    aspectRatio: parseRatio(meta.width, meta.height),
    camera: meta.camera,
    lens: meta.lens,
    aperture: meta.aperture,
    shutter: meta.shutter,
    iso: meta.iso,
    location: albumTitle,
    date,
    tags: tagsFor(file.album, meta),
    image: {
      src: image.src,
      variants: image.variants,
      width: meta.width,
      height: meta.height,
      blurhash: null,
      placeholder: placeholderFor(file.album, index),
    },
    caption: {
      title: `${albumTitle} - ${frameTitle}`,
      paragraphs: [
        `A frame from ${albumTitle}, captured on ${date}.`,
        `${meta.camera} with ${meta.lens}; ${meta.aperture}, ${meta.shutter}, ${meta.iso}.`,
      ],
      note: `// generated from ${file.album}/${file.name}`,
    },
  };
}

function generateSeed() {
  requireCommand('magick');
  const files = listSourceImages();
  const frames = files.map(frameFor);
  const byAlbum = new Map();

  for (const frame of frames) {
    const group = byAlbum.get(frame.album) ?? {
      id: frame.album,
      title: titleize(frame.albumFolder),
      subtitle: 'Generated from local photo sources',
      location: titleize(frame.albumFolder),
      date: frame.date,
      count: 0,
      coverFrameId: frame.id,
    };
    group.count += 1;
    if (frame.date !== 'unknown date' && (group.date === 'unknown date' || frame.date < group.date)) group.date = frame.date;
    byAlbum.set(frame.album, group);
  }

  const cleanedFrames = frames.map(({ albumFolder, filename, ...frame }) => ({
    ...frame,
    image: { ...frame.image, filename },
  }));
  const albums = [...byAlbum.values()].sort((a, b) => a.title.localeCompare(b.title));

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path.join(DATA_DIR, 'frames.json'), `${JSON.stringify(cleanedFrames, null, 2)}\n`);
  writeFileSync(path.join(DATA_DIR, 'albums.json'), `${JSON.stringify(albums, null, 2)}\n`);
  console.log(`wrote ${cleanedFrames.length} frames and ${albums.length} albums`);
}

const command = process.argv[2];
try {
  if (command === 'assets') generateAssets();
  else if (command === 'seed') generateSeed();
  else if (command === 'all') {
    generateAssets();
    generateSeed();
  } else {
    usage();
    process.exit(command ? 1 : 0);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
