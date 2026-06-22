import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProposalStatusBadge } from "./ProposalStatusBadge";
import { Eye, Edit, Send, Download, Trash2 } from "lucide-react";
import type { ProposalDocument } from "@/types/proposal";
import { format } from "date-fns";
import { useState } from "react";
import { ProposalEditor } from "./ProposalEditor";
import { useSendProposal, useDeleteProposal } from "@/hooks/useProposals";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProposalCardProps {
  proposal: ProposalDocument;
}

export const ProposalCard = ({ proposal }: ProposalCardProps) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const sendProposal = useSendProposal();
  const deleteProposal = useDeleteProposal();
  const isDraft = proposal.status === "draft";

  const handleSend = async () => {
    await sendProposal.mutateAsync({ docId: proposal.pandadoc_doc_id });
  };

  const handleView = () => {
    if (isDraft) {
      // For drafts: Open PandaDoc dashboard directly
      window.open(`https://app.pandadoc.com/documents/${proposal.pandadoc_doc_id}`, "_blank");
    } else {
      // For sent documents: Always open in modal viewer
      setIsViewMode(true);
      setEditorOpen(true);
    }
  };

  const handleEdit = () => {
    if (isDraft) {
      // For drafts: Open PandaDoc dashboard directly
      window.open(`https://app.pandadoc.com/documents/${proposal.pandadoc_doc_id}`, "_blank");
    } else {
      // For sent documents: Open in modal editor
      setIsViewMode(false);
      setEditorOpen(true);
    }
  };

  const handleDownload = () => {
    if (proposal.pdf_url) {
      window.open(proposal.pdf_url, "_blank");
    }
  };

  const handleDelete = async () => {
    await deleteProposal.mutateAsync({ proposalId: proposal.id });
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-sm truncate">{proposal.title}</h4>
                <ProposalStatusBadge
                  status={proposal.status}
                  sentAt={proposal.sent_at}
                  viewedAt={proposal.viewed_at}
                  completedAt={proposal.completed_at}
                  expiresAt={proposal.expires_at}
                />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {proposal.client && <p>Client: {proposal.client.name}</p>}
                {proposal.deal && <p>Deal: {proposal.deal.title}</p>}
                <p>Created: {format(new Date(proposal.created_at), "MMM d, yyyy")}</p>
                {proposal.sent_at && <p>Sent: {format(new Date(proposal.sent_at), "MMM d, yyyy")}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                <Button variant="outline" size="sm" onClick={handleView}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>

                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </TooltipProvider>

              {isDraft && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteProposal.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}

              {(isDraft || proposal.status === "viewed") && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSend}
                  disabled={sendProposal.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              )}

              {proposal.pdf_url && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProposalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        docId={proposal.pandadoc_doc_id}
        mode={isViewMode ? 'view' : 'edit'}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft proposal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
