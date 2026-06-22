import { parseRichText, type RichTextSegment } from '@/utils/richTextParser';

interface RichTextProps {
  text: string;
  className?: string;
}

function renderSegment(segment: RichTextSegment, index: number) {
  switch (segment.type) {
    case 'bold':
      return (
        <strong key={index} className="font-bold">
          {segment.content}
        </strong>
      );

    case 'italic':
      return (
        <em key={index} className="italic">
          {segment.content}
        </em>
      );

    case 'code':
      return (
        <code
          key={index}
          className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm text-foreground"
        >
          {segment.content}
        </code>
      );

    case 'link':
      return (
        <a
          key={index}
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          {segment.content}
        </a>
      );

    case 'mention':
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-sm"
          title={`@${segment.userName}`}
        >
          @{segment.userName}
        </span>
      );

    case 'linebreak':
      return <br key={index} />;

    case 'text':
    default:
      return <span key={index}>{segment.content}</span>;
  }
}

export function RichText({ text, className = '' }: RichTextProps) {
  const segments = parseRichText(text);
  const elements = [];
  let i = 0;

  while (i < segments.length) {
    const segment = segments[i];

    if (segment.type === 'bullet') {
      // Collect all inline segments until linebreak for bullet content
      const bulletContent = [];
      const bulletText = segment.content;

      // Parse inline formatting within bullet text
      const inlineSegments = parseInlineSegments(bulletText);

      elements.push(
        <div key={i} className="ml-4 flex items-start gap-2">
          <span className="text-primary flex-shrink-0">•</span>
          <span className="flex-1">
            {inlineSegments.map((seg, idx) => renderSegment(seg, Number(`${i}${idx}`)))}
          </span>
        </div>
      );
    } else if (segment.type === 'numbered') {
      // Parse inline formatting within numbered text
      const inlineSegments = parseInlineSegments(segment.content);

      elements.push(
        <div key={i} className="ml-4 flex items-start gap-2">
          <span className="text-primary font-medium flex-shrink-0">{segment.order}.</span>
          <span className="flex-1">
            {inlineSegments.map((seg, idx) => renderSegment(seg, Number(`${i}${idx}`)))}
          </span>
        </div>
      );
    } else {
      elements.push(renderSegment(segment, i));
    }

    i++;
  }

  return <div className={`${className} break-words space-y-1`}>{elements}</div>;
}

/**
 * Parse inline formatting (bold, italic, code, links, mentions) in a single line of text
 */
function parseInlineSegments(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let pos = 0;
  let remaining = text;

  while (pos < remaining.length) {
    // Try to match mention first: @[UserName](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/;
    const mentionMatch = remaining.substring(pos).match(mentionRegex);

    if (mentionMatch && mentionMatch.index === 0) {
      segments.push({
        type: 'mention',
        content: mentionMatch[1],
        userName: mentionMatch[1],
        userId: mentionMatch[2],
      });
      pos += mentionMatch[0].length;
      continue;
    }

    // Try to match link: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    const linkMatch = remaining.substring(pos).match(linkRegex);

    if (linkMatch && linkMatch.index === 0) {
      segments.push({
        type: 'link',
        content: linkMatch[1],
        url: linkMatch[2],
      });
      pos += linkMatch[0].length;
      continue;
    }

    // Try to match bold: **text**
    const boldRegex = /\*\*([^\*]+)\*\*/;
    const boldMatch = remaining.substring(pos).match(boldRegex);

    if (boldMatch && boldMatch.index === 0) {
      segments.push({
        type: 'bold',
        content: boldMatch[1],
      });
      pos += boldMatch[0].length;
      continue;
    }

    // Try to match italic: *text*
    const italicRegex = /\*([^\*]+)\*/;
    const italicMatch = remaining.substring(pos).match(italicRegex);

    if (italicMatch && italicMatch.index === 0) {
      segments.push({
        type: 'italic',
        content: italicMatch[1],
      });
      pos += italicMatch[0].length;
      continue;
    }

    // Try to match code: `text`
    const codeRegex = /`([^`]+)`/;
    const codeMatch = remaining.substring(pos).match(codeRegex);

    if (codeMatch && codeMatch.index === 0) {
      segments.push({
        type: 'code',
        content: codeMatch[1],
      });
      pos += codeMatch[0].length;
      continue;
    }

    // No special formatting, find next special character
    let nextSpecialPos = remaining.length;
    const specialChars = ['*', '[', '`', '@'];

    for (const char of specialChars) {
      const charPos = remaining.substring(pos).indexOf(char);
      if (charPos !== -1) {
        nextSpecialPos = Math.min(nextSpecialPos, pos + charPos);
      }
    }

    if (nextSpecialPos > pos) {
      const plainText = remaining.substring(pos, nextSpecialPos);
      if (plainText) {
        segments.push({
          type: 'text',
          content: plainText,
        });
      }
      pos = nextSpecialPos;
    } else {
      segments.push({
        type: 'text',
        content: remaining.substring(pos, pos + 1),
      });
      pos++;
    }
  }

  return segments;
}
