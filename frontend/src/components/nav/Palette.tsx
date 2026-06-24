import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Palette.module.css';

interface Item {
  to: string;
  label: string;
  hint: string;
}

const ITEMS: Item[] = [
  { to: '/', label: './', hint: 'home · cat manifest' },
  { to: '/about', label: './about', hint: 'bio · cv · work history' },
  { to: '/blog', label: './blog', hint: 'writing · notes · systems' },
  { to: '/photo', label: './photo', hint: 'gallery · 35 frames · 6 albums' },
  { to: '/contact', label: './contact', hint: 'email · pgp · socials' },
];

// Fuzzy "jump to" overlay opened with ⌘/Ctrl-K.
export function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const filtered = ITEMS.filter((i) => (i.label + i.hint).toLowerCase().includes(q.toLowerCase()));

  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, onClose);

  const go = useCallback(
    (to: string) => {
      navigate(to);
      onClose();
    },
    [navigate, onClose],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (filtered[sel]) go(filtered[sel].to);
    }
  };

  return (
    <div className={styles.bg} onClick={onClose}>
      <div
        ref={containerRef}
        className={styles.pal}
        role="dialog"
        aria-modal="true"
        aria-label="Jump to page"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span style={{ color: 'var(--teal-hi)' }}>›</span>
          <input
            autoFocus
            className={styles.input}
            placeholder="jump to…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
          />
          <span className={styles.hint}>esc</span>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>// no match. try ./about · ./photo · ./contact</div>
        )}

        {filtered.map((i, idx) => (
          <button
            key={i.to}
            className={`${styles.row} ${idx === sel ? styles.rowOn : ''}`}
            onMouseEnter={() => setSel(idx)}
            onClick={() => go(i.to)}
          >
            <span style={{ color: idx === sel ? 'var(--teal-hi)' : 'var(--text-hi)' }}>{i.label}</span>
            <span className={styles.hint}>{i.hint}</span>
          </button>
        ))}

        <div className={styles.foot}>
          <span>↑↓ navigate · ↵ open</span>
          <span>iz@web:~/palette$</span>
        </div>
      </div>
    </div>
  );
}
