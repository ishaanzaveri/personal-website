import { useSite } from '../../lib/queries';
import { relativeTime } from '../../lib/format';

// Terminal-prompt footer with build info + social links, fed by /api/site.
export function Footer() {
  const { data: site } = useSite();
  const commitAgo = site ? relativeTime(site.build.lastCommit) : '…';
  const branch = site?.build.branch ?? 'main';
  const socials = site?.socials ?? [];

  return (
    <footer className="shell">
      <div>
        <span style={{ color: 'var(--teal-hi)' }}>iz@web</span>
        <span style={{ color: 'var(--text-dim)' }}>:</span>
        <span style={{ color: 'var(--text-hi)' }}>~/site</span>
        <span style={{ color: 'var(--text-dim)' }}>$ </span>
        <span style={{ color: 'var(--text-mid)' }}>
          EOF · last commit {commitAgo} · branch {branch}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {socials.map((s) => (
          <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer">
            {s.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
