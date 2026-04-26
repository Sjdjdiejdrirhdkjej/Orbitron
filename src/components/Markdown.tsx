import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
}

/**
 * Renders markdown text with GitHub-flavored markdown support
 * (bold, italic, code, lists, tables, links, blockquotes, etc.).
 * Styled to match the Switchboard chat surface.
 */
export function Markdown({ children }: MarkdownProps) {
  return (
    <div className="text-sm leading-relaxed break-words space-y-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => (
            <del className="line-through opacity-70">{children}</del>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-2 mb-1 text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-2 mb-1 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-2 mb-1 text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mt-2 mb-1 text-foreground">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-2" />,
          code: ({ className, children, ...props }) => {
            const isInline = !(className && /language-/.test(className));
            if (isInline) {
              return (
                <code
                  className="font-mono text-[0.85em] bg-muted text-foreground px-1.5 py-0.5 rounded border border-border"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`font-mono text-xs ${className ?? ""}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted border border-border rounded-md p-3 overflow-x-auto text-xs font-mono leading-relaxed">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1 align-top">
              {children}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
