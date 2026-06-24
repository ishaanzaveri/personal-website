import { Link } from 'react-router-dom';
import { Bracket, Prompt } from '../components/primitives';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('404 · not found');
  return (
    <section style={{ padding: 'var(--s-7) 0' }}>
      <Bracket>
        <div style={{ color: 'var(--text-mid)', fontSize: 13, lineHeight: 1.9 }}>
          <Prompt path="~/site">cat $REQUEST</Prompt>
          <div style={{ color: 'var(--rose)', marginTop: 12 }}>
            // 404 — no such file or directory
          </div>
          <div style={{ marginTop: 16 }}>
            <Link to="/">cd ~ →</Link>
          </div>
        </div>
      </Bracket>
    </section>
  );
}
