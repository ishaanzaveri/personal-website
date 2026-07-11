import { Link, useParams } from 'react-router-dom';
import { Markdown } from '../../components/Markdown';
import { Cursor, Status, Tag } from '../../components/primitives';
import { ErrorState, LoadingLines } from '../../components/States';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useProject } from '../../lib/queries';

const Dot = () => <span style={{ color: 'var(--rule-hi)' }}>·</span>;

export default function ProjectReadme() {
  const { slug = '' } = useParams();
  const { data: project, isLoading, isError, error, refetch } = useProject(slug);
  usePageTitle(project ? `cat ${project.name}/README.md` : 'work readme');

  if (isLoading) return <LoadingLines lines={10} style={{ paddingTop: 40 }} />;

  if (isError || !project) {
    return (
      <div style={{ paddingTop: 40 }}>
        <Link to="/" style={{ color: 'var(--teal-hi)', fontSize: 12 }}>
          ← ./home
        </Link>
        <ErrorState message={error?.message ?? 'project not found'} onRetry={() => refetch()} style={{ marginTop: 16 }} />
      </div>
    );
  }

  const readme = project.readme?.trim() || `# ${project.name}\n\nREADME missing for this project.`;
  const lines = readme.split('\n').length;
  const bytes = new TextEncoder().encode(readme).length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 16,
          fontSize: 11,
          color: 'var(--text-dim)',
          letterSpacing: '0.06em',
          marginBottom: 36,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <Link to="/" style={{ color: 'var(--teal-hi)' }}>
            ← ./home
          </Link>
          <span style={{ color: 'var(--rule-hi)' }}>/</span>
          <span style={{ color: 'var(--text-mid)' }}>work/{project.slug}/README.md</span>
        </span>
        <span>PROJECTS(1)</span>
      </div>

      <div style={{ color: 'var(--teal-hi)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
        ◢ selected work
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
        ./{project.name}
      </h1>
      <p style={{ color: 'var(--text-mid)', fontSize: 16, lineHeight: 1.6, margin: '20px 0 24px', textWrap: 'pretty' }}>
        {project.blurb}
      </p>
      <div
        style={{
          paddingBottom: 30,
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          gap: 12,
          alignItems: 'baseline',
          fontSize: 11,
          color: 'var(--text-dim)',
          letterSpacing: '0.04em',
          flexWrap: 'wrap',
        }}
      >
        <Status kind={project.status} />
        <Dot />
        <span>{project.metric}</span>
        <Dot />
        <span>{lines} lines</span>
        <Dot />
        <span>{bytes.toLocaleString()} bytes</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 24 }}>
        {project.stack.map((item) => (
          <Tag key={item} color="var(--text-mid)">
            {item}
          </Tag>
        ))}
      </div>

      <div style={{ paddingTop: 34, maxWidth: 680 }}>
        <Markdown>{readme}</Markdown>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, margin: '32px 0 0', paddingTop: 22, borderTop: '1px solid var(--rule)', fontSize: 12 }}>
        <Link to="/" style={{ color: 'var(--teal-hi)' }}>
          ← back to ./home
        </Link>
        <span style={{ color: 'var(--text-dim)' }}>
          iz@web:~/work/{project.slug}$ <Cursor />
        </span>
      </div>
    </div>
  );
}
