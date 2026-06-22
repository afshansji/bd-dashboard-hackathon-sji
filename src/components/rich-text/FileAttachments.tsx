import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, FileSpreadsheet, File, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface FileAttachmentsProps {
  dealId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  maxFileSize?: number; // in bytes, default 5MB
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') return FileSpreadsheet;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('word')) return FileText;
  return File;
};

const FileAttachments: React.FC<FileAttachmentsProps> = ({
  dealId,
  attachments,
  onAttachmentsChange,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
}) => {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const oversizedFiles = acceptedFiles.filter((f) => f.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        toast.error(`Some files exceed the ${formatFileSize(maxFileSize)} limit`);
        return;
      }

      setUploading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in to upload files');
          return;
        }

        for (const file of acceptedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${dealId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('deal-files')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }

          // Create attachment record using RPC or direct insert with type cast
          const { error: insertError } = await (supabase
            .from('deal_detail_attachments' as any)
            .insert({
              deal_id: dealId,
              file_name: file.name,
              file_path: fileName,
              file_size: file.size,
              file_type: file.type || 'application/octet-stream',
              uploaded_by: user.id,
            }) as any);

          if (insertError) {
            console.error('Insert error:', insertError);
            toast.error(`Failed to save attachment record for ${file.name}`);
            // Try to clean up the uploaded file
            await supabase.storage.from('deal-files').remove([fileName]);
            continue;
          }

          toast.success(`${file.name} uploaded successfully`);
        }

        onAttachmentsChange();
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload files');
      } finally {
        setUploading(false);
      }
    },
    [dealId, maxFileSize, onAttachmentsChange]
  );

  const deleteAttachment = async (attachment: Attachment) => {
    setDeletingId(attachment.id);

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('deal-files')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete record
      const { error: deleteError } = await (supabase
        .from('deal_detail_attachments' as any)
        .delete()
        .eq('id', attachment.id) as any);

      if (deleteError) {
        toast.error('Failed to delete attachment');
        return;
      }

      toast.success('Attachment deleted');
      onAttachmentsChange();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete attachment');
    } finally {
      setDeletingId(null);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('deal-files')
        .download(attachment.file_path);

      if (error) {
        toast.error('Failed to download file');
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
  });

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : isDragActive ? (
          <p className="text-primary">Drop files here...</p>
        ) : (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            <span>Attachments (drag & drop or click)</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Max file size: {formatFileSize(maxFileSize)}
        </p>
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            return (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md group"
              >
                <button
                  type="button"
                  onClick={() => downloadAttachment(attachment)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-primary transition-colors"
                >
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{attachment.file_name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({formatFileSize(attachment.file_size)})
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAttachment(attachment)}
                  disabled={deletingId === attachment.id}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {deletingId === attachment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileAttachments;
