import { useState } from 'react';
import { Bracket, Btn, Cursor, Kbd } from '../../components/primitives';
import { EmptyState, ErrorState, LoadingLines } from '../../components/States';
import { useCopy } from '../../hooks/useCopy';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useSite } from '../../lib/queries';
import styles from './Contact.module.css';

const SOCIAL_META: Record<string, { kbd: string; desc: string }> = {
  website: { kbd: 'ws', desc: 'this site' },
  linkedin: { kbd: 'in', desc: 'work history' },
  instagram: { kbd: 'ig', desc: 'photos · digital' },
};

export default function Contact() {
  usePageTitle('contact');
  const { copied, copy } = useCopy();
  const [copyError, setCopyError] = useState(false);
  const { data: site, isLoading, isError, error, refetch } = useSite();
  if (isLoading) return <LoadingLines />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const email = site?.email;
  const socials = site?.socials ?? [];

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.label}>◢ contact</div>
        <h1 className={styles.title}>$ echo $EMAIL<Cursor /></h1>
        <p className={styles.intro}>Plain text reaches me.</p>
      </header>
      <div className={styles.grid}>
        <Bracket>
          <div className={styles.label}>email</div>
          {email ? <>
            <a className={styles.email} href={`mailto:${email}`}>{email}</a>
            <div className={styles.actions}>
              <Btn variant="pri" onClick={async () => setCopyError(!(await copy(email)))}>
                {copied ? 'copied ✓' : 'copy email'}
              </Btn>
            </div>
            <div aria-live="polite" className={styles.feedback}>
              {copyError ? '// copy failed — select the address or open the email link.' : copied ? '// copied to clipboard' : ''}
            </div>
          </> : <EmptyState>// email is not published.</EmptyState>}
        </Bracket>
        <Bracket>
          <div className={styles.label}>socials</div>
          <div className={styles.socials}>
            {socials.length === 0 && <EmptyState>// no social links published.</EmptyState>}
            {socials.map((social) => {
              const meta = SOCIAL_META[social.key] ?? { kbd: social.key.slice(0, 2), desc: social.label };
              const host = social.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              return <div key={social.key} className={styles.social}>
                <Kbd>{meta.kbd}</Kbd>
                <div>
                  <a href={social.url} target="_blank" rel="noopener noreferrer">{host}</a>
                  <div className={styles.description}>// {meta.desc}</div>
                </div>
              </div>;
            })}
          </div>
        </Bracket>
      </div>
    </div>
  );
}
