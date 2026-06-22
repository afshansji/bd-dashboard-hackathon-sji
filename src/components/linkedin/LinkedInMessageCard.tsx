import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Copy, Check, Send, MessageCircle, Pencil, X, Save, 
  RefreshCw, ThumbsUp, ThumbsDown, Minus, Clock 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { 
  useMarkMessageAsSent, 
  useLogMessageResponse, 
  useUpdateMessageVariant,
  useUpdateMessageNotes 
} from "@/hooks/useLinkedInMessageActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MessageVariant {
  variant_name: string;
  message: string;
  character_count: number;
  tone: string;
  key_hooks?: string[];
  personalization_elements?: string[];
}

interface LinkedInMessageCardProps {
  message: {
    id: string;
    contact_id: string;
    message_type: string;
    message_variants: MessageVariant[];
    recommended_variant: string;
    reasoning?: string;
    send_timing_suggestion?: string;
    follow_up_strategy?: string;
    user_context?: string;
    created_at: string;
    sent_at?: string;
    variant_sent?: string;
    response_received?: boolean;
    response_type?: 'positive' | 'neutral' | 'negative' | 'no_response';
    response_received_at?: string;
    notes?: string;
    sequence_id?: string;
    sequence_step_order?: number;
  };
  replacePlaceholders: (text: string) => string;
  onRegenerate?: (messageId: string, variantName: string) => void;
  isRegenerating?: boolean;
}

export function LinkedInMessageCard({ 
  message, 
  replacePlaceholders, 
  onRegenerate,
  isRegenerating 
}: LinkedInMessageCardProps) {
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseType, setResponseType] = useState<'positive' | 'neutral' | 'negative' | 'no_response'>('positive');
  const [responseNotes, setResponseNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [localNotes, setLocalNotes] = useState(message.notes || "");

  const markAsSentMutation = useMarkMessageAsSent();
  const logResponseMutation = useLogMessageResponse();
  const updateVariantMutation = useUpdateMessageVariant();
  const updateNotesMutation = useUpdateMessageNotes();

  const copyToClipboard = async (text: string, variantName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedVariant(variantName);
    setTimeout(() => setCopiedVariant(null), 2000);
  };

  const handleMarkAsSent = (variantName: string) => {
    markAsSentMutation.mutate({
      messageId: message.id,
      variantSent: variantName,
      contactId: message.contact_id,
      messageType: message.message_type,
    });
  };

  const handleLogResponse = () => {
    logResponseMutation.mutate({
      messageId: message.id,
      responseType,
      notes: responseNotes,
    });
    setShowResponseDialog(false);
  };

  const handleStartEdit = (variant: MessageVariant) => {
    setEditingVariant(variant.variant_name);
    setEditedMessage(variant.message);
  };

  const handleSaveEdit = (variantName: string) => {
    updateVariantMutation.mutate({
      messageId: message.id,
      variantName,
      newMessage: editedMessage,
      characterCount: editedMessage.length,
    });
    setEditingVariant(null);
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate({
      messageId: message.id,
      notes: localNotes,
    });
    setShowNotesInput(false);
  };

  const getResponseIcon = () => {
    switch (message.response_type) {
      case 'positive': return <ThumbsUp className="h-3 w-3 text-green-500" />;
      case 'negative': return <ThumbsDown className="h-3 w-3 text-red-500" />;
      case 'neutral': return <Minus className="h-3 w-3 text-yellow-500" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const maxChars = message.message_type === 'connection_request' ? 200 : 500;

  return (
    <Card className={`border-l-4 ${message.sent_at ? 'border-l-green-500' : 'border-l-primary'}`}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="mb-1">
                {message.message_type.replace(/_/g, ' ').toUpperCase()}
              </Badge>
              {message.sequence_id && (
                <Badge variant="secondary" className="mb-1">
                  Step {message.sequence_step_order}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {message.sent_at ? (
              <Badge variant="default" className="bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                Sent {message.variant_sent}
              </Badge>
            ) : (
              <Badge variant="secondary">{message.recommended_variant}</Badge>
            )}
            {message.response_received && (
              <Badge variant="outline" className="flex items-center gap-1">
                {getResponseIcon()}
                {message.response_type}
              </Badge>
            )}
          </div>
        </div>

        {message.user_context && (
          <p className="text-xs text-muted-foreground italic mb-2">
            Context: {message.user_context}
          </p>
        )}

        {/* Message Variants Tabs */}
        <Tabs defaultValue={message.recommended_variant} className="mt-2">
          <TabsList className="grid w-full grid-cols-3 h-8">
            {message.message_variants.map((variant) => (
              <TabsTrigger key={variant.variant_name} value={variant.variant_name} className="text-xs">
                {variant.variant_name.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {message.message_variants.map((variant) => (
            <TabsContent key={variant.variant_name} value={variant.variant_name}>
              <div className="space-y-2">
                {/* Message Content */}
                <div className="relative">
                  {editingVariant === variant.variant_name ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        className="min-h-[100px] text-xs"
                      />
                      <div className="flex items-center justify-between">
                        <Badge variant={editedMessage.length > maxChars ? "destructive" : "outline"}>
                          {editedMessage.length} / {maxChars} chars
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingVariant(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveEdit(variant.variant_name)}
                            disabled={updateVariantMutation.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs whitespace-pre-wrap p-2 bg-muted rounded-md pr-20">
                        {replacePlaceholders(variant.message)}
                      </p>
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(variant)}
                          className="h-6 w-6 p-0"
                          title="Edit message"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(replacePlaceholders(variant.message), variant.variant_name)}
                          className="h-6 w-6 p-0"
                          title="Copy to clipboard"
                        >
                          {copiedVariant === variant.variant_name ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        {onRegenerate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRegenerate(message.id, variant.variant_name)}
                            className="h-6 w-6 p-0"
                            disabled={isRegenerating}
                            title="Regenerate this variant"
                          >
                            <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Badges */}
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {variant.character_count} chars
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {variant.tone}
                  </Badge>
                  {variant.character_count > maxChars && (
                    <Badge variant="destructive" className="text-xs">
                      Over limit
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                {!message.sent_at && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsSent(variant.variant_name)}
                      disabled={markAsSentMutation.isPending}
                      className="flex-1"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Mark as Sent
                    </Button>
                  </div>
                )}

                {message.sent_at && !message.response_received && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowResponseDialog(true)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Log Response
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Notes Section */}
        <div className="mt-3 pt-3 border-t">
          {showNotesInput ? (
            <div className="space-y-2">
              <Textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Add notes about this message..."
                className="text-xs min-h-[60px]"
              />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowNotesInput(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveNotes} disabled={updateNotesMutation.isPending}>
                  Save Notes
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => setShowNotesInput(true)}
            >
              {message.notes ? (
                <p className="italic">📝 {message.notes}</p>
              ) : (
                <p className="italic">+ Add notes...</p>
              )}
            </div>
          )}
        </div>

        {/* Response Dialog */}
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Response</DialogTitle>
              <DialogDescription>
                Record the prospect's response to your message
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Response Type</label>
                <Select value={responseType} onValueChange={(v: any) => setResponseType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">
                      <span className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        Positive (interested, engaged)
                      </span>
                    </SelectItem>
                    <SelectItem value="neutral">
                      <span className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-yellow-500" />
                        Neutral (acknowledged, non-committal)
                      </span>
                    </SelectItem>
                    <SelectItem value="negative">
                      <span className="flex items-center gap-2">
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                        Negative (not interested, declined)
                      </span>
                    </SelectItem>
                    <SelectItem value="no_response">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        No Response
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="What did they say? Any next steps?"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogResponse} disabled={logResponseMutation.isPending}>
                Save Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
