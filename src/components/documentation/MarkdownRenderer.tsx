import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CodeBlock } from './CodeBlock';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info, CheckCircle } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const value = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return <CodeBlock language={match[1]} value={value} />;
            }
            
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          blockquote({ children, ...props }: any) {
            const content = String(children);
            
            // Check for special callout syntax
            if (content.includes('⚠️') || content.includes('Warning')) {
              return (
                <Alert variant="destructive" className="my-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{children}</AlertDescription>
                </Alert>
              );
            }
            
            if (content.includes('ℹ️') || content.includes('Note')) {
              return (
                <Alert className="my-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{children}</AlertDescription>
                </Alert>
              );
            }
            
            if (content.includes('✅') || content.includes('Success')) {
              return (
                <Alert className="my-4 border-green-500">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>{children}</AlertDescription>
                </Alert>
              );
            }
            
            return (
              <blockquote className="border-l-4 border-muted pl-4 italic my-4" {...props}>
                {children}
              </blockquote>
            );
          },
          h1: ({ children, ...props }: any) => (
            <h1 className="text-4xl font-bold mt-8 mb-4 scroll-mt-20" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }: any) => (
            <h2 className="text-3xl font-semibold mt-8 mb-3 scroll-mt-20" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }: any) => (
            <h3 className="text-2xl font-semibold mt-6 mb-2 scroll-mt-20" {...props}>
              {children}
            </h3>
          ),
          table: ({ children, ...props }: any) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-border" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }: any) => (
            <th className="border border-border px-4 py-2 bg-muted font-semibold text-left" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }: any) => (
            <td className="border border-border px-4 py-2" {...props}>
              {children}
            </td>
          ),
          a: ({ children, href, ...props }: any) => (
            <a 
              href={href} 
              className="text-primary hover:underline"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
