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
  useGoShortcuts(togglePalette);

  // Scroll to top on route change (matches the prototype's behavior).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <div className="doc">
        <Nav />
        <Outlet />
        <Footer />
      </div>
      {palOpen && <Palette onClose={() => setPalOpen(false)} />}
      <div className="scan" aria-hidden="true" />
    </>
  );
}
