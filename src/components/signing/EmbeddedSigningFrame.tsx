import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ExternalLink, RefreshCw, CheckCircle } from "lucide-react";
import { useSigningEmbedSession } from "@/hooks/useSigningDocuments";

interface EmbeddedSigningFrameProps {
  documentId: string;
  recipientEmail: string;
  onComplete?: () => void;
  onDecline?: () => void;
  onClose?: () => void;
  className?: string;
}

export const EmbeddedSigningFrame = ({
  documentId,
  recipientEmail,
  onComplete,
  onDecline,
  onClose,
  className = "",
}: EmbeddedSigningFrameProps) => {
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const embedSession = useSigningEmbedSession();

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await embedSession.mutateAsync({
        documentId,
        recipientEmail,
      });

      setSessionUrl(result.sessionUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signing session");
    } finally {
      setLoading(false);
    }
    // embedSession.mutateAsync is stable, omitting from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, recipientEmail]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Listen for PandaDoc postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin is from PandaDoc
      if (!event.origin.includes("pandadoc.com")) return;

      const { type, payload } = event.data || {};

      console.log("[EmbeddedSigningFrame] Received message:", type, payload);

      switch (type) {
        case "session.completed":
        case "document.completed":
          setCompleted(true);
          onComplete?.();
          break;

        case "session.declined":
        case "document.declined":
          onDecline?.();
          break;

        case "session.exception":
        case "session.error":
          setError(payload?.message || "An error occurred during signing");
          break;

        case "session.view.closed":
        case "session.closed":
          onClose?.();
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete, onDecline, onClose]);

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-96 bg-muted/30 rounded-lg ${className}`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading signing session...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Preparing secure document for {recipientEmail}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-96 bg-destructive/5 rounded-lg ${className}`}
      >
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-semibold mb-2">Unable to Load Signing Session</h3>
        <p className="text-muted-foreground text-center max-w-md mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={fetchSession} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          {sessionUrl && (
            <Button asChild>
              <a href={sessionUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-96 bg-green-50 dark:bg-green-950/20 rounded-lg ${className}`}
      >
        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Signing Complete!</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Thank you for signing the document. All parties will receive a confirmation email with
          the signed PDF.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Fallback link for browsers that block iframes */}
      <div className="absolute top-2 right-2 z-10">
        <Button variant="ghost" size="sm" asChild>
          <a href={sessionUrl!} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in New Tab
          </a>
        </Button>
      </div>

      <iframe
        src={sessionUrl!}
        className="w-full h-[600px] border rounded-lg"
        title="Document Signing"
        allow="geolocation"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        style={{ minHeight: "600px" }}
      />
    </div>
  );
};

// ============================================================================
// SIGNING MODAL WRAPPER
// ============================================================================

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  recipientEmail: string;
  documentTitle?: string;
  onComplete?: () => void;
  onDecline?: () => void;
}

export const SigningModal = ({
  open,
  onOpenChange,
  documentId,
  recipientEmail,
  documentTitle,
  onComplete,
  onDecline,
}: SigningModalProps) => {
  const handleComplete = () => {
    onComplete?.();
    // Keep modal open briefly to show success state
    setTimeout(() => onOpenChange(false), 2000);
  };

  const handleDecline = () => {
    onDecline?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
          <DialogDescription>
            {documentTitle || "Please review and sign the document below"}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto">
          <EmbeddedSigningFrame
            documentId={documentId}
            recipientEmail={recipientEmail}
            onComplete={handleComplete}
            onDecline={handleDecline}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
