import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import styles from './primitives.module.css';

// ===== Wordmark =====
type WordmarkVariant = 'primary' | 'compact' | 'monogram';

export function Wordmark({ variant = 'primary', size = 13 }: { variant?: WordmarkVariant; size?: number }) {
  if (variant === 'compact') {
    return (
      <span style={{ fontWeight: 700, fontSize: size, color: 'var(--text-hi)', letterSpacing: '0.04em' }}>
        ISHAAN <span style={{ color: 'var(--amber)' }}>Z</span>
      </span>
    );
  }
  if (variant === 'monogram') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size * 2.2,
          height: size * 2.2,
          border: '1.5px solid var(--teal-hi)',
          fontWeight: 700,
          fontSize: size,
          color: 'var(--text-hi)',
          borderRadius: 'var(--r-2)',
        }}
      >
        I<span style={{ color: 'var(--amber)' }}>Z</span>
      </span>
    );
  }
  // primary: ASCII box rendered as inline SVG for pixel-perfect corners at any size.
  const h = size * 3.6;
  return (
    <svg
      viewBox="0 0 320 120"
      width={h * (320 / 120)}
      height={h}
      style={{ display: 'block', shapeRendering: 'geometricPrecision' }}
      aria-label="ISHAAN Z"
    >
      <g fontFamily="'JetBrains Mono', ui-monospace, monospace" fontWeight="700" fontSize="32" style={{ fontVariantLigatures: 'none' }}>
        <text x="40" y="46" fill="var(--teal-hi)" xmlSpace="preserve">┌────────────┐</text>
        <text x="40" y="78" xmlSpace="preserve">
          <tspan fill="var(--teal-hi)">│ </tspan>
          <tspan fill="var(--text-hi)">ISHAAN</tspan>
          <tspan fill="var(--teal-hi)" xmlSpace="preserve">   </tspan>
          <tspan fill="var(--amber)">Z</tspan>
          <tspan fill="var(--teal-hi)" xmlSpace="preserve"> │</tspan>
        </text>
        <text x="40" y="110" fill="var(--teal-hi)" xmlSpace="preserve">└────────────┘</text>
      </g>
    </svg>
  );
}

// ===== Bracket =====
export function Bracket({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[styles.bracket, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

// ===== Tile =====
export function Tile({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[styles.tile, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

// ===== Tag =====
export function Tag({ children, color = 'var(--teal-hi)' }: { children: ReactNode; color?: string }) {
  return (
    <span className={styles.tag} style={{ color }}>
      {children}
    </span>
  );
}

// ===== Btn =====
type BtnVariant = 'default' | 'pri' | 'ghost' | 'warn' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

const variantClass: Record<BtnVariant, string> = {
  default: '',
  pri: styles.variantPri,
  ghost: styles.variantGhost,
  warn: styles.variantWarn,
  danger: styles.variantDanger,
};
const sizeClass: Record<BtnSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export function Btn({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...rest
}: { variant?: BtnVariant; size?: BtnSize } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[styles.btn, sizeClass[size], variantClass[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

// ===== Kbd =====
export function Kbd({ children }: { children: ReactNode }) {
  return <span className={styles.kbd}>{children}</span>;
}

// ===== Prompt =====
export function Prompt({ path = '~/site', children }: { path?: string; children?: ReactNode }) {
  return (
    <span>
      <span style={{ color: 'var(--teal-hi)' }}>iz@web</span>
      <span style={{ color: 'var(--text-dim)' }}>:</span>
      <span style={{ color: 'var(--text-hi)' }}>{path}</span>
      <span style={{ color: 'var(--text-dim)' }}>$ </span>
      {children}
    </span>
  );
}

// ===== Cursor =====
export function Cursor() {
  return <span aria-hidden className={styles.cursor} />;
}

// ===== Status =====
type StatusKind = 'shipped' | 'progress' | 'archived';
const statusMap: Record<StatusKind, { color: string; label: string }> = {
  shipped: { color: 'var(--teal-hi)', label: '● shipped' },
  progress: { color: 'var(--amber)', label: '● in progress' },
  archived: { color: 'var(--text-dim)', label: '● archived' },
};

export function Status({ kind = 'shipped' }: { kind?: StatusKind }) {
  const s = statusMap[kind] ?? statusMap.shipped;
  return <span style={{ color: s.color, fontSize: 10, letterSpacing: '0.05em' }}>{s.label}</span>;
}

// ===== SectionH =====
export function SectionH({ num, title, side }: { num: string; title: string; side?: ReactNode }) {
  return (
    <div className={styles.sectionH}>
      <span className={styles.sectionHNum}>◢ {num}</span>
      <h2 className={styles.sectionHTitle}>{title}</h2>
      <span className={styles.sectionHRule} />
      {side && <span className={styles.sectionHSide}>{side}</span>}
    </div>
  );
}
