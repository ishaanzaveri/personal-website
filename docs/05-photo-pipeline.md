# Photo Pipeline

The photo page is driven by local source images, generated web derivatives, and
mock JSON that matches the eventual backend contract. The Go backend does not
participate in this pipeline.

## Directory Layout

```text
personal-website/
├─ images/                 # local originals, ignored by git
│  └─ Soccer/
│     └─ 23-Oct-IZ-UIUCMensClubSoccer-1005.jpg
├─ images-web/             # generated upload artifact, ignored by git
│  └─ prod/
│     └─ Soccer/
│        ├─ 23-Oct-IZ-UIUCMensClubSoccer-1005.jpg
│        ├─ 23-Oct-IZ-UIUCMensClubSoccer-1005-480.jpg
│        ├─ 23-Oct-IZ-UIUCMensClubSoccer-1005-960.jpg
│        ├─ 23-Oct-IZ-UIUCMensClubSoccer-1005-1440.jpg
│        └─ 23-Oct-IZ-UIUCMensClubSoccer-1005-2048.jpg
└─ frontend/
   ├─ scripts/photo-pipeline.mjs
   └─ mock-server/data/
      ├─ albums.json
      └─ frames.json
```

Source images live in `images/<Album Folder>/`. The album folder name becomes the
album title/id source, and each image filename becomes the frame id source.

## Requirements

- Node/npm from the frontend toolchain.
- ImageMagick `magick` on `PATH`.
- `exiftool` on `PATH` for best EXIF extraction.

The script can fall back to ImageMagick metadata if `exiftool` is missing, but
`exiftool` is preferred because it exposes cleaner camera, lens, ISO, date, and
dimension fields.

## Commands

Run commands from `frontend/`:

```bash
npm run photos:assets  # write resized JPEGs into ../images-web/prod
npm run photos:seed    # write mock-server/data/frames.json + albums.json
npm run photos:all     # run both steps
```

The public URL prefix defaults to:

```text
https://photos.ishaanzaveri.com/prod
```

Override it when needed:

```bash
PHOTO_BASE_URL=https://photos.example.com/prod npm run photos:seed
```

## Asset Generation

`photos:assets` scans `images/` for:

```text
.jpg .jpeg .png .tif .tiff .heic
```

For every source image it writes five JPEG files:

- canonical: `<filename>.jpg`
- variants: `-480.jpg`, `-960.jpg`, `-1440.jpg`, `-2048.jpg`

All outputs are auto-oriented, resized down only, stripped of metadata, and
written under `images-web/prod/<Album Folder>/`. Upload the contents of
`images-web/prod/` to the public Cloudflare photo bucket/domain.

## Mock Data Generation

`photos:seed` scans the same `images/` tree and writes:

- `frontend/mock-server/data/frames.json`
- `frontend/mock-server/data/albums.json`

Each frame includes:

- stable `id` from the filename stem
- `album` from the album folder slug
- EXIF-derived camera, lens, aperture, shutter, ISO, date, width, and height
- `aspectRatio` from image dimensions
- generated tags from album, year, orientation, and `photo`/`color`
- generated caption text
- `image.src` pointing at the canonical Cloudflare URL
- `image.variants` for responsive `srcset`

Missing EXIF values are allowed. The script writes safe display fallbacks such as
`unknown camera`, `unknown lens`, or `unknown date` rather than failing the run.

## Frontend Behavior

The frontend reads the mock API exactly like it will read the backend API later.
`FramePlate` renders:

- `src` as the canonical image URL
- `srcSet` from `image.variants`
- `sizes` based on display context: masonry, home strip, album hero, modal,
  detail page, or thumbnail
- `width` and `height` from the source dimensions
- placeholder gradient fallback when `image.src` is missing

Gallery thumbnails stay lazy-loaded. Album hero, modal, and detail-page primary
images are eager-loaded.

## Verification Flow

1. Put source files under `images/<Album Folder>/`.
2. Run `cd frontend && npm run photos:assets`.
3. Upload `images-web/prod/` to Cloudflare.
4. Run `cd frontend && npm run photos:seed`.
5. Run `cd frontend && npm run build`.
6. Run `cd frontend && npm run dev`.
7. Open `/photo` and confirm images load from
   `https://photos.ishaanzaveri.com/prod/...` with `srcset` variants.

`npm run lint` currently references `eslint`, but the repo does not install or
configure ESLint yet. Treat that as a separate tooling task before making lint a
required verification gate.
