import { RichText } from './RichText';

interface MentionTextProps {
  text: string;
  className?: string;
}

// Parse and render markdown formatting
function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Combined regex for all markdown patterns
  const markdownRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(!?\[([^\]]+)\]\(([^)]+)\))/g;

  let match;
  while ((match = markdownRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith('![')) {
      // Image: ![alt](url)
      const alt = match[12] || 'Image';
      const url = match[13];
      parts.push(
        <img
          key={match.index}
          src={url}
          alt={alt}
          className="max-w-full h-auto rounded-md my-2"
          loading="lazy"
        />
      );
    } else if (fullMatch.startsWith('[')) {
      // Link: [text](url)
      const linkText = match[8];
      const url = match[9];
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {linkText}
        </a>
      );
    } else if (fullMatch.startsWith('**')) {
      // Bold: **text**
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (fullMatch.startsWith('*')) {
      // Italic: *text*
      parts.push(
        <em key={match.index} className="italic">
          {match[4]}
        </em>
      );
    } else if (fullMatch.startsWith('`')) {
      // Inline code: `code`
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
        >
          {match[6]}
        </code>
      );
    }

    currentIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts;
}

// Process text line by line to handle lists
function processLines(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Bullet list
    if (trimmedLine.startsWith('• ')) {
      const content = trimmedLine.substring(2);
      result.push(
        <div key={`line-${lineIndex}`} className="flex gap-2 my-1">
          <span className="text-muted-foreground select-none">•</span>
          <span className="flex-1">{parseMarkdown(content)}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmedLine)) {
      const match = trimmedLine.match(/^(\d+)\.\s(.+)$/);
      if (match) {
        const number = match[1];
        const content = match[2];
        result.push(
          <div key={`line-${lineIndex}`} className="flex gap-2 my-1">
            <span className="text-muted-foreground select-none min-w-[1.5rem]">
              {number}.
            </span>
            <span className="flex-1">{parseMarkdown(content)}</span>
          </div>
        );
      } else {
        result.push(
          <div key={`line-${lineIndex}`}>
            {parseMarkdown(line)}
          </div>
        );
      }
    }
    // Regular line
    else {
      if (lineIndex > 0) {
        result.push(<br key={`br-${lineIndex}`} />);
      }
      result.push(
        <span key={`line-${lineIndex}`}>
          {parseMarkdown(line)}
        </span>
      );
    }
  });

  return result;
}

export function MentionText({ text, className = '' }: MentionTextProps) {
  // Use RichText component which handles both mentions and markdown formatting
  return <RichText text={text} className={className} />;
}
