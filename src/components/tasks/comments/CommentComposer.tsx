import { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';

interface CommentComposerProps {
  onSubmit: (text: string) => void;
  isSubmitting: boolean;
}

const MAX_LENGTH = 4000;

export function CommentComposer({ onSubmit, isSubmitting }: CommentComposerProps) {
  const [html, setHtml] = useState('');

  const handleSubmit = () => {
    // Get text content to check if empty
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const trimmedText = textContent.trim();

    if (!trimmedText || isSubmitting) return;

    onSubmit(html);
    setHtml('');
  };

  return (
    <RichTextEditor
      value={html}
      onChange={setHtml}
      placeholder="Type @ to mention • Drag & drop files"
      disabled={isSubmitting}
      maxLength={MAX_LENGTH}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      showSubmitButton={true}
    />
  );
}
