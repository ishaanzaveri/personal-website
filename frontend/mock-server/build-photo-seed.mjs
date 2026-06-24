// Transforms the prototype's compact FRAMES/ALBUMS (from src/photo/data.jsx)
// into API-shaped seed JSON under ./data. Re-run if the source values change:
//   node mock-server/build-photo-seed.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const ALBUMS = [
  { id: 'dumbo-dusk', title: 'DUMBO Dusk',         sub: 'Brooklyn waterfront',    loc: 'Brooklyn, NY', date: '2025-08-12', count: 6, hue:  30 },
  { id: 'tokyo',      title: 'Tokyo · Shibuya',    sub: 'Neon, late nights',      loc: 'Tokyo, JP',    date: '2025-04-22', count: 7, hue: 320 },
  { id: 'rooftops',   title: 'Rooftops',           sub: 'Above the city, mostly', loc: 'New York, NY', date: '2024-11-03', count: 6, hue: 200 },
  { id: 'portraits',  title: 'Portraits — Spring', sub: 'Studio + natural light', loc: 'Various',      date: '2026-03-18', count: 5, hue:  20 },
  { id: 'bw',         title: 'Untitled — B&W',     sub: 'Ongoing series',         loc: 'Various',      date: '2025-12-04', count: 6, hue: 220 },
  { id: 'iceland',    title: 'Iceland',            sub: 'Highlands & coast',      loc: 'Iceland',      date: '2024-09-21', count: 5, hue: 180 },
];

const FRAMES = [
  { id: 'p001', album: 'dumbo-dusk', ar: '3/2',  hue:  30, l: 0.40, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ2.0',  sh: '1/125', iso: 'ISO 400',  loc: 'Brooklyn · Front St',         date: '2025-08-12', tags: ['street', 'color', 'golden hour'] },
  { id: 'p002', album: 'dumbo-dusk', ar: '2/3',  hue:  20, l: 0.36, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ2.8',  sh: '1/250', iso: 'ISO 400',  loc: 'Brooklyn · Washington St',    date: '2025-08-12', tags: ['architecture', 'color'] },
  { id: 'p003', album: 'dumbo-dusk', ar: '3/2',  hue:  50, l: 0.42, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ4.0',  sh: '1/500', iso: 'ISO 200',  loc: 'Brooklyn · Pebble Beach',     date: '2025-08-12', tags: ['landscape', 'color', 'golden hour'] },
  { id: 'p004', album: 'dumbo-dusk', ar: '1/1',  hue:  10, l: 0.32, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ1.7',  sh: '1/60',  iso: 'ISO 1600', loc: 'Brooklyn · Front St diner',   date: '2025-08-12', tags: ['street', 'color', 'night'] },
  { id: 'p005', album: 'dumbo-dusk', ar: '3/2',  hue:  40, l: 0.38, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ2.0',  sh: '1/125', iso: 'ISO 800',  loc: 'Brooklyn · Manhattan Bridge', date: '2025-08-12', tags: ['architecture', 'color'] },
  { id: 'p006', album: 'dumbo-dusk', ar: '2/3',  hue:  60, l: 0.34, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ2.8',  sh: '1/250', iso: 'ISO 400',  loc: 'Brooklyn · DUMBO',            date: '2025-08-12', tags: ['street', 'color'] },

  { id: 'p007', album: 'tokyo', ar: '3/2',  hue: 320, l: 0.30, cam: 'Sony A7iv', lens: 'FE 35 GM',  ap: 'ƒ1.4',  sh: '1/60',  iso: 'ISO 1600', loc: 'Tokyo · Shibuya Crossing',  date: '2025-04-22', tags: ['street', 'night', 'neon'] },
  { id: 'p008', album: 'tokyo', ar: '2/3',  hue: 300, l: 0.26, cam: 'Sony A7iv', lens: 'FE 35 GM',  ap: 'ƒ2.0',  sh: '1/125', iso: 'ISO 3200', loc: 'Tokyo · Golden Gai',        date: '2025-04-22', tags: ['street', 'night', 'neon'] },
  { id: 'p009', album: 'tokyo', ar: '3/2',  hue: 340, l: 0.32, cam: 'Sony A7iv', lens: 'FE 35 GM',  ap: 'ƒ1.4',  sh: '1/60',  iso: 'ISO 1600', loc: 'Tokyo · Shinjuku Station',  date: '2025-04-23', tags: ['street', 'night'] },
  { id: 'p010', album: 'tokyo', ar: '4/5',  hue: 280, l: 0.24, cam: 'Sony A7iv', lens: 'FE 85 GM',  ap: 'ƒ1.8',  sh: '1/125', iso: 'ISO 2500', loc: 'Tokyo · Omoide Yokocho',    date: '2025-04-23', tags: ['street', 'night', 'portrait'] },
  { id: 'p011', album: 'tokyo', ar: '16/9', hue: 310, l: 0.22, cam: 'Sony A7iv', lens: 'FE 35 GM',  ap: 'ƒ1.4',  sh: '1/60',  iso: 'ISO 3200', loc: 'Tokyo · Yurakucho',         date: '2025-04-23', tags: ['street', 'night', 'wide'] },
  { id: 'p012', album: 'tokyo', ar: '3/2',  hue:   0, l: 0.34, cam: 'Sony A7iv', lens: 'FE 35 GM',  ap: 'ƒ2.0',  sh: '1/250', iso: 'ISO 1250', loc: 'Tokyo · Akihabara',         date: '2025-04-24', tags: ['street', 'color', 'neon'] },
  { id: 'p013', album: 'tokyo', ar: '2/3',  hue: 290, l: 0.28, cam: 'Sony A7iv', lens: 'FE 35 GM',  ap: 'ƒ1.4',  sh: '1/60',  iso: 'ISO 3200', loc: 'Tokyo · Shibuya alley',     date: '2025-04-24', tags: ['street', 'night', 'neon'] },

  { id: 'p014', album: 'rooftops', ar: '16/9', hue: 200, l: 0.30, cam: 'Fuji X-T5', lens: 'XF 23mm ƒ1.4', ap: 'ƒ8',   sh: '1/250', iso: 'ISO 125', loc: 'Manhattan · Midtown',     date: '2024-11-03', tags: ['architecture', 'wide', 'color'] },
  { id: 'p015', album: 'rooftops', ar: '3/2',  hue: 210, l: 0.34, cam: 'Fuji X-T5', lens: 'XF 23mm ƒ1.4', ap: 'ƒ5.6', sh: '1/500', iso: 'ISO 125', loc: 'Manhattan · LES rooftop', date: '2024-11-03', tags: ['architecture', 'color'] },
  { id: 'p016', album: 'rooftops', ar: '4/5',  hue: 190, l: 0.28, cam: 'Fuji X-T5', lens: 'XF 56mm ƒ1.2', ap: 'ƒ4',   sh: '1/250', iso: 'ISO 200', loc: 'Brooklyn · Gowanus',      date: '2024-11-05', tags: ['architecture', 'color'] },
  { id: 'p017', album: 'rooftops', ar: '3/2',  hue: 220, l: 0.26, cam: 'Fuji X-T5', lens: 'XF 23mm ƒ1.4', ap: 'ƒ8',   sh: '1/125', iso: 'ISO 125', loc: 'Queens · LIC',            date: '2024-11-08', tags: ['architecture', 'wide'] },
  { id: 'p018', album: 'rooftops', ar: '16/9', hue: 180, l: 0.24, cam: 'Fuji X-T5', lens: 'XF 23mm ƒ1.4', ap: 'ƒ8',   sh: '1/500', iso: 'ISO 125', loc: 'Manhattan · Tribeca',     date: '2024-11-10', tags: ['architecture', 'wide', 'color'] },
  { id: 'p019', album: 'rooftops', ar: '1/1',  hue: 200, l: 0.32, cam: 'Fuji X-T5', lens: 'XF 56mm ƒ1.2', ap: 'ƒ2.8', sh: '1/500', iso: 'ISO 125', loc: 'Brooklyn · Williamsburg', date: '2024-11-12', tags: ['architecture', 'color'] },

  { id: 'p020', album: 'portraits', ar: '4/5', hue:  20, l: 0.34, cam: 'Sony A7iv', lens: 'FE 85 GM',  ap: 'ƒ1.8',  sh: '1/200', iso: 'ISO 200', loc: 'Studio · Bushwick',     date: '2026-03-18', tags: ['portrait', 'color', 'studio'] },
  { id: 'p021', album: 'portraits', ar: '4/5', hue:  10, l: 0.36, cam: 'Sony A7iv', lens: 'FE 85 GM',  ap: 'ƒ1.8',  sh: '1/200', iso: 'ISO 200', loc: 'Studio · Bushwick',     date: '2026-03-18', tags: ['portrait', 'color', 'studio'] },
  { id: 'p022', album: 'portraits', ar: '4/5', hue:  30, l: 0.30, cam: 'Sony A7iv', lens: 'FE 85 GM',  ap: 'ƒ2.0',  sh: '1/250', iso: 'ISO 400', loc: 'Prospect Park',         date: '2026-03-25', tags: ['portrait', 'natural light'] },
  { id: 'p023', album: 'portraits', ar: '4/5', hue:  40, l: 0.32, cam: 'Sony A7iv', lens: 'FE 85 GM',  ap: 'ƒ1.4',  sh: '1/500', iso: 'ISO 200', loc: 'Prospect Park',         date: '2026-03-25', tags: ['portrait', 'natural light'] },
  { id: 'p024', album: 'portraits', ar: '2/3', hue:  50, l: 0.28, cam: 'Sony A7iv', lens: 'FE 50 GM',  ap: 'ƒ1.4',  sh: '1/250', iso: 'ISO 400', loc: 'LES rooftop',           date: '2026-04-02', tags: ['portrait', 'color'] },

  { id: 'p025', album: 'bw', ar: '3/2', hue: 220, l: 0.24, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ2.8',  sh: '1/250', iso: 'ISO 400',  loc: 'NYC · Subway',       date: '2025-12-04', tags: ['street', 'b&w'] },
  { id: 'p026', album: 'bw', ar: '1/1', hue: 230, l: 0.18, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ4.0',  sh: '1/500', iso: 'ISO 400',  loc: 'NYC · MoMA',         date: '2025-12-08', tags: ['architecture', 'b&w'] },
  { id: 'p027', album: 'bw', ar: '2/3', hue: 210, l: 0.20, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ1.7',  sh: '1/125', iso: 'ISO 800',  loc: 'NYC · West Village', date: '2025-12-15', tags: ['street', 'b&w'] },
  { id: 'p028', album: 'bw', ar: '4/5', hue: 220, l: 0.16, cam: 'Sony A7iv', lens: 'FE 35 GM',      ap: 'ƒ2.0',  sh: '1/200', iso: 'ISO 1600', loc: 'NYC · Harlem',       date: '2026-01-09', tags: ['street', 'b&w', 'portrait'] },
  { id: 'p029', album: 'bw', ar: '3/2', hue: 230, l: 0.22, cam: 'Sony A7iv', lens: 'FE 35 GM',      ap: 'ƒ2.8',  sh: '1/500', iso: 'ISO 400',  loc: 'NYC · Battery Park', date: '2026-02-11', tags: ['landscape', 'b&w'] },
  { id: 'p030', album: 'bw', ar: '1/1', hue: 220, l: 0.26, cam: 'Leica Q3',  lens: '28mm Summilux', ap: 'ƒ5.6',  sh: '1/500', iso: 'ISO 200',  loc: 'NYC · Central Park', date: '2026-03-04', tags: ['landscape', 'b&w'] },

  { id: 'p031', album: 'iceland', ar: '16/9', hue: 180, l: 0.34, cam: 'Fuji X-T5', lens: 'XF 16-55', ap: 'ƒ8',   sh: '1/250', iso: 'ISO 200', loc: 'Iceland · Vík',             date: '2024-09-21', tags: ['landscape', 'wide', 'color'] },
  { id: 'p032', album: 'iceland', ar: '3/2',  hue: 200, l: 0.32, cam: 'Fuji X-T5', lens: 'XF 16-55', ap: 'ƒ11',  sh: '1/125', iso: 'ISO 200', loc: 'Iceland · Reynisfjara',     date: '2024-09-22', tags: ['landscape', 'color'] },
  { id: 'p033', album: 'iceland', ar: '4/5',  hue: 170, l: 0.28, cam: 'Fuji X-T5', lens: 'XF 16-55', ap: 'ƒ8',   sh: '1/250', iso: 'ISO 200', loc: 'Iceland · Skógafoss',       date: '2024-09-23', tags: ['landscape', 'color'] },
  { id: 'p034', album: 'iceland', ar: '16/9', hue: 190, l: 0.30, cam: 'Fuji X-T5', lens: 'XF 16-55', ap: 'ƒ11',  sh: '1/500', iso: 'ISO 125', loc: 'Iceland · Landmannalaugar', date: '2024-09-25', tags: ['landscape', 'wide', 'color'] },
  { id: 'p035', album: 'iceland', ar: '3/2',  hue: 160, l: 0.24, cam: 'Fuji X-T5', lens: 'XF 16-55', ap: 'ƒ5.6', sh: '1/60',  iso: 'ISO 800', loc: 'Iceland · Vatnajökull',     date: '2024-09-27', tags: ['landscape', 'color'] },
];

const frames = FRAMES.map((f) => ({
  id: f.id,
  album: f.album,
  aspectRatio: f.ar,
  camera: f.cam,
  lens: f.lens,
  aperture: f.ap,
  shutter: f.sh,
  iso: f.iso,
  location: f.loc,
  date: f.date,
  tags: f.tags,
  image: { src: null, blurhash: null, placeholder: { hue: f.hue, lightness: f.l } },
  caption: null,
}));

const firstFrameOf = (id) => frames.find((f) => f.album === id)?.id ?? null;
const albums = ALBUMS.map((a) => ({
  id: a.id,
  title: a.title,
  subtitle: a.sub,
  location: a.loc,
  date: a.date,
  count: a.count,
  coverFrameId: firstFrameOf(a.id),
}));

const dataDir = new URL('./data/', import.meta.url);
mkdirSync(dataDir, { recursive: true });
writeFileSync(new URL('frames.json', dataDir), JSON.stringify(frames, null, 2) + '\n');
writeFileSync(new URL('albums.json', dataDir), JSON.stringify(albums, null, 2) + '\n');
console.log(`wrote ${frames.length} frames, ${albums.length} albums`);
