import { useState, type CSSProperties } from 'react';
import type { Frame } from '../types';
import { frameBg, frameAlt } from '../lib/format';

type FramePlateIntent = 'masonry' | 'home' | 'albumHero' | 'albumPeek' | 'modal' | 'detail' | 'thumb';

const SIZES: Record<FramePlateIntent, string> = {
  masonry: '(max-width: 759px) 50vw, 33vw',
  home: '(max-width: 759px) 50vw, 25vw',
  albumHero: '100vw',
  albumPeek: '(max-width: 759px) 33vw, 20vw',
  modal: '100vw',
  detail: '(max-width: 1100px) 100vw, 980px',
  thumb: '(max-width: 759px) 33vw, 160px',
};

const OBJECT_FIT: Record<FramePlateIntent, CSSProperties['objectFit']> = {
  masonry: 'cover',
  home: 'cover',
  albumHero: 'cover',
  albumPeek: 'cover',
  modal: 'contain',
  detail: 'contain',
  thumb: 'cover',
};

export function FramePlate(props: FramePlateProps) {
  return <FrameSurface key={props.frame.image.src ?? props.frame.id} {...props} />;
}

interface FramePlateProps {
  frame: Frame;
  intent?: FramePlateIntent;
  loading?: 'eager' | 'lazy';
  style?: CSSProperties;
}

function FrameSurface({
  frame,
  intent = 'masonry',
  loading,
  style,
}: FramePlateProps) {
  const [failed, setFailed] = useState(false);
  if (frame.image.src && !failed) {
    const srcSet = frame.image.variants
      ?.filter((variant) => variant.src && variant.width > 0)
      .sort((a, b) => a.width - b.width)
      .map((variant) => `${variant.src} ${variant.width}w`)
      .join(', ');

    return (
      <img
        src={frame.image.src}
        srcSet={srcSet || undefined}
        sizes={srcSet ? SIZES[intent] : undefined}
        width={frame.image.width}
        height={frame.image.height}
        alt={frameAlt(frame)}
        loading={loading ?? (intent === 'modal' || intent === 'detail' || intent === 'albumHero' ? 'eager' : 'lazy')}
        decoding="async"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: OBJECT_FIT[intent], background: frameBg(frame), display: 'block', ...style }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={failed ? `${frameAlt(frame)} — image unavailable` : frameAlt(frame)}
      style={{
        position: 'relative',
        aspectRatio: frame.aspectRatio,
        minHeight: 120,
        width: '100%',
        height: '100%',
        background: frameBg(frame),
        overflow: 'hidden',
        ...style,
      }}
    >
      {failed && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-hi)', fontSize: 11 }}>// image unavailable</span>}
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
