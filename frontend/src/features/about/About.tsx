import { Bracket } from '../../components/primitives';
import { Markdown } from '../../components/Markdown';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAbout } from '../../lib/queries';
import { ErrorState, LoadingLines } from '../../components/States';

// mac-style window title bar: 3 dots + path + right meta.
function FileBar({ filename, right }: { filename: string; right: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--bg-2)',
        fontSize: 11,
        color: 'var(--text-dim)',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', gap: 6 }} aria-hidden>
          <Dot color="var(--rose)" />
          <Dot color="var(--amber)" />
          <Dot color="var(--teal)" />
        </span>
        <span style={{ marginLeft: 6, color: 'var(--text-mid)' }}>{filename}</span>
      </span>
      <span>{right}</span>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />;
}

export default function About() {
  usePageTitle('about · bio');
  const { data, isLoading, isError, error, refetch } = useAbout();
  const title = data?.title.trim();
  const subtitle = data?.subtitle.trim();

  return (
    <div>
      <header style={{ padding: '20px 0 28px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          ◢ about
        </div>
        {title && (
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.015em', margin: '14px 0 0', lineHeight: 1.1 }}>
            {title}
          </h1>
        )}
        {subtitle && <p style={{ color: 'var(--text-mid)', fontSize: 13, margin: '10px 0 0' }}>{subtitle}</p>}
      </header>

      <Bracket style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading && <LoadingLines lines={8} style={{ padding: 24 }} />}
        {isError && <ErrorState message={error?.message} onRetry={() => refetch()} style={{ padding: 24 }} />}
        {data && (
          <>
            <FileBar
              filename={data.filename}
              right={`${countLines(data.source)} lines · ${byteLength(data.source)} B · ${data.encoding}`}
            />
            <div style={{ padding: 24 }}>
              <Markdown>{data.source}</Markdown>
            </div>
          </>
        )}
      </Bracket>
    </div>
  );
}

function countLines(src: string): number {
  return src.split('\n').length;
}

function byteLength(src: string): number {
  return new TextEncoder().encode(src).length;
}
