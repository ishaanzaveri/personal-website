import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GO_TARGETS: Record<string, string> = { h: '/', a: '/about', b: '/blog', p: '/photo', c: '/contact' };

export function useGoShortcuts(togglePalette: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    let chordUntil = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        chordUntil = 0;
        togglePalette();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') ||
          document.querySelector('[role="dialog"]') || event.metaKey || event.ctrlKey || event.altKey) {
        chordUntil = 0;
        return;
      }
      if (chordUntil > Date.now() && GO_TARGETS[key]) {
        event.preventDefault();
        chordUntil = 0;
        navigate(GO_TARGETS[key]);
      } else {
        chordUntil = key === 'g' ? Date.now() + 1000 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, togglePalette]);
}
