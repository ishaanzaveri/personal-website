import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from '../components/nav/Nav';
import { Footer } from '../components/nav/Footer';
import { Palette } from '../components/nav/Palette';
import { useGoShortcuts } from '../hooks/useGoShortcuts';

export function RootLayout() {
  const [palOpen, setPalOpen] = useState(false);
  const { pathname } = useLocation();

  const togglePalette = useCallback(() => setPalOpen((o) => !o), []);
  const closePalette = useCallback(() => setPalOpen(false), []);
  useGoShortcuts(togglePalette);

  // Scroll to top on route change (matches the prototype's behavior).
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!document.querySelector('[role="dialog"]')) document.getElementById('main-content')?.focus();
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">skip to content</a>
      <div className="doc">
        <Nav />
        <main id="main-content" tabIndex={-1}><Outlet /></main>
        <Footer />
      </div>
      {palOpen && <Palette onClose={closePalette} />}
      <div className="scan" aria-hidden="true" />
    </>
  );
}
