import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, File, FileText, Image, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface TaskAttachmentsFieldProps {
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  maxFileSize?: number; // in bytes
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB default

const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('word')) return FileText;
  return File;
};

export function TaskAttachmentsField({ 
  attachments, 
  onAttachmentsChange,
  maxFileSize = MAX_FILE_SIZE 
}: TaskAttachmentsFieldProps) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const oversizedFiles = acceptedFiles.filter(file => file.size > maxFileSize);
      
      if (oversizedFiles.length > 0) {
        toast.error(`Some files exceed the ${formatFileSize(maxFileSize)} limit`);
        return;
      }

      // Add new files to existing attachments
      const newFiles = [...attachments, ...acceptedFiles];
      onAttachmentsChange(newFiles);
      
      toast.success(`${acceptedFiles.length} file(s) added`);
    },
    [attachments, maxFileSize, onAttachmentsChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: maxFileSize,
    multiple: true,
  });

  const handleRemoveFile = (index: number) => {
    const newFiles = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newFiles);
  };

  return (
    <FormItem>
      <FormLabel>Attachments (Optional)</FormLabel>
      <FormDescription className="text-xs">
        Upload files (max {formatFileSize(maxFileSize)} per file). Supported: PDF, DOC, DOCX, XLS, XLSX, images
      </FormDescription>

      {/* Drag & Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        {isDragActive ? (
          <p className="text-sm text-muted-foreground">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to browse
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {attachments.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium">{attachments.length} file(s) selected:</p>
          {attachments.map((file, index) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <FormMessage />
    </FormItem>
  );
}

