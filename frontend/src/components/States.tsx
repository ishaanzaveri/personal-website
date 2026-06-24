import type { CSSProperties } from 'react';
import { Btn } from './primitives';

// Shared loading / error / empty states for data-driven views.

export function LoadingLines({ lines = 4, style }: { lines?: number; style?: CSSProperties }) {
  return (
    <div role="status" aria-live="polite" style={style}>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Loading…
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              height: 12,
              width: `${90 - (i % 4) * 12}%`,
              background: 'linear-gradient(90deg, var(--panel) 0%, var(--panel-hi) 50%, var(--panel) 100%)',
              borderRadius: 'var(--r-2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  style,
}: {
  message?: string;
  onRetry?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div role="alert" style={{ color: 'var(--text-mid)', fontSize: 13, ...style }}>
      <div style={{ color: 'var(--rose)', marginBottom: 8 }}>// error: {message ?? 'request failed'}</div>
      {onRetry && (
        <Btn variant="ghost" size="sm" onClick={onRetry}>
          retry
        </Btn>
      )}
    </div>
  );
}

export function EmptyState({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 13, ...style }}>{children}</div>
  );
}
