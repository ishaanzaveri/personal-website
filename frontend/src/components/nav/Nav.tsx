import { useCallback, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { Wordmark, Kbd } from '../primitives';
import { useViewport } from '../../hooks/useViewport';
import styles from './Nav.module.css';

const LINKS = [
  { to: '/about', label: './about' },
  { to: '/blog', label: './blog' },
  { to: '/photo', label: './photo' },
  { to: '/contact', label: './contact' },
];

export function Nav() {
  const { mobile } = useViewport();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <nav className={styles.nav}>
      <button className={styles.brand} aria-label="home" onClick={() => { navigate('/'); setOpen(false); }}>
        {mobile ? <Wordmark variant="compact" size={13} /> : <Wordmark variant="primary" size={11} />}
      </button>

      {mobile ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={styles.hint} style={{ fontSize: 10 }}>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
          <button
            className={`${styles.menuBtn} ${open ? styles.menuBtnOpen : ''}`}
            aria-label="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '[ x ]' : '[ ≡ ]'}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.links}>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className={styles.hint}>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
        </>
      )}

      {mobile && open && <MobileMenu onClose={closeMenu} />}
    </nav>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  return (
    <div ref={ref} className={styles.drawer} role="dialog" aria-modal="true" aria-label="Site menu">
      <button className={styles.menuBtn} onClick={onClose}>close menu ×</button>
      {[{ to: '/', label: './' }, ...LINKS].map((link) => (
        <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={onClose}
          className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}>
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
