import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FramePlate } from '../../components/FramePlate';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAlbum, useFrame } from '../../lib/queries';
import { captionFor } from '../../lib/format';
import { ErrorState, LoadingLines } from '../../components/States';
import type { Frame } from '../../types';

function BigStat({ label, value, small, last }: { label: string; value: string; small?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px', borderRight: last ? 'none' : '1px dashed var(--rule)' }}>
      <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.22em' }}>{label}</span>
      <span style={{ color: 'var(--teal-hi)', fontSize: small ? 13 : 22, fontWeight: 600, letterSpacing: '-0.005em' }}>{value}</span>
    </div>
  );
}

export default function PhotoDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: frame, isLoading, isError, error, refetch } = useFrame(id);
  const { data: album } = useAlbum(frame?.album ?? '');
  usePageTitle(frame ? `photo · ${frame.id}` : 'photo');

  const list: Frame[] = album?.frames ?? (frame ? [frame] : []);
  const index = list.findIndex((f) => f.id === id);
  const total = list.length;

  const step = (dir: number) => {
    if (index < 0 || total === 0) return;
    navigate(`/photo/${list[(index + dir + total) % total].id}`);
  };
  const back = () => navigate('/photo');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  if (isLoading) return <LoadingLines lines={10} style={{ paddingTop: 40 }} />;
  if (isError || !frame)
    return (
      <div style={{ paddingTop: 40 }}>
        <button onClick={back} style={{ color: 'var(--teal-hi)', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>
          ← ./photo
        </button>
        <ErrorState message={error?.message ?? 'frame not found'} onRetry={() => refetch()} style={{ marginTop: 16 }} />
      </div>
    );

  const f = frame;
  const cap = captionFor(f);
  const related = list.filter((x) => x.id !== f.id).slice(0, 6);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
        <span style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <button onClick={back} style={{ color: 'var(--teal-hi)', cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 11 }}>
            ← back
          </button>
          <span style={{ color: 'var(--rule-hi)' }}>·</span>
          <span style={{ color: 'var(--teal-hi)' }}>./photo</span>
          <span style={{ color: 'var(--rule-hi)' }}>/</span>
          <span style={{ color: 'var(--teal-hi)' }}>{f.album}</span>
          <span style={{ color: 'var(--rule-hi)' }}>/</span>
          <span style={{ color: 'var(--text-hi)' }}>{f.id}</span>
        </span>
        <span style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => step(-1)} style={{ color: 'var(--teal-hi)', cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 11 }}>
            ← prev
          </button>
          <span style={{ color: 'var(--text-dim)' }}>
            {index + 1} / {total}
          </span>
          <button onClick={() => step(1)} style={{ color: 'var(--teal-hi)', cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 11 }}>
            next →
          </button>
        </span>
      </div>

      <div style={{ background: '#02050a', border: '1px solid var(--rule)', padding: 'clamp(24px, 5vw, 60px)', display: 'flex', justifyContent: 'center' }}>
        <FramePlate
          frame={f}
          intent="detail"
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: 'min(calc(100vh - 260px), 660px)',
            boxShadow: '0 30px 80px -30px rgba(0,0,0,0.8), 0 0 0 1px var(--rule-hi)',
          }}
        />
      </div>

      <div style={{ maxWidth: 760, margin: '40px auto 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--teal)', fontSize: 11, letterSpacing: '0.22em', marginBottom: 10 }}>▸ {f.location.toUpperCase()}</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', margin: 0, lineHeight: 1.15 }}>{cap.title}</h1>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 12, letterSpacing: '0.06em' }}>
          {f.date} · shot on {f.camera}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '28px auto 0', padding: '14px 0', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', textAlign: 'center' }}>
        <BigStat label="ƒ" value={f.aperture.replace('ƒ', '')} />
        <BigStat label="SHUTTER" value={f.shutter} />
        <BigStat label="ISO" value={f.iso.replace('ISO ', '')} />
        <BigStat label="LENS" value={f.lens.split(' ')[0]} small />
        <BigStat label="FRAME" value={f.id.toUpperCase()} small last />
      </div>

      <div style={{ maxWidth: 640, margin: '36px auto 0', color: 'var(--text)', fontSize: 15, lineHeight: 1.85 }}>
        {cap.paragraphs.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '18px 0 0' }}>
            {p}
          </p>
        ))}
        {cap.note && <p style={{ marginTop: 18, color: 'var(--text-dim)', fontStyle: 'italic' }}>{cap.note}</p>}

        <div style={{ marginTop: 28, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {f.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, padding: '3px 10px', border: '1px solid var(--rule-hi)', color: 'var(--teal-hi)', letterSpacing: '0.08em' }}>
              #{t.replace(/\s+/g, '')}
            </span>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: 44, paddingTop: 18, borderTop: '1px dashed var(--rule)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ color: 'var(--teal)', fontSize: 11, letterSpacing: '0.18em' }}>▸ MORE FROM /{f.album}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {related.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/photo/${r.id}`)}
                aria-label={`open frame ${r.id}`}
                style={{ position: 'relative', aspectRatio: '3/2', border: '1px solid var(--rule)', cursor: 'pointer', overflow: 'hidden', padding: 0, background: 'transparent' }}
              >
                <FramePlate frame={r} intent="thumb" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
