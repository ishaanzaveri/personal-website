import type { ReactNode } from 'react';
import { Kbd } from '../../components/primitives';
import { FramePlate } from '../../components/FramePlate';
import type { Frame } from '../../types';

// ── Masonry tile (clickable) ──────────────────────────────────────────
export function MasonryFrame({ f, onOpen }: { f: Frame; onOpen: (f: Frame) => void }) {
  return (
    <button
      className="frame"
      onClick={() => onOpen(f)}
      aria-label={`open frame ${f.id}`}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        margin: '0 0 8px',
        breakInside: 'avoid',
        overflow: 'hidden',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        background: 'transparent',
      }}
    >
      <div style={{ width: '100%', aspectRatio: f.aspectRatio }}>
        <FramePlate frame={f} />
      </div>
      <div
        className="frame-veil"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 50%, rgba(4,8,10,0.85) 100%)' }}
      />
      <div className="frame-id" style={{ position: 'absolute', top: 8, left: 10, fontSize: 9, color: 'var(--teal-hi)', letterSpacing: '0.18em' }}>
        ▸ {f.id.toUpperCase()}
      </div>
      <figcaption
        className="frame-exif"
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 8,
          fontSize: 10,
          color: 'var(--text)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span style={{ color: 'var(--teal-hi)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.camera}</span>
        <span style={{ color: 'var(--text-mid)' }}>
          {f.aperture} · {f.shutter}
        </span>
      </figcaption>
    </button>
  );
}

// ── Sub-page tabs (gallery / albums) ──────────────────────────────────
export function PhotoSubNav({
  active,
  crumb,
  frameCount,
  albumCount,
  onNav,
}: {
  active: 'gallery' | 'albums';
  crumb?: string | null;
  frameCount: number;
  albumCount: number;
  onNav: (id: 'gallery' | 'albums') => void;
}) {
  const tabs = [
    { id: 'gallery' as const, path: './photo', label: 'gallery', count: frameCount },
    { id: 'albums' as const, path: './photo/albums', label: 'albums', count: albumCount },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--rule)', marginBottom: 24 }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onNav(t.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '14px 22px 12px',
              cursor: 'pointer',
              background: on ? 'var(--panel)' : 'transparent',
              borderLeft: `1px solid ${on ? 'var(--rule)' : 'transparent'}`,
              borderRight: `1px solid ${on ? 'var(--rule)' : 'transparent'}`,
              borderTop: `1px solid ${on ? 'var(--teal)' : 'transparent'}`,
              borderBottom: `1px solid ${on ? 'var(--panel)' : 'transparent'}`,
              marginBottom: -1,
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.06em', color: on ? 'var(--teal-hi)' : 'var(--text-mid)' }}>{t.path}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 14, color: on ? 'var(--text-hi)' : 'var(--text-mid)' }}>
              <span style={{ fontWeight: 600, letterSpacing: '-0.005em' }}>{t.label}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: '0.08em' }}>{t.count}</span>
            </span>
          </button>
        );
      })}
      {crumb && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', fontSize: 12, color: 'var(--text-mid)', letterSpacing: '0.04em' }}>
          <span style={{ color: 'var(--rule-hi)' }}>/</span>
          <span style={{ color: 'var(--text-hi)' }}>{crumb}</span>
        </div>
      )}
      <span style={{ flex: 1 }} />
    </div>
  );
}

// ── Search + tag filter band ──────────────────────────────────────────
export function SearchBand({
  query,
  onQuery,
  activeTags,
  onToggleTag,
  onClear,
  allTags,
  scope,
  onClearScope,
}: {
  query: string;
  onQuery: (q: string) => void;
  activeTags: string[];
  onToggleTag: (t: string) => void;
  onClear: () => void;
  allTags: string[];
  scope?: string;
  onClearScope?: () => void;
}) {
  const dirty = query.length > 0 || activeTags.length > 0;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--rule-hi)', background: '#04070a' }}>
        <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', color: 'var(--teal-hi)', fontSize: 16, lineHeight: 1, borderRight: '1px solid var(--rule)' }}>›</span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="search photos · tag, location, camera, caption…"
          aria-label="search photos"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-hi)', fontFamily: 'inherit', fontSize: 14, padding: '12px 14px' }}
        />
        {query ? (
          <button onClick={() => onQuery('')} aria-label="clear search" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '0 14px', fontFamily: 'inherit', fontSize: 13 }}>
            ✗
          </button>
        ) : (
          <span style={{ alignSelf: 'center', display: 'flex', gap: 4, padding: '0 12px', color: 'var(--text-dim)', fontSize: 10 }}>
            <Kbd>⌘</Kbd>
            <Kbd>/</Kbd>
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 4px 0' }}>
        {scope && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 4px 4px 12px', border: '1px solid var(--amber)', color: 'var(--amber)', fontSize: 11, letterSpacing: '0.04em', background: 'rgba(245,158,11,0.07)' }}>
            <span>
              <span style={{ color: 'var(--text-dim)' }}>album:</span> {scope}
            </span>
            <button onClick={onClearScope} aria-label="clear album scope" style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--rule)', color: 'var(--text-dim)', cursor: 'pointer', lineHeight: 1, background: 'transparent', fontFamily: 'inherit' }}>
              ×
            </button>
          </span>
        )}
        {allTags.map((t) => {
          const on = activeTags.includes(t);
          return (
            <button
              key={t}
              onClick={() => onToggleTag(t)}
              aria-pressed={on}
              style={{
                padding: '2px 9px',
                cursor: 'pointer',
                fontSize: 11,
                letterSpacing: '0.04em',
                fontFamily: 'inherit',
                border: `1px solid ${on ? 'var(--teal)' : 'var(--rule)'}`,
                color: on ? 'var(--teal-hi)' : 'var(--text-mid)',
                background: on ? 'rgba(20,184,166,0.07)' : 'transparent',
              }}
            >
              #{t}
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        {dirty && (
          <button onClick={onClear} style={{ color: 'var(--rose)', fontSize: 11, letterSpacing: '0.08em', padding: '2px 8px', border: '1px solid var(--rule)', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit' }}>
            ✗ clear
          </button>
        )}
      </div>
    </div>
  );
}

export function ResultMeta({ count, total, cols }: { count: number; total?: number; cols: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', margin: '4px 2px 14px' }}>
      <span>
        ▸{' '}
        <span style={{ color: 'var(--teal-hi)' }}>
          {count} {count === 1 ? 'frame' : 'frames'}
        </span>
        {total != null && total !== count ? <> / {total}</> : null} · sorted by recency
      </span>
      <span style={{ display: 'flex', gap: 14 }}>
        <span>
          view: <span style={{ color: 'var(--teal-hi)' }}>masonry</span>
        </span>
        <span>
          columns: <span style={{ color: 'var(--text)' }}>{cols}</span>
        </span>
      </span>
    </div>
  );
}

export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)', border: '1px dashed var(--rule)', fontSize: 13 }}>
      <div style={{ color: 'var(--text-mid)', fontStyle: 'italic', marginBottom: 12 }}>// no frames match that filter.</div>
      <button onClick={onClear} style={{ color: 'var(--teal-hi)', cursor: 'pointer', letterSpacing: '0.08em', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 13 }}>
        ✗ clear filters
      </button>
    </div>
  );
}

export function HeroStat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 14, marginTop: 3, color: accent ? 'var(--teal-hi)' : 'var(--text-hi)' }}>{value}</div>
    </div>
  );
}
