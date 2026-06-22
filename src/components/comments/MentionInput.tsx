import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import Fuse from "fuse.js";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  teamMembers: TeamMember[];
  disabled?: boolean;
  autoFocus?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  teamMembers,
  disabled,
  autoFocus,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<TeamMember[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fuse = new Fuse(teamMembers, {
    keys: ["name", "email"],
    threshold: 0.3,
    includeScore: true,
  });

  const getCaretCoordinates = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    // Create a hidden div to measure text position
    const div = document.createElement("div");
    const style = getComputedStyle(textarea);
    
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";
    div.style.font = style.font;
    div.style.padding = style.padding;
    div.style.width = style.width;
    div.style.lineHeight = style.lineHeight;
    
    const textBeforeCaret = value.substring(0, textarea.selectionStart);
    div.textContent = textBeforeCaret;
    
    const span = document.createElement("span");
    span.textContent = "|";
    div.appendChild(span);
    
    document.body.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    const divRect = div.getBoundingClientRect();
    document.body.removeChild(div);
    
    return {
      top: spanRect.top - divRect.top + parseInt(style.lineHeight || "20"),
      left: spanRect.left - divRect.left,
    };
  }, [value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;
      onChange(newValue);

      // Find the @ symbol before cursor
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Check if @ is at start or preceded by whitespace
        const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
        if (charBefore === " " || charBefore === "\n" || lastAtIndex === 0) {
          const searchText = textBeforeCursor.substring(lastAtIndex + 1);
          
          // Only show suggestions if no space in search text (mention not completed)
          if (!searchText.includes(" ") || searchText.split(" ").length <= 2) {
            setMentionStart(lastAtIndex);
            
            if (searchText.length === 0) {
              setSuggestions(teamMembers.slice(0, 8));
            } else {
              const results = fuse.search(searchText).slice(0, 8);
              setSuggestions(results.map((r) => r.item));
            }
            setShowSuggestions(true);
            setSelectedIndex(0);
            return;
          }
        }
      }

      setShowSuggestions(false);
      setMentionStart(null);
    },
    [onChange, teamMembers, fuse]
  );

  const insertMention = useCallback(
    (member: TeamMember) => {
      if (mentionStart === null) return;

      const textarea = textareaRef.current;
      const cursorPos = textarea?.selectionStart || value.length;
      
      const beforeMention = value.substring(0, mentionStart);
      const afterCursor = value.substring(cursorPos);
      
      // Insert @Name format
      const mentionText = `@${member.name} `;
      const newValue = beforeMention + mentionText + afterCursor;
      
      onChange(newValue);
      setShowSuggestions(false);
      setMentionStart(null);

      // Set cursor position after the mention
      setTimeout(() => {
        if (textarea) {
          const newCursorPos = mentionStart + mentionText.length;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [mentionStart, value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }

      // Pass through to parent handler
      onKeyDown?.(e);
    },
    [showSuggestions, suggestions, selectedIndex, insertMention, onKeyDown]
  );

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const selectedItem = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      selectedItem?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, showSuggestions]);

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg mt-1"
          style={{
            top: getCaretCoordinates().top + 8,
            left: Math.min(getCaretCoordinates().left, 200),
          }}
        >
          {suggestions.map((member, index) => (
            <div
              key={member.id}
              className={`px-3 py-2 cursor-pointer flex flex-col ${
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => insertMention(member)}
            >
              <span className="font-medium text-sm">{member.name}</span>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to extract mentioned emails from comment text
export function extractMentionedEmails(
  text: string,
  teamMembers: TeamMember[]
): { mentionedUsers: string[]; mentionedEmails: string[] } {
  const nameToMember = new Map(teamMembers.map((m) => [m.name.toLowerCase(), m]));
  const emailToMember = new Map(teamMembers.map((m) => [m.email.toLowerCase(), m]));
  
  // Match @Name (with spaces) or @email patterns
  const mentionPattern = /@([^\s@][^@]*?)(?=\s@|\s*$|[.,!?]|\s{2,})/g;
  const mentions = [...text.matchAll(mentionPattern)].map((match) => match[1].trim());
  
  const mentionedUsers: string[] = [];
  const mentionedEmails: string[] = [];
  
  for (const mention of mentions) {
    const lowerMention = mention.toLowerCase();
    
    // Try to match by name first
    const memberByName = nameToMember.get(lowerMention);
    if (memberByName) {
      if (!mentionedUsers.includes(memberByName.id)) {
        mentionedUsers.push(memberByName.id);
        mentionedEmails.push(memberByName.email);
      }
      continue;
    }
    
    // Try to match by email
    const memberByEmail = emailToMember.get(lowerMention);
    if (memberByEmail) {
      if (!mentionedUsers.includes(memberByEmail.id)) {
        mentionedUsers.push(memberByEmail.id);
        mentionedEmails.push(memberByEmail.email);
      }
    }
  }
  
  return { mentionedUsers, mentionedEmails };
}

// Helper to highlight mentions in displayed text
export function highlightMentionsInText(
  text: string,
  teamMembers: TeamMember[]
): React.ReactNode {
  const nameSet = new Set(teamMembers.map((m) => m.name.toLowerCase()));
  const emailSet = new Set(teamMembers.map((m) => m.email.toLowerCase()));
  
  // Split by @mentions - capture the @ and the text after it
  const parts = text.split(/(@[^\s@]+(?:\s[^\s@]+)?)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("@")) {
          const mentionText = part.slice(1).trim();
          const lowerMention = mentionText.toLowerCase();
          
          // Check if it's a valid mention (name or email)
          if (nameSet.has(lowerMention) || emailSet.has(lowerMention)) {
            return (
              <span key={`mention-${index}`} className="font-semibold text-primary">
                {part}
              </span>
            );
          }
          
          // Check partial name match (e.g., "@John Doe" where full name is in set)
          for (const name of nameSet) {
            if (name.startsWith(lowerMention) || lowerMention.startsWith(name)) {
              return (
                <span key={`mention-${index}`} className="font-semibold text-primary">
                  {part}
                </span>
              );
            }
          }
        }
        return <span key={`text-${index}`}>{part}</span>;
      })}
    </>
  );
}
