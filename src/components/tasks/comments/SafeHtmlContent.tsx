import DOMPurify from 'dompurify';

interface SafeHtmlContentProps {
  html: string;
  className?: string;
}

/**
 * Convert mention format @[UserName](userId) to styled HTML
 */
function processMentions(html: string): string {
  // Replace mention format with styled span
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  return html.replace(
    mentionRegex,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-sm" title="@$1">@$1</span>'
  );
}

/**
 * Safely renders HTML content with DOMPurify sanitization to prevent XSS attacks
 */
export function SafeHtmlContent({ html, className = '' }: SafeHtmlContentProps) {
  // Process mentions first
  const htmlWithMentions = processMentions(html);

  // Configure DOMPurify to allow safe HTML tags and attributes
  const sanitizedHtml = DOMPurify.sanitize(htmlWithMentions, {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 'strike', 'strong', 'em', 'a', 'img',
      'ul', 'ol', 'li', 'br', 'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel', 'style', 'class', 'title'],
    ALLOW_DATA_ATTR: false,
    // Keep links safe
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });

  return (
    <div
      className={`prose prose-sm max-w-none break-words overflow-hidden [overflow-wrap:anywhere] [word-break:break-word] ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
