import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Cursor } from '../../components/primitives';
import { FramePlate } from '../../components/FramePlate';
import { useViewport } from '../../hooks/useViewport';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAlbums, useFrameFacets, useFrames } from '../../lib/queries';
import { ErrorState, LoadingLines } from '../../components/States';
import type { Album, Frame } from '../../types';
import { HeroStat, MasonryFrame, NoResults, PhotoSubNav, ResultMeta, SearchBand } from './shared';
import { PhotoModal } from './PhotoModal';

type Mode = 'gallery' | 'albums' | 'album';

export default function Photo({ mode }: { mode: Mode }) {
  usePageTitle(mode === 'albums' ? 'photo · albums' : 'photo · gallery');
  const navigate = useNavigate();
  const { albumId = '' } = useParams();
  const { mobile } = useViewport();
  const cols = mobile ? 2 : 3;

  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const activeTags = params.getAll('tag');

  const { data: facets } = useFrameFacets();
  const { data: albumsResp } = useAlbums();
  const albums = albumsResp?.data ?? [];

  const framesParams = useMemo(
    () =>
      mode === 'albums'
        ? {}
        : { album: mode === 'album' ? albumId : undefined, q: query || undefined, tag: activeTags.length ? activeTags : undefined },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, albumId, query, activeTags.join(',')],
  );
  const { data: framesResp, isLoading, isError, error, refetch } = useFrames(framesParams);
  const frames = framesResp?.data ?? [];

  // ── URL-driven filter mutations ─────────────────────────────────────
  const setQuery = useCallback(
    (q: string) => {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q);
      else next.delete('q');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const toggleTag = useCallback(
    (t: string) => {
      const next = new URLSearchParams(params);
      const current = next.getAll('tag');
      next.delete('tag');
      const updated = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
      updated.forEach((x) => next.append('tag', x));
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('q');
    next.delete('tag');
    setParams(next, { replace: true });
  }, [params, setParams]);

  // ── Modal (local, ephemeral) ────────────────────────────────────────
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const openModal = (f: Frame) => setModalIndex(frames.findIndex((x) => x.id === f.id));
  const closeModal = () => setModalIndex(null);
  const stepModal = (dir: number) =>
    setModalIndex((i) => (i == null ? i : (i + dir + frames.length) % frames.length));
  const expand = () => {
    if (modalIndex != null) navigate(`/photo/${frames[modalIndex].id}`);
  };

  const onNav = (id: 'gallery' | 'albums') => navigate(id === 'gallery' ? '/photo' : '/photo/albums');
  const album = albums.find((a) => a.id === albumId);
  const totalFrames = albums.reduce((sum, a) => sum + a.count, 0);

  return (
    <div>
      <PhotoSubNav
        active={mode === 'album' ? 'albums' : mode}
        crumb={mode === 'album' ? album?.title : null}
        frameCount={totalFrames}
        albumCount={albumsResp?.meta.total ?? albums.length}
        onNav={onNav}
      />

      {isError && <ErrorState message={error?.message} onRetry={() => refetch()} />}

      {mode === 'gallery' && (
        <GalleryView
          cols={cols}
          frames={frames}
          total={framesResp?.meta.total}
          isLoading={isLoading}
          query={query}
          activeTags={activeTags}
          allTags={facets?.tags ?? []}
          onQuery={setQuery}
          onToggleTag={toggleTag}
          onClear={clearFilters}
          onOpen={openModal}
        />
      )}

      {mode === 'albums' && <AlbumsView albums={albums} frames={frames} isLoading={isLoading} />}

      {mode === 'album' &&
        (album ? (
          <AlbumView
            cols={cols}
            album={album}
            albums={albums}
            frames={frames}
            total={framesResp?.meta.total}
            isLoading={isLoading}
            query={query}
            activeTags={activeTags}
            allTags={facets?.tags ?? []}
            onQuery={setQuery}
            onToggleTag={toggleTag}
            onClear={clearFilters}
            onOpen={openModal}
          />
        ) : (
          !isLoading && <ErrorState message={`no album '${albumId}'`} />
        ))}

      {modalIndex != null && frames[modalIndex] && (
        <PhotoModal
          frame={frames[modalIndex]}
          index={modalIndex}
          total={frames.length}
          onClose={closeModal}
          onPrev={() => stepModal(-1)}
          onNext={() => stepModal(1)}
          onExpand={expand}
        />
      )}
    </div>
  );
}

// ── GALLERY (all photos) ────────────────────────────────────────────────
function GalleryView(props: {
  cols: number;
  frames: Frame[];
  total?: number;
  isLoading: boolean;
  query: string;
  activeTags: string[];
  allTags: string[];
  onQuery: (q: string) => void;
  onToggleTag: (t: string) => void;
  onClear: () => void;
  onOpen: (f: Frame) => void;
}) {
  const { cols, frames, total, isLoading, query, activeTags, allTags, onQuery, onToggleTag, onClear, onOpen } = props;
  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.015em', margin: 0, lineHeight: 1.1 }}>
          <span style={{ color: 'var(--teal-hi)' }}>$ </span>ls -la photo/
          <Cursor />
        </h1>
        <p style={{ color: 'var(--text-mid)', fontSize: 13, margin: '8px 0 0', maxWidth: 700, lineHeight: 1.7 }}>
          Everything I've shot, in one place. Search by tag, location, camera, or caption — click any frame to open it.{' '}
          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// placeholder frames — real shots later.</span>
        </p>
      </header>

      <SearchBand query={query} onQuery={onQuery} activeTags={activeTags} onToggleTag={onToggleTag} onClear={onClear} allTags={allTags} />
      <ResultMeta count={frames.length} total={total} cols={cols} />

      {isLoading ? (
        <LoadingLines lines={6} />
      ) : frames.length === 0 ? (
        <NoResults onClear={onClear} />
      ) : (
        <div style={{ columnCount: cols, columnGap: 8 }}>
          {frames.map((f) => (
            <MasonryFrame key={f.id} f={f} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ALBUMS (teaser of each) ─────────────────────────────────────────────
function AlbumsView({ albums, frames, isLoading }: { albums: Album[]; frames: Frame[]; isLoading: boolean }) {
  const navigate = useNavigate();
  const open = (id: string) => navigate(`/photo/albums/${id}`);
  const framesByAlbum = useMemo(() => {
    const m: Record<string, Frame[]> = {};
    for (const f of frames) (m[f.album] ??= []).push(f);
    return m;
  }, [frames]);

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.015em', margin: 0, lineHeight: 1.1 }}>
          <span style={{ color: 'var(--teal-hi)' }}>$ </span>ls albums/
        </h1>
        <p style={{ color: 'var(--text-mid)', fontSize: 13, margin: '8px 0 0', maxWidth: 700, lineHeight: 1.7 }}>
          Trips, series, and themes. Each album shows a few frames — click any one to open the full album.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28, padding: '10px 14px', background: 'var(--panel)', border: '1px solid var(--rule)', fontSize: 11, letterSpacing: '0.04em' }}>
        <span style={{ color: 'var(--text-dim)', letterSpacing: '0.18em', alignSelf: 'center' }}>JUMP ─</span>
        {albums.map((a) => (
          <button key={a.id} onClick={() => open(a.id)} style={{ padding: '3px 10px', border: '1px solid var(--rule-hi)', color: 'var(--teal-hi)', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit', fontSize: 11 }}>
            {a.title.split(' — ')[0].split(' · ')[0].toLowerCase()} <span style={{ color: 'var(--text-dim)' }}>·{a.count}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingLines lines={6} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {albums.map((a) => (
            <AlbumTeaserBlock key={a.id} album={a} frames={framesByAlbum[a.id] ?? []} onOpen={() => open(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumTeaserBlock({ album, frames, onOpen }: { album: Album; frames: Frame[]; onOpen: () => void }) {
  const ordered = [...frames].sort((a, b) => (a.id < b.id ? -1 : 1));
  const hero = ordered[0];
  const peek = ordered.slice(1, 4);
  if (!hero) return null;
  return (
    <section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'baseline', marginBottom: 14, borderBottom: '1px dashed var(--rule)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--teal)', fontSize: 10, letterSpacing: '0.2em' }}>▸ /albums/{album.id}</div>
            <button onClick={onOpen} style={{ color: 'var(--text-hi)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.005em', margin: '4px 0 0', lineHeight: 1.1, cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
              {album.title}
            </button>
          </div>
          <div style={{ color: 'var(--text-mid)', fontSize: 13, lineHeight: 1.45 }}>
            {album.subtitle}
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2, letterSpacing: '0.04em' }}>
              {album.location} · {album.date}
            </div>
          </div>
        </div>
        <button onClick={onOpen} style={{ color: 'var(--teal-hi)', fontSize: 11, letterSpacing: '0.1em', padding: '6px 12px', border: '1px solid var(--teal)', whiteSpace: 'nowrap', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit' }}>
          SEE ALBUM · {album.count} →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <button className="frame" onClick={onOpen} aria-label={`open album ${album.id}`} style={{ position: 'relative', margin: 0, overflow: 'hidden', cursor: 'pointer', border: 'none', padding: 0, background: 'transparent' }}>
          <div style={{ width: '100%', aspectRatio: hero.aspectRatio }}>
            <FramePlate frame={hero} />
          </div>
          <div className="frame-veil" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 50%, rgba(4,8,10,0.85) 100%)' }} />
          <div className="frame-id" style={{ position: 'absolute', top: 10, left: 12, fontSize: 10, color: 'var(--teal-hi)', letterSpacing: '0.18em' }}>▸ {hero.id.toUpperCase()}</div>
        </button>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: 8 }}>
          {peek.map((f) => (
            <button key={f.id} className="frame" onClick={onOpen} aria-label={`open album ${album.id}`} style={{ position: 'relative', margin: 0, overflow: 'hidden', cursor: 'pointer', border: 'none', padding: 0, background: 'transparent' }}>
              <div style={{ width: '100%', height: '100%', minHeight: 96 }}>
                <FramePlate frame={f} />
              </div>
              <div className="frame-id" style={{ position: 'absolute', top: 6, left: 8, fontSize: 9, color: 'var(--teal-hi)', letterSpacing: '0.14em' }}>{f.id.toUpperCase()}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── ALBUM (opened, scoped gallery) ──────────────────────────────────────
function AlbumView(props: {
  cols: number;
  album: Album;
  albums: Album[];
  frames: Frame[];
  total?: number;
  isLoading: boolean;
  query: string;
  activeTags: string[];
  allTags: string[];
  onQuery: (q: string) => void;
  onToggleTag: (t: string) => void;
  onClear: () => void;
  onOpen: (f: Frame) => void;
}) {
  const { cols, album, albums, frames, total, isLoading, query, activeTags, allTags, onQuery, onToggleTag, onClear, onOpen } = props;
  const navigate = useNavigate();
  const hero = frames[0];
  const i = albums.findIndex((a) => a.id === album.id);
  const prevA = albums[(i - 1 + albums.length) % albums.length];
  const nextA = albums[(i + 1) % albums.length];
  const shortName = (a?: Album) => a?.title.split(' — ')[0].split(' · ')[0] ?? '';

  return (
    <div>
      <div style={{ position: 'relative', border: '1px solid var(--rule-hi)', overflow: 'hidden', marginBottom: 22, aspectRatio: '21/9', minHeight: 360 }}>
        {hero && <FramePlate frame={hero} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(4,7,10,0.85) 0%, rgba(4,7,10,0.45) 50%, transparent 100%)' }} />
        <div style={{ position: 'absolute', top: 24, left: 28, right: 28, bottom: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--teal-hi)', fontSize: 11, letterSpacing: '0.2em' }}>▸ ALBUM · /albums/{album.id}</div>
            <h1 style={{ color: 'var(--text-hi)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.015em', margin: '8px 0 0', lineHeight: 1.05 }}>{album.title}</h1>
            <div style={{ color: 'var(--text)', fontSize: 14, marginTop: 8, maxWidth: 600 }}>{album.subtitle}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 24, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            <HeroStat label="LOCATION" value={album.location} />
            <HeroStat label="SHOT" value={album.date} />
            <HeroStat label="FRAMES" value={album.count} accent />
            <HeroStat label="CAMERA" value={hero?.camera ?? '—'} />
          </div>
        </div>
        <button onClick={() => navigate('/photo/albums')} style={{ position: 'absolute', top: 16, right: 18, fontSize: 11, color: 'var(--teal-hi)', letterSpacing: '0.1em', cursor: 'pointer', background: 'rgba(4,7,10,0.6)', padding: '4px 10px', border: '1px solid var(--rule-hi)', fontFamily: 'inherit' }}>
          ← back to /albums
        </button>
      </div>

      <SearchBand query={query} onQuery={onQuery} activeTags={activeTags} onToggleTag={onToggleTag} onClear={onClear} allTags={allTags} scope={album.title} onClearScope={() => navigate('/photo/albums')} />
      <ResultMeta count={frames.length} total={total} cols={cols} />

      {isLoading ? (
        <LoadingLines lines={6} />
      ) : frames.length === 0 ? (
        <NoResults onClear={onClear} />
      ) : (
        <div style={{ columnCount: cols, columnGap: 8 }}>
          {frames.map((f) => (
            <MasonryFrame key={f.id} f={f} onOpen={onOpen} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 36, padding: '16px 18px', background: 'var(--panel)', border: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-mid)', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(`/photo/albums/${prevA.id}`)} style={{ color: 'var(--teal-hi)', cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 12 }}>
          ← prev · {shortName(prevA)}
        </button>
        <span style={{ color: 'var(--text-dim)' }}>
          album {i + 1} / {albums.length}
        </span>
        <button onClick={() => navigate(`/photo/albums/${nextA.id}`)} style={{ color: 'var(--teal-hi)', cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 12 }}>
          {shortName(nextA)} · next →
        </button>
      </div>
    </div>
  );
}
