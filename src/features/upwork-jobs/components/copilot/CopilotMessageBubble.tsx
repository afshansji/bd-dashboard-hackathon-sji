import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/documentation/CodeBlock";
import { toast } from "sonner";
import type { CopilotChatMessage } from "@/hooks/useOpportunityCopilot";

interface CopilotMessageBubbleProps {
  message: CopilotChatMessage;
}

export function CopilotMessageBubble({ message }: CopilotMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-start">
      <div className="relative max-w-[90%] rounded-2xl rounded-bl-md border bg-card px-4 py-3 shadow-sm">
        {!message.isStreaming && message.content ? (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => void handleCopy()}
            aria-label="Copy response"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : null}

        {message.content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className ?? "");
                  const value = String(children).replace(/\n$/, "");
                  if (!inline && match) {
                    return <CodeBlock language={match[1]} value={value} />;
                  }
                  return (
                    <code
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="my-3 overflow-x-auto">
                      <table className="min-w-full border-collapse border border-border text-sm">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="border border-border px-3 py-2">{children}</td>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : message.isStreaming ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
          </span>
        ) : null}

        {message.isStreaming && message.content ? (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary" />
        ) : null}
      </div>
    </div>
  );
}
