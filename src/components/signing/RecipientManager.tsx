import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, X, GripVertical, Users, UserPlus } from "lucide-react";
import type { DocumentType, RecipientFormData, RecipientRole } from "@/types/signing";

interface RecipientManagerProps {
  recipients: RecipientFormData[];
  onChange: (recipients: RecipientFormData[]) => void;
  documentType: DocumentType;
  clients?: Array<{ id: string; name: string; email: string; contact_person?: string }>;
}

export const RecipientManager = ({
  recipients,
  onChange,
  documentType,
  clients = [],
}: RecipientManagerProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addRecipient = () => {
    const newRecipient: RecipientFormData = {
      id: crypto.randomUUID(),
      email: "",
      firstName: "",
      lastName: "",
      role: "signer",
      signingOrder: recipients.filter((r) => r.role === "signer").length + 1,
    };
    onChange([...recipients, newRecipient]);
  };

  const removeRecipient = (id: string) => {
    const updated = recipients.filter((r) => r.id !== id);
    // Recalculate signing order for remaining signers
    let signerOrder = 1;
    const reordered = updated.map((r) => {
      if (r.role === "signer") {
        return { ...r, signingOrder: signerOrder++ };
      }
      return r;
    });
    onChange(reordered);
  };

  const updateRecipient = (id: string, updates: Partial<RecipientFormData>) => {
    onChange(
      recipients.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          // Reset signing order when role changes
          if (updates.role && updates.role !== r.role) {
            if (updates.role === "signer") {
              updated.signingOrder = recipients.filter((x) => x.role === "signer").length + 1;
            } else {
              updated.signingOrder = 0;
            }
          }
          return updated;
        }
        return r;
      })
    );
  };

  const addFromClient = (client: { name: string; email: string }) => {
    const nameParts = client.name.split(" ");
    const newRecipient: RecipientFormData = {
      id: crypto.randomUUID(),
      email: client.email,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      role: "signer",
      signingOrder: recipients.filter((r) => r.role === "signer").length + 1,
    };
    onChange([...recipients, newRecipient]);
  };

  // Drag and drop handlers for reordering signers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const draggedRecipient = recipients[draggedIndex];
    const targetRecipient = recipients[index];

    // Only allow reordering among signers
    if (draggedRecipient.role !== "signer" || targetRecipient.role !== "signer") return;

    const newRecipients = [...recipients];
    newRecipients.splice(draggedIndex, 1);
    newRecipients.splice(index, 0, draggedRecipient);

    // Recalculate signing orders
    let signerOrder = 1;
    const reordered = newRecipients.map((r) => {
      if (r.role === "signer") {
        return { ...r, signingOrder: signerOrder++ };
      }
      return r;
    });

    onChange(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const signers = recipients.filter((r) => r.role === "signer");
  const nonSigners = recipients.filter((r) => r.role !== "signer");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Recipients & Signers</Label>
        <Button variant="outline" size="sm" onClick={addRecipient}>
          <Plus className="h-4 w-4 mr-1" />
          Add Recipient
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Add at least one signer. Drag signers to reorder the signing sequence.
      </p>

      {/* Quick add from clients */}
      {clients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Quick add:</span>
          {clients.slice(0, 5).map((client) => (
            <Button
              key={client.id}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => addFromClient({ name: client.name, email: client.email })}
              disabled={recipients.some((r) => r.email === client.email)}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              {client.name}
            </Button>
          ))}
        </div>
      )}

      {/* Recipients List */}
      <div className="space-y-2">
        {recipients.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No recipients added yet. Add at least one signer.
            </p>
          </div>
        ) : (
          <>
            {/* Signers (draggable) */}
            {signers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Signers (in signing order)
                </p>
                {signers
                  .sort((a, b) => a.signingOrder - b.signingOrder)
                  .map((recipient, index) => {
                    const actualIndex = recipients.findIndex((r) => r.id === recipient.id);
                    return (
                      <RecipientRow
                        key={recipient.id}
                        recipient={recipient}
                        onUpdate={(updates) => updateRecipient(recipient.id, updates)}
                        onRemove={() => removeRecipient(recipient.id)}
                        draggable
                        onDragStart={() => handleDragStart(actualIndex)}
                        onDragOver={(e) => handleDragOver(e, actualIndex)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedIndex === actualIndex}
                      />
                    );
                  })}
              </div>
            )}

            {/* Non-signers */}
            {nonSigners.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Approvers & CC
                </p>
                {nonSigners.map((recipient) => (
                  <RecipientRow
                    key={recipient.id}
                    recipient={recipient}
                    onUpdate={(updates) => updateRecipient(recipient.id, updates)}
                    onRemove={() => removeRecipient(recipient.id)}
                    draggable={false}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Validation message */}
      {recipients.length > 0 && signers.length === 0 && (
        <p className="text-sm text-destructive">
          At least one signer is required for the document.
        </p>
      )}
    </div>
  );
};

// ============================================================================
// RECIPIENT ROW
// ============================================================================

interface RecipientRowProps {
  recipient: RecipientFormData;
  onUpdate: (updates: Partial<RecipientFormData>) => void;
  onRemove: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

const RecipientRow = ({
  recipient,
  onUpdate,
  onRemove,
  draggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false,
}: RecipientRowProps) => {
  return (
    <div
      className={`flex items-center gap-2 p-3 border rounded-lg bg-background transition-opacity ${
        isDragging ? "opacity-50" : ""
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {/* Drag Handle */}
      {draggable && (
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Signing Order Badge */}
      {recipient.role === "signer" && (
        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
          {recipient.signingOrder}
        </Badge>
      )}

      {/* Fields */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Input
          placeholder="First name"
          value={recipient.firstName}
          onChange={(e) => onUpdate({ firstName: e.target.value })}
          className="h-9"
        />
        <Input
          placeholder="Last name"
          value={recipient.lastName}
          onChange={(e) => onUpdate({ lastName: e.target.value })}
          className="h-9"
        />
        <Input
          placeholder="Email"
          type="email"
          value={recipient.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          className="h-9"
        />
        <Select
          value={recipient.role}
          onValueChange={(value: RecipientRole) => onUpdate({ role: value })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="signer">Signer</SelectItem>
            <SelectItem value="approver">Approver</SelectItem>
            <SelectItem value="cc">CC (View Only)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Remove Button */}
      <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
