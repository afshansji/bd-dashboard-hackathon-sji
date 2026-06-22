import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProposalEmbedUrl } from "@/hooks/useProposals";
import { Loader2 } from "lucide-react";

interface ProposalEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  mode?: 'view' | 'edit';
}

export const ProposalEditor = ({ open, onOpenChange, docId, mode = 'edit' }: ProposalEditorProps) => {
  const { data: embedUrl, isLoading, error } = useProposalEmbedUrl(docId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>{mode === 'view' ? 'View Proposal' : 'Edit Proposal'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              allow="clipboard-write"
              className="border rounded"
              title="PandaDoc Editor"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {error?.message || "Unable to load editor"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
