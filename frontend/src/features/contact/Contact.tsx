import { Bracket, Btn, Cursor, Kbd } from '../../components/primitives';
import { useViewport } from '../../hooks/useViewport';
import { useCopy } from '../../hooks/useCopy';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useSite } from '../../lib/queries';

const EMAIL = 'izaveri01@gmail.com';

const SOCIAL_META: Record<string, { kbd: string; desc: string }> = {
  website: { kbd: 'ws', desc: 'this site' },
  linkedin: { kbd: 'in', desc: 'work history' },
  instagram: { kbd: 'ig', desc: 'photos · digital' },
};

export default function Contact() {
  usePageTitle('contact');
  const { narrow } = useViewport();
  const { copied, copy } = useCopy();
  const { data: site } = useSite();
  const socials = site?.socials ?? [];

  return (
    <div>
      <header style={{ padding: '20px 0 28px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          ◢ contact
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.015em', margin: '14px 0 0', lineHeight: 1.1 }}>
          $ echo $EMAIL
          <Cursor />
        </h1>
        <p style={{ color: 'var(--text-mid)', fontSize: 14, maxWidth: 620, margin: '14px 0 0', lineHeight: 1.6 }}>
          Plain text reaches me. PGP encouraged for anything sensitive.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16 }}>
        <Bracket>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>email</div>
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 600, color: 'var(--text-hi)', wordBreak: 'break-all' }}>
            izaveri01<span style={{ color: 'var(--teal)' }}>@</span>gmail.com
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Btn variant="pri" onClick={() => copy(EMAIL)}>
              {copied ? 'copied ✓' : 'copy email'}
            </Btn>
            <Btn variant="ghost" onClick={() => window.open('/pgp.asc', '_blank')}>
              ./pgp.asc
            </Btn>
          </div>
          <div aria-live="polite" style={{ marginTop: 10, fontSize: 11, color: 'var(--teal-hi)', minHeight: 14 }}>
            {copied ? '// copied to clipboard' : ''}
          </div>
        </Bracket>

        <Bracket>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>socials</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            {socials.map((s) => {
              const meta = SOCIAL_META[s.key] ?? { kbd: s.key.slice(0, 2), desc: s.label };
              const host = s.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              return (
                <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <Kbd>{meta.kbd}</Kbd>
                  <div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal-hi)' }}>
                      {host}
                    </a>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>// {meta.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Bracket>
      </div>
    </div>
  );
}
