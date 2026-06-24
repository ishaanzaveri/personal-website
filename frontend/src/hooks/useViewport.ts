import { useEffect, useState } from 'react';

// Single source of truth for responsive breakpoints (mobile < 760, narrow < 980).
export function useViewport() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { w, mobile: w < 760, narrow: w < 980 };
}
