import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreVertical,
  Send,
  RefreshCw,
  Ban,
  Download,
  Copy,
  Eye,
  Users,
  Calendar,
  Building,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SigningStatusBadge, DocumentTypeBadge, RecipientStatusBadge } from "./SigningStatusBadge";
import {
  useSendSigningDocument,
  useResendSigningDocument,
  useVoidSigningDocument,
  useDownloadSigningDocument,
  useDuplicateSigningDocument,
} from "@/hooks/useSigningDocuments";
import type { SigningDocument } from "@/types/signing";

interface SigningDocumentCardProps {
  document: SigningDocument;
  onViewClick?: () => void;
}

export const SigningDocumentCard = ({ document, onViewClick }: SigningDocumentCardProps) => {
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);

  const sendDocument = useSendSigningDocument();
  const resendDocument = useResendSigningDocument();
  const voidDocument = useVoidSigningDocument();
  const downloadDocument = useDownloadSigningDocument();
  const duplicateDocument = useDuplicateSigningDocument();

  const recipients = document.signing_document_recipients || [];
  const signers = recipients.filter((r) => r.role === "signer");
  const signedCount = signers.filter((r) => r.status === "signed").length;

  const canSend = document.status === "draft";
  const canResend = ["sent", "viewed"].includes(document.status);
  const canVoid = ["draft", "sent", "viewed"].includes(document.status);
  const canDownload = document.status === "completed" && document.pdf_url;

  const handleSend = () => {
    sendDocument.mutate({ documentId: document.id });
  };

  const handleResend = () => {
    resendDocument.mutate({ documentId: document.id });
  };

  const handleVoid = () => {
    voidDocument.mutate({ documentId: document.id });
    setVoidDialogOpen(false);
  };

  const handleDownload = (type: "pdf" | "certificate") => {
    downloadDocument.mutate({ documentId: document.id, type });
  };

  const handleDuplicate = () => {
    duplicateDocument.mutate({ documentId: document.id });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <DocumentTypeBadge type={document.document_type} size="sm" />
              <SigningStatusBadge status={document.status} size="sm" />
            </div>
            <Link
              to={`/signing-documents/${document.id}`}
              className="font-semibold hover:underline line-clamp-1"
            >
              {document.title}
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewClick}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>

              {canSend && (
                <DropdownMenuItem onClick={handleSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Send for Signature
                </DropdownMenuItem>
              )}

              {canResend && (
                <DropdownMenuItem onClick={handleResend}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Reminder
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>

              {canDownload && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  {document.certificate_url && (
                    <DropdownMenuItem onClick={() => handleDownload("certificate")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {canVoid && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setVoidDialogOpen(true)} className="text-destructive">
                    <Ban className="h-4 w-4 mr-2" />
                    Void Document
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="space-y-2 text-sm">
          {/* Client/Deal info */}
          {(document.client || document.deal) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span className="truncate">
                {document.client?.name || document.deal?.title || "No client"}
              </span>
            </div>
          )}

          {/* Recipients summary */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {signedCount}/{signers.length} signed
            </span>
          </div>

          {/* Date info */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {document.status === "completed" && document.completed_at
                ? `Completed ${formatDistanceToNow(new Date(document.completed_at), {
                    addSuffix: true,
                  })}`
                : document.sent_at
                ? `Sent ${formatDistanceToNow(new Date(document.sent_at), { addSuffix: true })}`
                : `Created ${formatDistanceToNow(new Date(document.created_at), {
                    addSuffix: true,
                  })}`}
            </span>
          </div>
        </div>

        {/* Recipient list */}
        {recipients.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-1">
              {signers.slice(0, 3).map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1"
                >
                  <span className="truncate max-w-[120px]">
                    {recipient.first_name}{recipient.last_name ? ` ${recipient.last_name[0]}.` : ''}
                  </span>
                  <RecipientStatusBadge status={recipient.status} size="sm" />
                </div>
              ))}
              {signers.length > 3 && (
                <div className="text-xs text-muted-foreground px-2 py-1">
                  +{signers.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <div className="flex items-center justify-between w-full">
          {canSend ? (
            <Button size="sm" onClick={handleSend} disabled={sendDocument.isPending}>
              <Send className="h-4 w-4 mr-1" />
              Send
            </Button>
          ) : canResend ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResend}
              disabled={resendDocument.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Resend
            </Button>
          ) : canDownload ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload("pdf")}
              disabled={downloadDocument.isPending}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          ) : (
            <div />
          )}

          <Link to={`/signing-documents/${document.id}`}>
            <Button size="sm" variant="ghost">
              View
              <Eye className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardFooter>

      {/* Void Confirmation Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void "{document.title}"? This action cannot be undone. The
              document will no longer be valid for signing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Void Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
