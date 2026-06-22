import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useSendCampaignEmail } from "@/hooks/useSendCampaignEmail";
import type { CampaignContact } from "@/hooks/useCampaignContactBySlug";
import type { CampaignSummary } from "@/Api/adminCampaigns";

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: CampaignContact;
  campaign: CampaignSummary;
}

interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "custom",
    label: "Custom",
    subject: "",
    body: ""
  },
  {
    id: "initial_outreach",
    label: "Initial Outreach",
    subject: "Quick introduction - [Your Name] from SJ Innovation",
    body: `Hi {Contact Name},

I came across your profile and was impressed by your work at {Company}. 

At SJ Innovation, we specialize in delivering innovative solutions. I believe there could be some interesting synergies between what you're doing at {Company} and our expertise in your industry.

Would you be open to a brief 15-minute call next week to explore potential collaboration opportunities?

Best regards,
{User Name}`
  },
  {
    id: "follow_up",
    label: "Follow-up",
    subject: "Following up - {Previous Subject}",
    body: `Hi {Contact Name},

I wanted to follow up on my previous email. I understand you're likely busy, but I believe this could be valuable for {Company}.

If now isn't the right time, I'm happy to reconnect at a later date. Just let me know what works best for you.

Looking forward to hearing from you.

Best regards,
{User Name}`
  },
  {
    id: "meeting_request",
    label: "Meeting Request",
    subject: "Can we schedule a quick call?",
    body: `Hi {Contact Name},

I'd love to discuss how we might be able to help {Company} achieve its goals.

Are you available for a 20-minute call sometime next week? I'm flexible with timing and happy to work around your schedule.

Best regards,
{User Name}`
  },
  {
    id: "thank_you",
    label: "Thank You",
    subject: "Great connecting with you!",
    body: `Hi {Contact Name},

Thank you for taking the time to speak with me. I really enjoyed learning more about {Company} and your initiatives.

As discussed, I'll follow up with the information we talked about. Please don't hesitate to reach out if you have any questions in the meantime.

Looking forward to continuing our conversation!

Best regards,
{User Name}`
  }
];

export function EmailComposeDialog({ open, onOpenChange, contact, campaign }: EmailComposeDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  
  const { sendEmail, isPending } = useSendCampaignEmail();

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    
    if (template && templateId !== "custom") {
      // Replace placeholders in subject
      let filledSubject = template.subject
        .replace("{Contact Name}", contact.contact_name || "there")
        .replace("{Company}", contact.current_employer || contact.contact_company || "your company");
      
      // Replace placeholders in body
      let filledBody = template.body
        .replace(/{Contact Name}/g, contact.contact_name || "there")
        .replace(/{Company}/g, contact.current_employer || contact.contact_company || "your company");
      
      setSubject(filledSubject);
      setBody(filledBody);
    } else {
      setSubject("");
      setBody("");
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      return;
    }

    const ccArray = cc ? cc.split(",").map(e => e.trim()).filter(Boolean) : undefined;
    const bccArray = bcc ? bcc.split(",").map(e => e.trim()).filter(Boolean) : undefined;

    await sendEmail({
      to: contact.contact_email!,
      subject,
      body,
      contactId: contact.id,
      campaignId: campaign.id,
      cc: ccArray,
      bcc: bccArray
    });

    // Reset form
    setSelectedTemplate("custom");
    setSubject("");
    setBody("");
    setCc("");
    setBcc("");
    setShowCcBcc(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Email to {contact.contact_name}</DialogTitle>
          <DialogDescription>
            Compose and send an email directly from the campaign management system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Email Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* To Field (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={contact.contact_email || ""}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* CC/BCC Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCcBcc(!showCcBcc)}
            className="gap-2"
          >
            {showCcBcc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showCcBcc ? "Hide" : "Show"} CC/BCC
          </Button>

          {/* CC/BCC Fields */}
          {showCcBcc && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cc">CC (comma-separated)</Label>
                <Input
                  id="cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bcc">BCC (comma-separated)</Label>
                <Input
                  id="bcc"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {subject.length}/200 characters
            </p>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your message here..."
              className="min-h-[300px] resize-y"
            />
          </div>

          {/* Note about sender */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              <strong>Note:</strong> This email will be sent from <strong>bd@sjinnovation.com</strong> with your name as the sender. 
              Replies will be directed to your email address.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isPending || !subject.trim() || !body.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Email"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
