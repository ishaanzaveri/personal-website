import type { CSSProperties } from 'react';
import type { Frame } from '../types';
import { frameBg, frameAlt } from '../lib/format';

// Frame placeholder surface: a deterministic gradient + subtle diagonal grain.
// When real images land, render the <img> (with srcset) and keep this as the
// blurhash/LQIP loading shim. For now image.src is null, so the gradient is it.
export function FramePlate({ frame, style }: { frame: Frame; style?: CSSProperties }) {
  if (frame.image.src) {
    return (
      <img
        src={frame.image.src}
        alt={frameAlt(frame)}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={frameAlt(frame)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: frameBg(frame),
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0, transparent 5px, rgba(255,255,255,0.018) 5px, rgba(255,255,255,0.018) 6px)',
        }}
      />
    </div>
  );
}
