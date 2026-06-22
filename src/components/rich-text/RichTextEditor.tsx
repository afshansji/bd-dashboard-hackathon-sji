import React, { useCallback, useEffect, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  AtSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionSuggestion } from './MentionSuggestion';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  teamMembers?: TeamMember[];
  className?: string;
  editorClassName?: string;
  disabled?: boolean;
}

export interface RichTextEditorRef {
  focus: () => void;
  getHTML: () => string;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      content,
      onChange,
      onBlur,
      placeholder = 'Write your content here...',
      teamMembers = [],
      className,
      editorClassName,
      disabled = false,
    },
    ref
  ) => {
    // Memoize teamMembers to prevent infinite re-renders
    const teamMembersRef = useRef(teamMembers);
    teamMembersRef.current = teamMembers;

    // Create a stable mention suggestion that reads from ref
    const stableMentionSuggestion = useMemo(() => {
      return MentionSuggestion(teamMembers || []);
    }, []); // Empty deps - we'll use ref for updates

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline cursor-pointer hover:text-primary/80',
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: 'mention font-bold text-green-600 dark:text-green-400',
          },
          suggestion: stableMentionSuggestion,
        }),
      ],
      content,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      onBlur: () => {
        onBlur?.();
      },
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-2',
            editorClassName
          ),
        },
      },
    });

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      getHTML: () => editor?.getHTML() || '',
    }));

    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
    }, [content, editor]);

    const setLink = useCallback(() => {
      if (!editor) return;

      const previousUrl = editor.getAttributes('link').href;
      const url = window.prompt('Enter URL:', previousUrl);

      if (url === null) return;

      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }

      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }, [editor]);

    const insertMention = useCallback(() => {
      if (!editor) return;
      editor.chain().focus().insertContent('@').run();
    }, [editor]);

    if (!editor) return null;

    return (
      <div className={cn('rich-text-editor border rounded-md bg-background', className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn('h-8 w-8 p-0', editor.isActive('bold') && 'bg-accent')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn('h-8 w-8 p-0', editor.isActive('italic') && 'bg-accent')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn('h-8 w-8 p-0', editor.isActive('underline') && 'bg-accent')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn('h-8 w-8 p-0', editor.isActive('strike') && 'bg-accent')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn('h-8 w-8 p-0', editor.isActive('bulletList') && 'bg-accent')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn('h-8 w-8 p-0', editor.isActive('orderedList') && 'bg-accent')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={cn('h-8 w-8 p-0', editor.isActive('link') && 'bg-accent')}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertMention}
            className="h-8 w-8 p-0"
            title="Mention someone (@)"
          >
            <AtSign className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
