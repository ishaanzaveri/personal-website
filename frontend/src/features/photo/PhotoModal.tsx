import { useEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { FramePlate } from '../../components/FramePlate';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { Frame } from '../../types';

const D = () => <span style={{ color: 'var(--text-dim)' }}>·</span>;

function chevStyle(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: 'clamp(8px, 2vw, 28px)',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text)',
    fontSize: 44,
    lineHeight: 1,
    padding: 10,
    fontFamily: 'inherit',
    fontWeight: 200,
    opacity: 0.55,
    zIndex: 3,
  };
}

// Borderless full-viewport lightbox rendered via a portal. Locks body scroll,
// traps focus, and supports Esc / ← / → (focus trap handles Esc + Tab).
export function PhotoModal({
  frame,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onExpand,
}: {
  frame: Frame;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onExpand: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, onClose);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext]);

  const f = frame;

  const overlay = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`frame ${f.id}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(2,4,6,0.92)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(20px, 5vh, 56px)',
        animation: 'photoModalIn 200ms var(--ease) both',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 18, right: 20, display: 'flex', gap: 8, alignItems: 'center', zIndex: 3 }}>
        <button
          onClick={onExpand}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 15px', cursor: 'pointer', background: 'rgba(8,12,16,0.6)', backdropFilter: 'blur(10px)', border: '1px solid var(--teal)', color: 'var(--teal-hi)', fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.12em' }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>⤢</span> EXPAND · FULL DETAIL
        </button>
        <button
          onClick={onClose}
          aria-label="close"
          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--rule-hi)', color: 'var(--text-hi)', background: 'rgba(8,12,16,0.6)', backdropFilter: 'blur(10px)', cursor: 'pointer', fontSize: 16, lineHeight: 1, fontFamily: 'inherit' }}
        >
          ×
        </button>
      </div>

      <button aria-label="previous frame" onClick={(e) => { e.stopPropagation(); onPrev(); }} style={chevStyle('left')}>
        ‹
      </button>
      <button aria-label="next frame" onClick={(e) => { e.stopPropagation(); onNext(); }} style={chevStyle('right')}>
        ›
      </button>

      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', maxWidth: 1500 }}>
        <div style={{ position: 'relative', aspectRatio: f.aspectRatio, maxWidth: '100%', maxHeight: 'calc(100% - 64px)', width: 'auto', height: '100%', boxShadow: '0 40px 120px -20px rgba(0,0,0,0.95)' }}>
          <FramePlate frame={f} />
        </div>
        <div
          style={{
            marginTop: 18,
            padding: '8px 18px',
            background: 'rgba(8,12,16,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--rule)',
            borderRadius: 999,
            display: 'inline-flex',
            gap: 14,
            alignItems: 'baseline',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--text)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '92vw',
          }}
        >
          <span style={{ color: 'var(--teal-hi)' }}>{f.location}</span>
          <D />
          <span>{f.camera}</span>
          <D />
          <span>{f.aperture}</span>
          <D />
          <span>{f.shutter}</span>
          <D />
          <span>{f.iso}</span>
          <D />
          <span style={{ color: 'var(--text-dim)' }}>{f.date}</span>
          <D />
          <span style={{ color: 'var(--text-dim)' }}>
            {index + 1} / {total}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
