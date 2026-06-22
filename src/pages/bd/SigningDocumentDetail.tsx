import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Send,
  RefreshCw,
  Ban,
  Download,
  Copy,
  ExternalLink,
  Users,
  Calendar,
  Building,
  FileText,
  Loader2,
  Eye,
} from "lucide-react";
import {
  useSigningDocument,
  useSendSigningDocument,
  useResendSigningDocument,
  useVoidSigningDocument,
  useDownloadSigningDocument,
  useDuplicateSigningDocument,
} from "@/hooks/useSigningDocuments";
import {
  SigningStatusBadge,
  DocumentTypeBadge,
  RecipientStatusBadge,
  ActivityLog,
  EmbeddedSigningFrame,
} from "@/components/signing";

export default function SigningDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [showSigningFrame, setShowSigningFrame] = useState(false);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState<string | null>(null);

  const { data: document, isLoading } = useSigningDocument(id);

  const sendDocument = useSendSigningDocument();
  const resendDocument = useResendSigningDocument();
  const voidDocument = useVoidSigningDocument();
  const downloadDocument = useDownloadSigningDocument();
  const duplicateDocument = useDuplicateSigningDocument();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The document you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate("/signing-documents")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

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

  const handleDuplicate = async () => {
    const newDoc = await duplicateDocument.mutateAsync({ documentId: document.id });
    if (newDoc?.id) {
      navigate(`/signing-documents/${newDoc.id}`);
    }
  };

  const openSigningFrame = (email: string) => {
    setSelectedRecipientEmail(email);
    setShowSigningFrame(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/signing-documents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DocumentTypeBadge type={document.document_type} />
              <SigningStatusBadge status={document.status} />
            </div>
            <h1 className="text-2xl font-bold">{document.title}</h1>
            <p className="text-muted-foreground">
              Created {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canSend && (
            <Button onClick={handleSend} disabled={sendDocument.isPending}>
              {sendDocument.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send for Signature
            </Button>
          )}

          {canResend && (
            <Button variant="outline" onClick={handleResend} disabled={resendDocument.isPending}>
              {resendDocument.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Resend Reminder
            </Button>
          )}

          {canDownload && (
            <>
              <Button
                variant="outline"
                onClick={() => handleDownload("pdf")}
                disabled={downloadDocument.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {document.certificate_url && (
                <Button variant="outline" onClick={() => handleDownload("certificate")}>
                  <Download className="h-4 w-4 mr-2" />
                  Certificate
                </Button>
              )}
            </>
          )}

          <Button variant="outline" onClick={handleDuplicate} disabled={duplicateDocument.isPending}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>

          {canVoid && (
            <Button variant="destructive" onClick={() => setVoidDialogOpen(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem
                  icon={<FileText className="h-4 w-4" />}
                  label="Type"
                  value={document.document_type === "sow" ? "Statement of Work" : "NDA"}
                />
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Created"
                  value={format(new Date(document.created_at), "PPP")}
                />
                {document.client && (
                  <InfoItem
                    icon={<Building className="h-4 w-4" />}
                    label="Client"
                    value={document.client.name}
                  />
                )}
                {document.deal && (
                  <InfoItem
                    icon={<FileText className="h-4 w-4" />}
                    label="Deal"
                    value={document.deal.title}
                  />
                )}
                {document.sent_at && (
                  <InfoItem
                    icon={<Send className="h-4 w-4" />}
                    label="Sent"
                    value={format(new Date(document.sent_at), "PPP p")}
                  />
                )}
                {document.completed_at && (
                  <InfoItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="Completed"
                    value={format(new Date(document.completed_at), "PPP p")}
                  />
                )}
                {document.expires_at && (
                  <InfoItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="Expires"
                    value={format(new Date(document.expires_at), "PPP")}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recipients
              </CardTitle>
              <CardDescription>
                {signedCount}/{signers.length} signers have completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recipients
                  .sort((a, b) => a.signing_order - b.signing_order)
                  .map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {recipient.role === "signer" && (
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {recipient.signing_order}
                          </Badge>
                        )}
                        <div>
                          <p className="font-medium">
                            {recipient.first_name} {recipient.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{recipient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RecipientStatusBadge status={recipient.status} size="md" />
                        {recipient.role !== "cc" &&
                          ["sent", "viewed"].includes(recipient.status) &&
                          ["sent", "viewed"].includes(document.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSigningFrame(recipient.email)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Sign
                            </Button>
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Embedded Signing Frame */}
          {showSigningFrame && selectedRecipientEmail && (
            <Card>
              <CardHeader>
                <CardTitle>Sign Document</CardTitle>
                <CardDescription>
                  Signing as {selectedRecipientEmail}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmbeddedSigningFrame
                  documentId={document.id}
                  recipientEmail={selectedRecipientEmail}
                  onComplete={() => {
                    setShowSigningFrame(false);
                    // Refetch document
                  }}
                  onClose={() => setShowSigningFrame(false)}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLog documentId={document.id} />
            </CardContent>
          </Card>

          {/* Watchers */}
          {document.signing_document_watchers && document.signing_document_watchers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Watchers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {document.signing_document_watchers.map((watcher) => (
                    <div key={watcher.id} className="flex items-center justify-between text-sm">
                      <span>{watcher.user?.full_name || watcher.user?.email}</span>
                      <Badge variant="secondary">{watcher.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Void Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this document? This action cannot be undone. The
              document will no longer be valid for signing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-destructive text-destructive-foreground">
              Void Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// INFO ITEM
// ============================================================================

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoItem = ({ icon, label, value }: InfoItemProps) => {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
};
