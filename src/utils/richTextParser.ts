/**
 * Rich Text Parser - Handles Markdown and Mentions
 * Supports: bold, italic, code, links, lists, mentions
 */

export interface RichTextSegment {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'mention' | 'linebreak' | 'bullet' | 'numbered';
  content: string;
  url?: string;
  userId?: string;
  userName?: string;
  order?: number;
}

/**
 * Parse text with markdown and mentions
 */
export function parseRichText(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let remaining = text;
  let currentIndex = 0;

  // Split by lines first to handle lists
  const lines = text.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    if (line === '') {
      segments.push({ type: 'linebreak', content: '' });
      continue;
    }

    // Check for bullet point
    const bulletMatch = line.match(/^•\s+(.+)$/);
    if (bulletMatch) {
      parseLineSegments(bulletMatch[1], segments, 'bullet');
      if (lineIdx < lines.length - 1) {
        segments.push({ type: 'linebreak', content: '' });
      }
      continue;
    }

    // Check for numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      parseLineSegments(numberedMatch[2], segments, 'numbered', parseInt(numberedMatch[1]));
      if (lineIdx < lines.length - 1) {
        segments.push({ type: 'linebreak', content: '' });
      }
      continue;
    }

    // Regular text line
    parseLineSegments(line, segments);
    if (lineIdx < lines.length - 1) {
      segments.push({ type: 'linebreak', content: '' });
    }
  }

  return segments;
}

/**
 * Parse a single line for inline formatting
 */
function parseLineSegments(line: string, segments: RichTextSegment[], listType?: 'bullet' | 'numbered', order?: number): void {
  let remaining = line;
  let pos = 0;

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

    // Try to match italic: *text* (but not part of bold)
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
      // Just a single character, add it as text
      segments.push({
        type: 'text',
        content: remaining.substring(pos, pos + 1),
      });
      pos++;
    }
  }
}

/**
 * Convert rich text segments to plain text (strip formatting)
 */
export function stripRichText(text: string): string {
  const segments = parseRichText(text);
  return segments
    .map((seg) => {
      if (seg.type === 'linebreak') return '\n';
      if (seg.type === 'mention') return `@${seg.userName}`;
      if (seg.type === 'link') return seg.content;
      return seg.content;
    })
    .join('');
}
