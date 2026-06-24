import { useEffect } from 'react';

// Sets the per-route document title (and restores nothing — the next route
// sets its own). Format mirrors the prototype's "ishaan z · ~/site".
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ~/site`;
  }, [title]);
}
