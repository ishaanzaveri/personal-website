import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Cursor } from '../../components/primitives';
import { Markdown } from '../../components/Markdown';
import { usePageTitle } from '../../hooks/usePageTitle';
import { usePost } from '../../lib/queries';
import { tagColorOf } from '../../lib/tagColors';
import { ErrorState, LoadingLines } from '../../components/States';

const Dot = () => <span style={{ color: 'var(--rule-hi)' }}>·</span>;

export default function BlogPost() {
  const { slug = '' } = useParams();
  const { data: post, isLoading, isError, error, refetch } = usePost(slug);
  usePageTitle(post ? post.title : 'blog');

  const heroRef = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState(false);
  const [navH, setNavH] = useState(68);
  const [progress, setProgress] = useState(0);

  // Reading-progress bar (rAF-throttled passive scroll).
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [post]);

  // Frozen condensed title once the hero scrolls under the sticky nav.
  useEffect(() => {
    const nav = document.querySelector('nav');
    const measure = () => nav && setNavH(nav.getBoundingClientRect().height);
    measure();
    window.addEventListener('resize', measure);

    const hero = heroRef.current;
    if (!hero) return () => window.removeEventListener('resize', measure);
    const observer = new IntersectionObserver(
      ([entry]) => setFrozen(!entry.isIntersecting),
      { rootMargin: `-${navH + 4}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(hero);
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [post, navH]);

  if (isLoading) return <LoadingLines lines={10} style={{ paddingTop: 40 }} />;
  if (isError || !post)
    return (
      <div style={{ paddingTop: 40 }}>
        <Link to="/blog" style={{ color: 'var(--teal-hi)', fontSize: 12 }}>
          ← ./blog
        </Link>
        <ErrorState message={error?.message ?? 'post not found'} onRetry={() => refetch()} style={{ marginTop: 16 }} />
      </div>
    );

  const color = tagColorOf(post.tag);

  return (
    <div>
      {/* reading-progress line */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 2,
          width: `${progress * 100}%`,
          background: 'var(--teal)',
          zIndex: 200,
          transition: 'width 80ms linear',
        }}
      />

      {/* condensed frozen title pane */}
      <div
        style={{
          position: 'fixed',
          top: navH - 8,
          left: 'max(20px, calc((100vw - var(--doc-max)) / 2 + var(--doc-pad)))',
          right: 'max(20px, calc((100vw - var(--doc-max)) / 2 + var(--doc-pad)))',
          zIndex: 45,
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--rule)',
          maxHeight: frozen ? 60 : 0,
          opacity: frozen ? 1 : 0,
          overflow: 'hidden',
          pointerEvents: frozen ? 'auto' : 'none',
          transition: 'max-height 220ms var(--ease), opacity 180ms var(--ease)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 60 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
            <Link to="/blog" style={{ color: 'var(--teal-hi)', fontSize: 11, flex: '0 0 auto' }}>
              ← ./blog
            </Link>
            <span style={{ color: 'var(--rule-hi)' }}>/</span>
            <span style={{ color: 'var(--text-hi)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {post.title}
            </span>
          </span>
          <span style={{ display: 'flex', gap: 10, alignItems: 'baseline', flex: '0 0 auto', fontSize: 11, color: 'var(--text-dim)' }}>
            <span>{post.readMinutes} min</span>
            <Dot />
            <span style={{ color: 'var(--teal-hi)' }}>#{post.commit}</span>
          </span>
        </div>
      </div>

      {/* hero */}
      <div ref={heroRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 36 }}>
          <span style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <Link to="/blog" style={{ color: 'var(--teal-hi)' }}>
              ← ./blog
            </Link>
            <span style={{ color: 'var(--rule-hi)' }}>/</span>
            <span style={{ color: 'var(--text-mid)' }}>{post.commit}.md</span>
          </span>
          <span>POSTS(1)</span>
        </div>
        <div style={{ color, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>◢ {post.tag}</div>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>{post.title}</h1>
        <p style={{ color: 'var(--text-mid)', fontSize: 16, lineHeight: 1.6, margin: '20px 0 24px', textWrap: 'pretty' }}>{post.blurb}</p>
        <div style={{ paddingBottom: 30, borderBottom: '1px solid var(--rule)', display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-mid)' }}>ishaan z</span>
          <Dot />
          <span>{post.date}</span>
          <Dot />
          <span>{post.readMinutes} min read</span>
          <Dot />
          <span>{post.words.toLocaleString()} words</span>
          <Dot />
          <span style={{ color: 'var(--teal-hi)' }}>#{post.commit}</span>
        </div>
      </div>

      {/* prose (generic markdown this pass) */}
      <div style={{ paddingTop: 34, maxWidth: 680 }}>
        <Markdown>{post.body}</Markdown>
      </div>

      {/* tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '40px 0 0' }}>
        {post.tags.map((t) => (
          <span key={t} style={{ fontSize: 11, padding: '3px 10px', border: '1px solid var(--rule-hi)', color: 'var(--teal-hi)', letterSpacing: '0.06em' }}>
            #{t}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, margin: '32px 0 0', paddingTop: 22, borderTop: '1px solid var(--rule)', fontSize: 12 }}>
        <Link to="/blog" style={{ color: 'var(--teal-hi)' }}>
          ← back to ./blog
        </Link>
        <span style={{ color: 'var(--text-dim)' }}>
          iz@web:~/blog$ <Cursor />
        </span>
      </div>
    </div>
  );
}
