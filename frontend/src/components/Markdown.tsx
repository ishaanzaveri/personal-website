import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { ComponentPropsWithoutRef } from 'react';

// Generic, sanitized markdown render. Styling/theming of the output (line
// gutters, syntax-colored code panels) is intentionally deferred to a later
// pass — this is a plain, safe render for now.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{ code: Code }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

function Code({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) {
  const text = String(children ?? '');

  if (!className && text.includes(' # ')) {
    return (
      <code {...props} className={className}>
        {text.split('\n').map((line, lineIndex, lines) => {
          const commentStart = line.indexOf(' # ');
          const hasComment = commentStart >= 0;

          return (
            <span key={`${line}-${lineIndex}`}>
              {hasComment ? (
                <>
                  {line.slice(0, commentStart)}
                  <span className="shell-comment">{line.slice(commentStart)}</span>
                </>
              ) : (
                line
              )}
              {lineIndex < lines.length - 1 && <br />}
            </span>
          );
        })}
      </code>
    );
  }

  return (
    <code {...props} className={className}>
      {children}
    </code>
  );
}
