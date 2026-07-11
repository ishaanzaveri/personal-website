// API data contracts — mirror ../docs/01-backend-api-routes.md.

export interface Site {
  version: string;
  updated: string;
  hero: { prompts: string[]; tagline: string };
  now: { updatedCadence: string; body: string; tags: string[] };
  socials: { key: string; label: string; url: string }[];
  build: { branch: string; lastCommit: string };
}

export interface About {
  title: string;
  subtitle: string;
  filename: string;
  format: string;
  source: string;
  encoding: string;
  eol: string;
}

export type ProjectStatus = 'shipped' | 'progress' | 'archived';

export interface Project {
  slug: string;
  name: string;
  blurb: string;
  stack: string[];
  status: ProjectStatus;
  metric: string;
  readmeUrl: string;
  order: number;
  /** Present only on the detail endpoint (/api/projects/:slug). */
  readme?: string;
}

export type PostTag = 'systems' | 'security' | 'photo' | 'notes';

export interface SelectedWorkMeta {
  enabled: boolean;
  status: ProjectStatus;
  metric: string;
  stack: string[];
  order: number;
}

/** List shape from /api/posts. */
export interface PostSummary {
  slug: string;
  date: string;
  tag: PostTag;
  title: string;
  blurb: string;
  readMinutes: number;
  selectedWork?: SelectedWorkMeta;
}

/** Full post from /api/posts/:slug. */
export interface Post extends PostSummary {
  words: number;
  commit: string;
  tags: string[];
  body: string;
}

export interface Album {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  date: string;
  count: number;
  coverFrameId: string | null;
}

export interface FrameImage {
  src: string | null;
  variants?: { width: number; src: string }[];
  width?: number;
  height?: number;
  filename?: string;
  blurhash: string | null;
  placeholder: { hue: number; lightness: number };
}

export interface FrameCaption {
  title: string;
  paragraphs: string[];
  note?: string;
}

export interface Frame {
  id: string;
  album: string;
  aspectRatio: string;
  camera: string;
  lens: string;
  aperture: string;
  shutter: string;
  iso: string;
  location: string;
  date: string;
  tags: string[];
  image: FrameImage;
  caption: FrameCaption | null;
}

export interface AlbumDetail extends Album {
  frames: Frame[];
  meta: { total: number };
}

export interface FramesResponse {
  data: Frame[];
  meta: { total: number; filteredBy: { tag: string[]; q: string } };
}

export interface AlbumsResponse {
  data: Album[];
  meta: { total: number };
}

export interface FrameFacets {
  tags: string[];
  locations: string[];
  cameras: string[];
}
