import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GO_TARGETS: Record<string, string> = {
  h: '/',
  a: '/about',
  b: '/blog',
  p: '/photo',
  c: '/contact',
};

// Global keyboard shortcuts: ⌘/Ctrl-K toggles the palette, and a two-key
// `g`+letter chord jumps between pages (matches the prototype).
export function useGoShortcuts(togglePalette: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === 'g') {
        const next = (ev: KeyboardEvent) => {
          const dest = GO_TARGETS[ev.key.toLowerCase()];
          if (dest) navigate(dest);
          window.removeEventListener('keydown', next);
        };
        setTimeout(() => window.addEventListener('keydown', next, { once: true }), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, togglePalette]);
}
