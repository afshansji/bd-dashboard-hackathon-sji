import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateProposal } from "@/hooks/useProposals";
import { usePandaDocTemplates } from "@/hooks/usePandaDocIntegration";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId?: string;
  clientId?: string;
}

export const ProposalDialog = ({ open, onOpenChange, dealId: initialDealId, clientId: initialClientId }: ProposalDialogProps) => {
  const [dealId, setDealId] = useState(initialDealId || "");
  const [clientId, setClientId] = useState(initialClientId || "");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");

  const { data: deals } = useQuery({
    queryKey: ["deals-for-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, client_id, client:clients(id, name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: templates, isLoading: templatesLoading } = usePandaDocTemplates();
  const createProposal = useCreateProposal();

  useEffect(() => {
    if (initialDealId) setDealId(initialDealId);
    if (initialClientId) setClientId(initialClientId);
  }, [initialDealId, initialClientId]);

  // Auto-fill client when deal is selected
  useEffect(() => {
    if (dealId && deals) {
      const selectedDeal = deals.find((d) => d.id === dealId);
      if (selectedDeal?.client_id) {
        setClientId(selectedDeal.client_id);
        if (!title) {
          setTitle(`Proposal for ${selectedDeal.client?.name || "Client"}`);
        }
      }
    }
  }, [dealId, deals, title]);

  const handleSubmit = async () => {
    if (!dealId || !clientId || !templateId || !title) return;

    await createProposal.mutateAsync({
      dealId,
      clientId,
      templateId,
      title,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    if (!initialDealId) setDealId("");
    if (!initialClientId) setClientId("");
    setTemplateId("");
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Proposal</DialogTitle>
          <DialogDescription>Select a deal, template, and customize your proposal title.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deal">Deal</Label>
            <Select value={dealId} onValueChange={setDealId} disabled={!!initialDealId}>
              <SelectTrigger id="deal">
                <SelectValue placeholder="Select a deal" />
              </SelectTrigger>
              <SelectContent>
                {deals?.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId} disabled={templatesLoading}>
              <SelectTrigger id="template">
                <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select a template"} />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Proposal Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Proposal for Acme Corp"
            />
          </div>

          {dealId && clientId && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Merge Fields Preview</p>
              <p className="text-muted-foreground text-xs">
                Client name, deal amount, and other details will be automatically populated in the proposal.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!dealId || !clientId || !templateId || !title || createProposal.isPending}
          >
            {createProposal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
