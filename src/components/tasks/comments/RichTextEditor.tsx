import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Image as ImageIcon,
  Paperclip,
  Send,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MentionDropdown } from './MentionDropdown';
import { findMentionTriggerPosition, getMentionSearchQuery, insertMention } from '@/utils/mentionParser';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  showSubmitButton?: boolean;
}

const DEFAULT_FONT_SIZE = 14;

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type @ to mention • Drag & drop files',
  disabled = false,
  maxLength = 4000,
  onSubmit,
  isSubmitting = false,
  showSubmitButton = false,
}: RichTextEditorProps) {
  const [html, setHtml] = useState(value);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionTriggerPos, setMentionTriggerPos] = useState(-1);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const { toast } = useToast();

  // Initialize editor content on mount and sync external changes
  useEffect(() => {
    if (!editorRef.current) return;

    // On initial mount, set the content
    if (isInitialMountRef.current) {
      if (value) {
        editorRef.current.innerHTML = value;
      }
      isInitialMountRef.current = false;
      return;
    }

    // Handle external clear (parent explicitly cleared)
    // Compare with actual DOM content, not state
    if (value === '' && editorRef.current.innerHTML !== '') {
      editorRef.current.innerHTML = '';
      setHtml('');
      return;
    }

    // For non-empty external updates, only sync if:
    // 1. Value is different from actual DOM content
    // 2. Editor is not focused (user is not typing)
    if (value && value !== editorRef.current.innerHTML && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = value;
      setHtml(value);
    }
  }, [value]);

  // Update parent when content changes
  useEffect(() => {
    if (!isInitialMountRef.current) {
      onChange(html);
    }
  }, [html, onChange]);

  // Handle input in contentEditable
  const handleInput = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.innerHTML;
    const textContent = editorRef.current.textContent || '';

    // Check length limit
    if (textContent.length > maxLength) {
      toast({
        title: 'Character limit reached',
        description: `Maximum ${maxLength} characters allowed`,
        variant: 'destructive',
      });
      return;
    }

    setHtml(content);

    // Check for @ mention trigger
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const cursorPosition = getCursorPosition();
      const triggerPos = findMentionTriggerPosition(textContent, cursorPosition);

      if (triggerPos !== -1) {
        const searchQuery = getMentionSearchQuery(textContent, triggerPos, cursorPosition);
        setMentionTriggerPos(triggerPos);
        setMentionSearchQuery(searchQuery);

        // Calculate dropdown position at cursor
        const range = selection.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();

        // Position dropdown at cursor location (using fixed positioning)
        setMentionPosition({
          top: rangeRect.bottom + 4,
          left: rangeRect.left,
        });

        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    }
  };

  // Get cursor position in text
  const getCursorPosition = (): number => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  };

  // Handle mention selection
  const handleMentionSelect = (userId: string, userName: string) => {
    if (!editorRef.current) return;

    const textContent = editorRef.current.textContent || '';
    const cursorPosition = getCursorPosition();

    // Remove the @ and search text
    const textBeforeMention = textContent.substring(0, mentionTriggerPos);
    const textAfterCursor = textContent.substring(cursorPosition);
    const textWithoutMention = textBeforeMention + textAfterCursor;

    // Insert mention token
    const result = insertMention(textWithoutMention, mentionTriggerPos, userName, userId);

    // Convert plain text back to HTML (preserving existing formatting)
    editorRef.current.textContent = result.text;
    setHtml(editorRef.current.innerHTML);

    setShowMentionDropdown(false);
    setMentionTriggerPos(-1);

    // Focus editor
    editorRef.current.focus();
  };

  // Execute formatting command
  const executeCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;

    // Make sure editor is focused
    editorRef.current.focus();

    // Execute the command
    document.execCommand(command, false, value);

    // Update content after command
    setTimeout(() => {
      handleInput();
    }, 0);
  };

  // Format text
  const formatText = (format: 'bold' | 'italic') => {
    const commands: Record<string, string> = {
      bold: 'bold',
      italic: 'italic',
    };
    executeCommand(commands[format]);
  };

  // Insert list
  const insertList = (ordered: boolean) => {
    if (!editorRef.current) return;

    // Ensure editor is focused and has a selection
    editorRef.current.focus();

    // Get or create a selection
    const selection = window.getSelection();
    if (!selection) return;

    // If no selection, create one at the end of content
    if (selection.rangeCount === 0 || !editorRef.current.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Execute list command
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    document.execCommand(command, false);

    // Update content
    setTimeout(() => {
      if (editorRef.current) {
        setHtml(editorRef.current.innerHTML);
      }
    }, 0);
  };


  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      formatText('bold');
    }
    // Ctrl/Cmd + I for italic
    else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      formatText('italic');
    }
    // Ctrl/Cmd + Enter to submit
    else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
    // Escape to close mention dropdown
    else if (e.key === 'Escape' && showMentionDropdown) {
      e.preventDefault();
      setShowMentionDropdown(false);
    }
  };

  const textLength = editorRef.current?.textContent?.length || 0;
  const hasContent = textLength > 0;

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="border-b px-3 py-2 flex items-center gap-1 bg-gray-50">
        {/* Bold */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-200"
          onClick={() => formatText('bold')}
          disabled={disabled}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        {/* Italic */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-200"
          onClick={() => formatText('italic')}
          disabled={disabled}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Bulleted List */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-200"
          onClick={() => insertList(false)}
          disabled={disabled}
          title="Bulleted list"
        >
          <List className="h-4 w-4" />
        </Button>

        {/* Numbered List */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-200"
          onClick={() => insertList(true)}
          disabled={disabled}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        {/* Image */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-200"
          disabled={disabled}
          title="Insert image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        {/* Attachment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-200"
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          dir="ltr"
          className="min-h-[80px] max-h-[400px] overflow-y-auto px-3 py-2 focus:outline-none text-sm rte-editor"
          style={{
            fontSize: `${DEFAULT_FONT_SIZE}px`,
            direction: 'ltr',
            textAlign: 'left',
            unicodeBidi: 'embed'
          }}
          data-placeholder={placeholder}
          aria-label="Comment editor"
        />

        {/* Submit Button - Positioned on the right */}
        {showSubmitButton && (
          <div className="absolute bottom-2 right-2">
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!hasContent || isSubmitting || disabled}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mention Dropdown */}
        {showMentionDropdown && (
          <MentionDropdown
            searchQuery={mentionSearchQuery}
            onSelect={handleMentionSelect}
            position={mentionPosition}
          />
        )}
      </div>

      {/* Hidden styles for placeholder */}
      <style>{`
        .rte-editor[contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        .rte-editor[contenteditable] {
          caret-color: currentColor !important;
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: embed !important;
          writing-mode: horizontal-tb !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .rte-editor[contenteditable]:focus {
          outline: none;
        }
        .rte-editor[contenteditable] *,
        .rte-editor[contenteditable] p,
        .rte-editor[contenteditable] div,
        .rte-editor[contenteditable] span,
        .rte-editor[contenteditable] br {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: embed !important;
        }
      `}</style>
    </div>
  );
}
