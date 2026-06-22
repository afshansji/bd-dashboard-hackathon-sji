import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Shield, ChevronRight, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateSigningDocument, useSigningTemplates, useSendSigningDocument } from "@/hooks/useSigningDocuments";
import { RecipientManager } from "./RecipientManager";
import type { DocumentType, RecipientFormData } from "@/types/signing";
import { cn } from "@/lib/utils";

interface SigningDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId?: string;
  clientId?: string;
  projectId?: string;
  documentType?: DocumentType;
}

type Step = "template" | "recipients" | "preview";

export const SigningDocumentDialog = ({
  open,
  onOpenChange,
  dealId: initialDealId,
  clientId: initialClientId,
  projectId: initialProjectId,
  documentType: initialDocumentType,
}: SigningDocumentDialogProps) => {
  // Form state
  const [step, setStep] = useState<Step>("template");
  const [documentType, setDocumentType] = useState<DocumentType>(initialDocumentType || "sow");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [dealId, setDealId] = useState(initialDealId || "");
  const [clientId, setClientId] = useState(initialClientId || "");
  const [recipients, setRecipients] = useState<RecipientFormData[]>([]);
  const [sendImmediately, setSendImmediately] = useState(true);

  // Queries
  const { data: templates, isLoading: templatesLoading } = useSigningTemplates(documentType);

  const { data: deals } = useQuery({
    queryKey: ["deals-for-signing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, client_id, client:clients(id, name, email)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-for-signing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, contact_person")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const createDocument = useCreateSigningDocument();
  const sendDocument = useSendSigningDocument();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep("template");
      setDocumentType(initialDocumentType || "sow");
      setTemplateId("");
      setTitle("");
      setDealId(initialDealId || "");
      setClientId(initialClientId || "");
      setRecipients([]);
      setSendImmediately(true);
    }
  }, [open, initialDealId, initialClientId, initialDocumentType]);

  // Auto-fill client when deal is selected
  useEffect(() => {
    if (dealId && deals) {
      const selectedDeal = deals.find((d) => d.id === dealId);
      if (selectedDeal?.client_id) {
        setClientId(selectedDeal.client_id);

        // Auto-generate title
        if (!title) {
          const docTypeLabel = documentType === "sow" ? "Statement of Work" : "NDA";
          setTitle(`${docTypeLabel} - ${selectedDeal.client?.name || "Client"}`);
        }

        // Auto-add client as first recipient if no recipients yet
        if (recipients.length === 0 && selectedDeal.client?.email) {
          const clientName = selectedDeal.client.name || "";
          const nameParts = clientName.split(" ");
          setRecipients([
            {
              id: crypto.randomUUID(),
              email: selectedDeal.client.email,
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              role: "signer",
              signingOrder: 1,
            },
          ]);
        }
      }
    }
  }, [dealId, deals, documentType, title, recipients.length]);

  // Navigation
  const canProceedToRecipients = templateId && title;
  const canProceedToPreview = recipients.filter((r) => r.role === "signer").length >= 1;
  const canSubmit = canProceedToRecipients && canProceedToPreview;

  const handleNext = () => {
    if (step === "template" && canProceedToRecipients) {
      setStep("recipients");
    } else if (step === "recipients" && canProceedToPreview) {
      setStep("preview");
    }
  };

  const handleBack = () => {
    if (step === "recipients") {
      setStep("template");
    } else if (step === "preview") {
      setStep("recipients");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      const document = await createDocument.mutateAsync({
        documentType,
        templateId,
        title,
        dealId: dealId || undefined,
        clientId: clientId || undefined,
        projectId: initialProjectId,
        recipients: recipients.map((r) => ({
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          role: r.role,
          signingOrder: r.signingOrder,
        })),
      });

      // Send immediately if selected
      if (sendImmediately && document?.id) {
        await sendDocument.mutateAsync({ documentId: document.id });
      }

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createDocument.isPending || sendDocument.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {documentType === "sow" ? (
              <FileText className="h-5 w-5" />
            ) : (
              <Shield className="h-5 w-5" />
            )}
            Create {documentType === "sow" ? "Statement of Work" : "NDA"}
          </DialogTitle>
          <DialogDescription>
            Step {step === "template" ? "1" : step === "recipients" ? "2" : "3"} of 3:{" "}
            {step === "template"
              ? "Select template and details"
              : step === "recipients"
              ? "Add signers and recipients"
              : "Review and send"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-4">
          <StepIndicator
            number={1}
            label="Template"
            active={step === "template"}
            completed={step !== "template"}
          />
          <div className="flex-1 h-px bg-border" />
          <StepIndicator
            number={2}
            label="Recipients"
            active={step === "recipients"}
            completed={step === "preview"}
          />
          <div className="flex-1 h-px bg-border" />
          <StepIndicator
            number={3}
            label="Review"
            active={step === "preview"}
            completed={false}
          />
        </div>

        {/* Step Content */}
        <div className="py-4 space-y-4">
          {step === "template" && (
            <TemplateStep
              documentType={documentType}
              onDocumentTypeChange={setDocumentType}
              templateId={templateId}
              onTemplateIdChange={setTemplateId}
              title={title}
              onTitleChange={setTitle}
              dealId={dealId}
              onDealIdChange={setDealId}
              deals={deals || []}
              templates={templates || []}
              templatesLoading={templatesLoading}
              initialDealId={initialDealId}
            />
          )}

          {step === "recipients" && (
            <RecipientManager
              recipients={recipients}
              onChange={setRecipients}
              documentType={documentType}
              clients={clients || []}
            />
          )}

          {step === "preview" && (
            <PreviewStep
              documentType={documentType}
              templateId={templateId}
              templateName={templates?.find((t) => t.id === templateId)?.name}
              title={title}
              dealName={deals?.find((d) => d.id === dealId)?.title}
              recipients={recipients}
              sendImmediately={sendImmediately}
              onSendImmediatelyChange={setSendImmediately}
            />
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step !== "template" && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            {step !== "preview" ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === "template" && !canProceedToRecipients) ||
                  (step === "recipients" && !canProceedToPreview)
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {sendImmediately ? "Create & Send" : "Create Draft"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// STEP INDICATOR
// ============================================================================

interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

const StepIndicator = ({ number, label, active, completed }: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          active && "bg-primary text-primary-foreground",
          completed && "bg-primary/20 text-primary",
          !active && !completed && "bg-muted text-muted-foreground"
        )}
      >
        {completed ? "✓" : number}
      </div>
      <span
        className={cn(
          "text-sm font-medium hidden sm:inline",
          active && "text-foreground",
          !active && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
};

// ============================================================================
// TEMPLATE STEP
// ============================================================================

interface TemplateStepProps {
  documentType: DocumentType;
  onDocumentTypeChange: (type: DocumentType) => void;
  templateId: string;
  onTemplateIdChange: (id: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  dealId: string;
  onDealIdChange: (id: string) => void;
  deals: Array<{ id: string; title: string; client?: { name: string } | null }>;
  templates: Array<{ id: string; name: string }>;
  templatesLoading: boolean;
  initialDealId?: string;
}

const TemplateStep = ({
  documentType,
  onDocumentTypeChange,
  templateId,
  onTemplateIdChange,
  title,
  onTitleChange,
  dealId,
  onDealIdChange,
  deals,
  templates,
  templatesLoading,
  initialDealId,
}: TemplateStepProps) => {
  return (
    <div className="space-y-4">
      {/* Document Type Toggle */}
      <div className="space-y-2">
        <Label>Document Type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={documentType === "sow" ? "default" : "outline"}
            className="flex-1"
            onClick={() => onDocumentTypeChange("sow")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Statement of Work
          </Button>
          <Button
            type="button"
            variant={documentType === "nda" ? "default" : "outline"}
            className="flex-1"
            onClick={() => onDocumentTypeChange("nda")}
          >
            <Shield className="h-4 w-4 mr-2" />
            NDA
          </Button>
        </div>
      </div>

      {/* Deal Selection */}
      <div className="space-y-2">
        <Label htmlFor="deal">Associated Deal (Optional)</Label>
        <Select value={dealId || "__none__"} onValueChange={(val) => onDealIdChange(val === "__none__" ? "" : val)} disabled={!!initialDealId}>
          <SelectTrigger id="deal">
            <SelectValue placeholder="Select a deal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No deal</SelectItem>
            {deals.map((deal) => (
              <SelectItem key={deal.id} value={deal.id}>
                {deal.title}
                {deal.client?.name && ` - ${deal.client.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Selection */}
      <div className="space-y-2">
        <Label htmlFor="template">Template *</Label>
        <Select
          value={templateId}
          onValueChange={onTemplateIdChange}
          disabled={templatesLoading}
        >
          <SelectTrigger id="template">
            <SelectValue
              placeholder={templatesLoading ? "Loading templates..." : "Select a template"}
            />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {templates.length === 0 && !templatesLoading && (
          <p className="text-sm text-muted-foreground">
            No templates found for {documentType.toUpperCase()}. Please create templates in
            PandaDoc with "{documentType.toUpperCase()}" or "
            {documentType === "sow" ? "Statement of Work" : "Non-Disclosure Agreement"}" in the
            name.
          </p>
        )}
      </div>

      {/* Document Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Document Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={`e.g., ${
            documentType === "sow" ? "Q1 2025 SOW - ACME Corp" : "NDA - ACME Corp"
          }`}
        />
      </div>
    </div>
  );
};

// ============================================================================
// PREVIEW STEP
// ============================================================================

interface PreviewStepProps {
  documentType: DocumentType;
  templateId: string;
  templateName?: string;
  title: string;
  dealName?: string;
  recipients: RecipientFormData[];
  sendImmediately: boolean;
  onSendImmediatelyChange: (send: boolean) => void;
}

const PreviewStep = ({
  documentType,
  templateName,
  title,
  dealName,
  recipients,
  sendImmediately,
  onSendImmediatelyChange,
}: PreviewStepProps) => {
  const signers = recipients.filter((r) => r.role === "signer");
  const approvers = recipients.filter((r) => r.role === "approver");
  const ccRecipients = recipients.filter((r) => r.role === "cc");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="font-semibold">Document Details</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Type:</span>
          <span className="font-medium">
            {documentType === "sow" ? "Statement of Work" : "NDA"}
          </span>

          <span className="text-muted-foreground">Title:</span>
          <span className="font-medium">{title}</span>

          <span className="text-muted-foreground">Template:</span>
          <span className="font-medium">{templateName || "Selected"}</span>

          {dealName && (
            <>
              <span className="text-muted-foreground">Deal:</span>
              <span className="font-medium">{dealName}</span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="font-semibold">Recipients</h4>

        {signers.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Signers ({signers.length}) - Will sign in order:
            </p>
            <ol className="list-decimal list-inside text-sm space-y-1">
              {signers
                .sort((a, b) => a.signingOrder - b.signingOrder)
                .map((r) => (
                  <li key={r.id}>
                    {r.firstName} {r.lastName} ({r.email})
                  </li>
                ))}
            </ol>
          </div>
        )}

        {approvers.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Approvers ({approvers.length}):</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {approvers.map((r) => (
                <li key={r.id}>
                  {r.firstName} {r.lastName} ({r.email})
                </li>
              ))}
            </ul>
          </div>
        )}

        {ccRecipients.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">CC ({ccRecipients.length}):</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {ccRecipients.map((r) => (
                <li key={r.id}>
                  {r.firstName} {r.lastName} ({r.email})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sendImmediately}
            onChange={(e) => onSendImmediatelyChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <div>
            <p className="font-medium">Send for signature immediately</p>
            <p className="text-sm text-muted-foreground">
              {sendImmediately
                ? "Document will be created and sent to recipients right away"
                : "Document will be saved as draft for later sending"}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};
