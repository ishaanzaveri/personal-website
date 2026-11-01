CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT,
  version TEXT NOT NULL,
  updated TEXT NOT NULL,
  hero_tagline TEXT NOT NULL,
  hero_prompts TEXT NOT NULL CHECK (json_valid(hero_prompts) AND json_type(hero_prompts) = 'array'),
  now_body TEXT NOT NULL,
  now_cadence TEXT NOT NULL,
  now_tags TEXT NOT NULL CHECK (json_valid(now_tags) AND json_type(now_tags) = 'array')
) STRICT;

CREATE TABLE social_links (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0)
) STRICT;

CREATE TABLE about_page (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  filename TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format = 'markdown'),
  source TEXT NOT NULL,
  encoding TEXT NOT NULL CHECK (encoding = 'utf-8'),
  eol TEXT NOT NULL CHECK (eol IN ('lf', 'crlf'))
) STRICT;

CREATE TABLE posts (
  slug TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('systems', 'security', 'photo', 'notes')),
  title TEXT NOT NULL,
  blurb TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE post_tags (
  post_slug TEXT NOT NULL REFERENCES posts(slug) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (post_slug, tag)
) STRICT;

CREATE TABLE post_selected_work (
  post_slug TEXT PRIMARY KEY REFERENCES posts(slug) ON DELETE CASCADE,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('shipped', 'progress', 'archived')),
  metric TEXT NOT NULL,
  position INTEGER NOT NULL,
  stack TEXT NOT NULL CHECK (json_valid(stack) AND json_type(stack) = 'array')
) STRICT;

CREATE TABLE projects (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('shipped', 'progress', 'archived')),
  metric TEXT NOT NULL,
  position INTEGER NOT NULL,
  stack TEXT NOT NULL CHECK (json_valid(stack) AND json_type(stack) = 'array'),
  readme_url TEXT NOT NULL,
  readme TEXT NOT NULL
) STRICT;

CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  location TEXT NOT NULL,
  date TEXT,
  cover_frame_id TEXT,
  position INTEGER NOT NULL CHECK (position >= 0),
  FOREIGN KEY (cover_frame_id, id) REFERENCES frames(id, album_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE TABLE frames (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  aspect_ratio TEXT NOT NULL,
  camera TEXT NOT NULL,
  lens TEXT NOT NULL,
  aperture TEXT NOT NULL,
  shutter TEXT NOT NULL,
  iso TEXT NOT NULL,
  location TEXT NOT NULL,
  date TEXT,
  position INTEGER NOT NULL CHECK (position >= 0),
  UNIQUE (id, album_id)
) STRICT;

CREATE TABLE frame_tags (
  frame_id TEXT NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (frame_id, tag)
) STRICT;

CREATE TABLE frame_images (
  frame_id TEXT PRIMARY KEY REFERENCES frames(id) ON DELETE CASCADE,
  src TEXT,
  width INTEGER CHECK (width > 0),
  height INTEGER CHECK (height > 0),
  filename TEXT,
  alt TEXT,
  blurhash TEXT,
  placeholder_hue REAL NOT NULL CHECK (placeholder_hue >= 0 AND placeholder_hue <= 360),
  placeholder_lightness REAL NOT NULL CHECK (placeholder_lightness >= 0 AND placeholder_lightness <= 1)
) STRICT;

CREATE TABLE image_variants (
  frame_id TEXT NOT NULL REFERENCES frame_images(frame_id) ON DELETE CASCADE,
  width INTEGER NOT NULL CHECK (width > 0),
  src TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (frame_id, width)
) STRICT;

CREATE TABLE frame_captions (
  frame_id TEXT PRIMARY KEY REFERENCES frames(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  paragraphs TEXT NOT NULL CHECK (json_valid(paragraphs) AND json_type(paragraphs) = 'array'),
  note TEXT
) STRICT;

CREATE INDEX posts_date ON posts(date);
CREATE INDEX posts_category_date ON posts(category, date);
CREATE INDEX projects_status_position ON projects(status, position);
CREATE INDEX frames_date ON frames(date);
CREATE INDEX frames_album_date ON frames(album_id, date);
CREATE INDEX frame_tags_tag_frame ON frame_tags(tag, frame_id);
CREATE INDEX post_tags_tag_post ON post_tags(tag, post_slug);
