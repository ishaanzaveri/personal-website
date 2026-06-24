import { Link, useNavigate } from 'react-router-dom';
import { Bracket, Btn, Cursor, Kbd, Prompt, SectionH, Status, Tag, Tile } from '../../components/primitives';
import { FramePlate } from '../../components/FramePlate';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useFrames, useProjects, usePosts, useSite } from '../../lib/queries';
import { tagColorOf } from '../../lib/tagColors';
import styles from './Home.module.css';

const HERO_HINTS: Record<string, string> = {
  'cat manifest': '// who I am · what I build',
  whoami: '// returns: ishaan z',
  'tail -f log': '// what I have been up to lately',
};

const JUMP = [
  { to: '/about', label: './about', hint: '// bio · cv' },
  { to: '/blog', label: './blog', hint: '// writing' },
  { to: '/photo', label: './photo', hint: '// frames' },
  { to: '/contact', label: './contact', hint: '// email · pgp' },
];

export default function Home() {
  usePageTitle('cat manifest');
  const navigate = useNavigate();
  const { data: site } = useSite();
  const { data: projects = [] } = useProjects(undefined, 3);
  const { data: frames } = useFrames({ limit: 6 });
  const { data: posts = [] } = usePosts(undefined, 5);

  const cmd = site?.hero.prompts[0] ?? 'cat manifest';
  const tagline = site?.hero.tagline ?? "I build, break, then photograph what's left.";
  const now = site?.now;

  return (
    <div>
      {/* HERO */}
      <header className={`${styles.hero} section-in`}>
        <div className={styles.kicker}>◢ personal_site / terminal_pilot · v1.0</div>
        <h1 className={styles.heroTitle}>
          <Prompt path="~/site">
            {cmd}
            <Cursor />
          </Prompt>
        </h1>
        <p className={styles.lede}>
          <span className={styles.ledeComment}>{HERO_HINTS[cmd] ?? '// engineer · security · photographer.'}</span>
          <br />
          <span style={{ color: 'var(--text)' }}>{tagline}</span>{' '}
          <span style={{ color: 'var(--text-mid)' }}>
            Curious about how systems work and break. Patient about light.
          </span>
        </p>
        <div className={styles.cta}>
          <Btn variant="pri" onClick={() => navigate('/about')}>
            cat bio.txt →
          </Btn>
          <Btn onClick={() => navigate('/photo')}>./photo</Btn>
          <Btn variant="ghost" onClick={() => navigate('/contact')}>
            ./contact
          </Btn>
        </div>
      </header>

      {/* now / jump-to / shortcuts */}
      <div className={styles.nowRow}>
        <Bracket>
          <div className={styles.nowHead}>
            <span>now</span>
            <span>// updated {now?.updatedCadence ?? 'weekly'}</span>
          </div>
          <div className={styles.nowBody}>{now?.body ?? '…'}</div>
          <div className={styles.nowTags}>
            {(now?.tags ?? []).map((t, i) => (
              <Tag key={t} color={['var(--teal-hi)', 'var(--amber)', 'var(--violet)'][i % 3]}>
                {t}
              </Tag>
            ))}
          </div>
        </Bracket>

        <Tile>
          <div className={styles.tileLabel}>jump to</div>
          <div className={styles.jumpList}>
            {JUMP.map((j) => (
              <Link key={j.to} to={j.to} className={styles.jumpRow}>
                <span>{j.label}</span>
                <span className={styles.jumpHint}>{j.hint}</span>
              </Link>
            ))}
          </div>
        </Tile>

        <Tile style={{ borderColor: 'var(--rule-hi)' }}>
          <div className={styles.tileLabel}>shortcuts</div>
          <div className={styles.shortcuts}>
            <span>
              <Kbd>⌘</Kbd> <Kbd>K</Kbd> &nbsp; palette
            </span>
            <span>
              <Kbd>g</Kbd> <Kbd>b</Kbd> &nbsp; go · blog
            </span>
            <span>
              <Kbd>g</Kbd> <Kbd>p</Kbd> &nbsp; go · photo
            </span>
            <span>
              <Kbd>g</Kbd> <Kbd>a</Kbd> &nbsp; go · about
            </span>
          </div>
        </Tile>
      </div>

      {/* selected work */}
      <section className={`${styles.section} section-in`}>
        <SectionH num="01" title="selected work" side={<Link to="/blog">{projects.length} of 12 →</Link>} />
        <div className={styles.workGrid}>
          {projects.map((p, i) => (
            <Tile key={p.slug} className={styles.workCard}>
              <div className={styles.workHead}>
                <span className={styles.workNum}>/{String(i + 1).padStart(2, '0')}</span>
                <Status kind={p.status} />
              </div>
              <div>
                <h3 className={styles.workName}>./{p.name}</h3>
                <p className={styles.workBlurb}>{p.blurb}</p>
              </div>
              <div className={styles.workStack}>
                {p.stack.map((s) => (
                  <Tag key={s} color="var(--text-mid)">
                    {s}
                  </Tag>
                ))}
              </div>
              <div className={styles.workFoot}>
                <span>{p.metric}</span>
                <span style={{ color: 'var(--teal-hi)' }}>cat readme →</span>
              </div>
            </Tile>
          ))}
        </div>
      </section>

      {/* recent frames */}
      <section className={`${styles.section} section-in`}>
        <SectionH num="02" title="recent frames" side={<Link to="/photo">./photo →</Link>} />
        <div className={styles.masonry}>
          {(frames?.data ?? []).map((f) => (
            <button
              key={f.id}
              className={`frame ${styles.frame}`}
              onClick={() => navigate(`/photo/${f.id}`)}
              aria-label={`open frame ${f.id}`}
            >
              <div style={{ width: '100%', aspectRatio: f.aspectRatio }}>
                <FramePlate frame={f} />
              </div>
              <div className={`frame-veil ${styles.frameVeil}`} />
              <div className={`frame-id ${styles.frameId}`}>▸ {f.id.toUpperCase()}</div>
              <div className={`frame-exif ${styles.frameExif}`}>
                <span className={styles.frameCam}>{f.camera}</span>
                <span className={styles.frameMeta}>
                  {f.aperture} · {f.shutter} · {f.iso}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* writing */}
      <section className={`${styles.section} section-in`}>
        <SectionH num="03" title="writing" side={<Link to="/blog">./blog →</Link>} />
        <Bracket>
          <div className={styles.blogHead}>
            <span>~/site/blog</span>
            <span>ls -t posts/</span>
          </div>
          {posts.map((p) => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className={`post-row ${styles.postRow}`}>
              <span className={styles.postDate}>{p.date}</span>
              <span className={styles.postTag} style={{ color: tagColorOf(p.tag) }}>
                {p.tag}
              </span>
              <span className={styles.postTitle}>{p.title}</span>
              <span className={styles.postRead}>{p.readMinutes} min</span>
            </Link>
          ))}
          <div className={styles.blogFoot}>
            <span>// rss available at /feed.xml</span>
            <Link to="/blog" style={{ color: 'var(--teal-hi)' }}>
              more →
            </Link>
          </div>
        </Bracket>
      </section>
    </div>
  );
}
