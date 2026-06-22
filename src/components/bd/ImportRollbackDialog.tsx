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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { ImportJob, useRollbackImport } from "@/hooks/useImportHistory";
import { AlertTriangle } from "lucide-react";

interface ImportRollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importJob: ImportJob | null;
}

export function ImportRollbackDialog({ open, onOpenChange, importJob }: ImportRollbackDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const rollbackMutation = useRollbackImport();

  if (!importJob) return null;

  const contactCount = importJob.rollback_data?.contact_ids?.length || 0;

  const handleRollback = async () => {
    if (!confirmed) return;

    await rollbackMutation.mutateAsync({
      importId: importJob.id,
      reason: reason || undefined,
    });

    onOpenChange(false);
    setReason("");
    setConfirmed(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Rollback Import
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This action will permanently remove <strong>{contactCount} contacts</strong> that were imported from this job.
            </p>
            <p className="text-xs text-muted-foreground">
              Campaign: {importJob.bd_campaigns?.name}
            </p>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why are you rolling back this import?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              />
              <label
                htmlFor="confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand this will remove {contactCount} contacts
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRollback}
            disabled={!confirmed || rollbackMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {rollbackMutation.isPending ? "Rolling back..." : "Rollback"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
