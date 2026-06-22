import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Building, Mail, Phone, Linkedin, Globe, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAddCampaignContact } from "@/hooks/useAddCampaignContact";
import { useValidateEmails, useZeroBounceConfig } from "@/hooks/useZeroBounce";

interface AddCampaignContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onContactAdded?: () => void;
}

export function AddCampaignContactDialog({
  open,
  onOpenChange,
  campaignId,
  onContactAdded,
}: AddCampaignContactDialogProps) {
  const { toast } = useToast();
  const { mutateAsync: addContact, isPending } = useAddCampaignContact();
  const { data: zbConfig } = useZeroBounceConfig();
  const { mutateAsync: validateEmails, isPending: isValidating } = useValidateEmails();

  // Form state
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contact_linkedin_url: "",
    contact_company: "",
    contact_title: "",
    company_website: "",
    company_industry: "",
    company_size: "",
    personalization_notes: "",
  });

  const [validationResult, setValidationResult] = useState<{
    status: string;
    message: string;
    isValid: boolean;
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      contact_linkedin_url: "",
      contact_company: "",
      contact_title: "",
      company_website: "",
      company_industry: "",
      company_size: "",
      personalization_notes: "",
    });
    setValidationResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.contact_name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter the contact's name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.contact_email && !formData.contact_linkedin_url) {
      toast({
        title: "Contact Info Required",
        description: "Please provide either an email or LinkedIn URL.",
        variant: "destructive",
      });
      return;
    }

    const email = formData.contact_email.trim();
    let emailValidationStatus = "not_validated";
    let emailValidationError = null;

    // Validate email with Zerobounce if configured and email is provided
    if (email && zbConfig?.configured) {
      try {
        const validationResponse = await validateEmails({ emails: email });

        if (validationResponse.ok && validationResponse.results && validationResponse.results.length > 0) {
          const result = validationResponse.results[0];
          const status = result.status.toLowerCase();

          emailValidationStatus = status;

          // Check if email is valid
          if (status === 'valid') {
            setValidationResult({
              status: 'valid',
              message: 'Email validated successfully',
              isValid: true,
            });
          } else if (status === 'invalid' || status === 'spamtrap' || status === 'abuse' || status === 'do_not_mail') {
            setValidationResult({
              status: status,
              message: `Email validation failed: ${status}. This contact will not be added.`,
              isValid: false,
            });
            toast({
              title: "Invalid Email",
              description: `The email address is ${status}. Please verify the email address.`,
              variant: "destructive",
            });
            return; // Stop the submission
          } else {
            // For catch-all, unknown - allow but warn
            setValidationResult({
              status: status,
              message: `Email validation returned: ${status}. Contact will be added but may need verification.`,
              isValid: true,
            });
          }
        }
      } catch (error) {
        console.error("Email validation error:", error);
        emailValidationError = error instanceof Error ? error.message : "Validation failed";
        // Continue with adding contact even if validation fails
        toast({
          title: "Validation Warning",
          description: "Email validation service unavailable. Contact will be added without validation.",
          variant: "default",
        });
      }
    }

    try {
      await addContact({
        campaignId,
        contactData: {
          contact_name: formData.contact_name.trim(),
          contact_email: email || null,
          contact_phone: formData.contact_phone.trim() || null,
          contact_linkedin_url: formData.contact_linkedin_url.trim() || null,
          contact_company: formData.contact_company.trim() || null,
          contact_title: formData.contact_title.trim() || null,
          company_website: formData.company_website.trim() || null,
          company_industry: formData.company_industry.trim() || null,
          company_size: formData.company_size.trim() || null,
          status: "identified",
          metadata: {
            added_via: "manual",
            added_at: new Date().toISOString(),
            personalization_notes: formData.personalization_notes.trim() || null,
            email_validation_status: emailValidationStatus,
            email_validation_error: emailValidationError,
          },
        },
      });

      toast({
        title: "Contact Added",
        description: `${formData.contact_name} has been added to the campaign.`,
      });

      resetForm();
      onOpenChange(false);
      onContactAdded?.();
    } catch (error: any) {
      console.error("Failed to add contact:", error);
      toast({
        title: "Failed to Add Contact",
        description: error.message || "An error occurred while adding the contact.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact Manually</DialogTitle>
          <DialogDescription>
            Enter contact details to add them to your campaign. Name and at least one contact method (email or LinkedIn) are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" />
              <span>Contact Information</span>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contact_name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact_name"
                  placeholder="John Doe"
                  value={formData.contact_name}
                  onChange={(e) => handleInputChange("contact_name", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contact_email">
                    <Mail className="h-3 w-3 inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange("contact_email", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact_phone">
                    <Phone className="h-3 w-3 inline mr-1" />
                    Phone
                  </Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact_linkedin_url">
                  <Linkedin className="h-3 w-3 inline mr-1" />
                  LinkedIn URL
                </Label>
                <Input
                  id="contact_linkedin_url"
                  placeholder="https://linkedin.com/in/johndoe"
                  value={formData.contact_linkedin_url}
                  onChange={(e) => handleInputChange("contact_linkedin_url", e.target.value)}
                />
              </div>

              {/* Email Validation Result */}
              {validationResult && (
                <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                  {validationResult.isValid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {validationResult.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Zerobounce Status Indicator */}
              {zbConfig?.configured && formData.contact_email && (
                <p className="text-xs text-muted-foreground">
                  Email will be validated with Zerobounce before adding
                </p>
              )}
            </div>
          </div>

          {/* Company & Title Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building className="h-4 w-4" />
              <span>Company & Title</span>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contact_company">Company Name</Label>
                  <Input
                    id="contact_company"
                    placeholder="Acme Corp"
                    value={formData.contact_company}
                    onChange={(e) => handleInputChange("contact_company", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact_title">Job Title</Label>
                  <Input
                    id="contact_title"
                    placeholder="VP of Engineering"
                    value={formData.contact_title}
                    onChange={(e) => handleInputChange("contact_title", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="company_website">
                  <Globe className="h-3 w-3 inline mr-1" />
                  Company Website
                </Label>
                <Input
                  id="company_website"
                  placeholder="https://acmecorp.com"
                  value={formData.company_website}
                  onChange={(e) => handleInputChange("company_website", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company_industry">Industry</Label>
                  <Input
                    id="company_industry"
                    placeholder="Technology, SaaS"
                    value={formData.company_industry}
                    onChange={(e) => handleInputChange("company_industry", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="company_size">Company Size</Label>
                  <Input
                    id="company_size"
                    placeholder="51-200 employees"
                    value={formData.company_size}
                    onChange={(e) => handleInputChange("company_size", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="personalization_notes">Personalization Notes (Optional)</Label>
              <Textarea
                id="personalization_notes"
                placeholder="Add any notes about this contact, personalization ideas, or context..."
                value={formData.personalization_notes}
                onChange={(e) => handleInputChange("personalization_notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending || isValidating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating Email...
                </>
              ) : isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Contact...
                </>
              ) : (
                "Add Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

