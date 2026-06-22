/**
 * Mention Parser Utility
 * Handles parsing and formatting of @mentions in task comments
 * 
 * Mention Format: @[UserName](userId)
 */

export interface MentionToken {
  userName: string;
  userId: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse text to extract all mention tokens
 * Pattern: @[UserName](userId)
 */
export function extractMentions(text: string): MentionToken[] {
  const mentions: MentionToken[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      userName: match[1],
      userId: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  return mentions;
}

/**
 * Extract unique user IDs from mention tokens
 */
export function extractMentionedUserIds(text: string): string[] {
  const mentions = extractMentions(text);
  const uniqueIds = Array.from(new Set(mentions.map(m => m.userId)));
  return uniqueIds;
}

/**
 * Insert a mention token at a specific position in text
 */
export function insertMention(
  text: string,
  position: number,
  userName: string,
  userId: string
): { text: string; cursorPosition: number } {
  const mentionToken = `@[${userName}](${userId})`;
  const before = text.substring(0, position);
  const after = text.substring(position);
  
  return {
    text: before + mentionToken + ' ' + after,
    cursorPosition: position + mentionToken.length + 1,
  };
}

/**
 * Convert mention tokens to React-friendly spans for rendering
 * Returns array of text segments and mention objects
 */
export interface TextSegment {
  type: 'text' | 'mention';
  content: string;
  userId?: string;
  userName?: string;
}

export function parseTextWithMentions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const mentions = extractMentions(text);
  
  if (mentions.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  let lastIndex = 0;
  
  for (const mention of mentions) {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, mention.startIndex),
      });
    }
    
    // Add mention
    segments.push({
      type: 'mention',
      content: mention.userName,
      userId: mention.userId,
      userName: mention.userName,
    });
    
    lastIndex = mention.endIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }
  
  return segments;
}

/**
 * Find @ symbol position for mention trigger
 * Returns position of @ or -1 if not found in current word
 */
export function findMentionTriggerPosition(
  text: string,
  cursorPosition: number
): number {
  // Look backwards from cursor to find @ in current word
  let pos = cursorPosition - 1;
  
  while (pos >= 0) {
    const char = text[pos];
    
    if (char === '@') {
      return pos;
    }
    
    // Stop at word boundary
    if (char === ' ' || char === '\n') {
      return -1;
    }
    
    pos--;
  }
  
  return -1;
}

/**
 * Get search query from mention trigger to cursor
 */
export function getMentionSearchQuery(
  text: string,
  triggerPosition: number,
  cursorPosition: number
): string {
  if (triggerPosition === -1 || triggerPosition >= cursorPosition) {
    return '';
  }
  
  // Get text between @ and cursor (excluding the @)
  return text.substring(triggerPosition + 1, cursorPosition);
}

/**
 * Validate mention token format
 */
export function isValidMentionToken(text: string): boolean {
  const mentionRegex = /^@\[([^\]]+)\]\(([^)]+)\)$/;
  return mentionRegex.test(text);
}

/**
 * Strip mention tokens and return plain text
 */
export function stripMentions(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

/**
 * Count mentions in text
 */
export function countMentions(text: string): number {
  return extractMentions(text).length;
}

