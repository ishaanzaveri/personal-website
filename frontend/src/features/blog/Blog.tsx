import { Link, useSearchParams } from 'react-router-dom';
import { Cursor } from '../../components/primitives';
import { useViewport } from '../../hooks/useViewport';
import { usePageTitle } from '../../hooks/usePageTitle';
import { usePosts } from '../../lib/queries';
import { tagColorOf } from '../../lib/tagColors';
import { ErrorState, LoadingLines } from '../../components/States';
import type { PostSummary } from '../../types';
import styles from './Blog.module.css';

const TAGS = ['all', 'systems', 'security', 'photo', 'notes'] as const;
const tagColor = (t: string) => (t === 'all' ? 'var(--text-hi)' : tagColorOf(t));

export default function Blog() {
  usePageTitle('blog · writing');
  const { mobile } = useViewport();
  const [params, setParams] = useSearchParams();
  const active = params.get('tag') ?? 'all';

  // Fetch the full list once; derive counts + filtering client-side (small dataset).
  const { data: posts = [], isLoading, isError, error, refetch } = usePosts();

  const countFor = (t: string) => (t === 'all' ? posts.length : posts.filter((p) => p.tag === t).length);
  const filtered = active === 'all' ? posts : posts.filter((p) => p.tag === active);

  const setTag = (t: string) => {
    const next = new URLSearchParams(params);
    if (t === 'all') next.delete('tag');
    else next.set('tag', t);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <header style={{ padding: '20px 0 28px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          ◢ blog · writing
        </div>
        <h1 style={{ fontSize: mobile ? 32 : 36, fontWeight: 700, letterSpacing: '-0.015em', margin: '14px 0 0', lineHeight: 1.1 }}>
          $ ls -t posts/
          <Cursor />
        </h1>
        <p style={{ color: 'var(--text-mid)', fontSize: mobile ? 13 : 14, maxWidth: 680, margin: '14px 0 0', lineHeight: 1.7 }}>
          Notes from the desk. Mostly systems and security, sometimes photo, occasionally just words.{' '}
          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>// rss at /feed.xml</span>
        </p>
      </header>

      <div className={styles.filterRow}>
        <span className={styles.grep}>grep ›</span>
        {TAGS.map((t) => {
          const on = active === t;
          const color = tagColor(t);
          return (
            <button
              key={t}
              className={styles.pill}
              aria-pressed={on}
              onClick={() => setTag(t)}
              style={{
                color: on ? 'var(--bg)' : color,
                background: on ? color : 'transparent',
                borderColor: color,
                fontWeight: on ? 600 : 400,
              }}
            >
              {t} <span className={styles.pillCount}>({countFor(t)})</span>
            </button>
          );
        })}
      </div>

      {isLoading && <LoadingLines lines={6} />}
      {isError && <ErrorState message={error?.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <div>
            {filtered.map((p) => (
              <PostRow key={p.slug} post={p} mobile={mobile} />
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 24, color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center', fontSize: 13 }}>
                // no posts match that tag. yet.
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <span>
              // {filtered.length} of {posts.length} posts
            </span>
            <span>
              <a href="/feed.xml" style={{ color: 'var(--teal-hi)' }}>
                /feed.xml
              </a>{' '}
              · plain RSS, no tracking
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function PostRow({ post, mobile }: { post: PostSummary; mobile: boolean }) {
  const color = tagColorOf(post.tag);
  return (
    <Link to={`/blog/${post.slug}`} className={`post-row ${styles.postRow}`}>
      <div className={styles.postMeta} style={{ display: mobile ? 'flex' : 'block', gap: 10 }}>
        <span>{post.date}</span>
        {mobile && <span style={{ color, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>· {post.tag}</span>}
      </div>
      <div>
        {!mobile && (
          <span className={styles.postTagChip} style={{ color }}>
            {post.tag}
          </span>
        )}
        <h3 className={styles.postTitle}>{post.title}</h3>
        <p className={styles.postBlurb}>{post.blurb}</p>
      </div>
      <div className={styles.postRead}>
        {post.readMinutes} min
        {!mobile && <div className={styles.readArrow}>read →</div>}
      </div>
    </Link>
  );
}
