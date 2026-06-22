import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { supabase } from "@/integrations/supabase/client";
import { submitFeedback, type FeedbackType } from "@/features/feedback/api";
import { FEEDBACK_MODULE_OPTIONS } from "@/features/feedback/constants";
import { Bug, List, Sparkles, UploadCloud, X } from "lucide-react";

const TYPE_OPTIONS: FeedbackType[] = ["bug", "feature"];

function normalizeFileName(name: string) {
  const [base, ...rest] = name.split(".");
  const extension = rest.length > 0 ? `.${rest.pop()}` : "";
  const safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safeBase || "attachment"}${extension}`;
}

export default function SubmitFeedback() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get("type");
  
  // Validate type parameter and handle null/invalid values
  const validType = (initialType && initialType !== "null" && TYPE_OPTIONS.includes(initialType as FeedbackType))
    ? (initialType as FeedbackType)
    : "bug";
  
  const [selectedType, setSelectedType] = useState<FeedbackType>(validType);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDate, setSubmittedDate] = useState(() => new Date().toLocaleString());

  const { toast } = useToast();
  const { user } = useAuth();
  const { enabled: feedbackEnabled, isLoading: flagLoading } = useFeatureFlag("feedback_enabled");
  const { enabled: autoEmailEnabled } = useFeatureFlag("feedback_auto_email");

  useEffect(() => {
    const currentType = searchParams.get("type");
    // Prevent setting invalid types including null string
    if (!currentType || currentType === "null" || !TYPE_OPTIONS.includes(currentType as FeedbackType)) {
      setSearchParams({ type: selectedType }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchParams({ type: selectedType });
  }, [selectedType, setSearchParams]);

  const submittedByEmail = user?.email ?? "";

  if (!flagLoading && !feedbackEnabled) {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleTypeChange = (value: string) => {
    if (TYPE_OPTIONS.includes(value as FeedbackType)) {
      setSelectedType(value as FeedbackType);
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
    // Reset input value to allow re-selecting the same file
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!subject.trim()) {
      toast({
        title: "Subject is required",
        description: "Please add a short summary so the admin team can triage quickly.",
        variant: "destructive",
      });
      return;
    }

    if (!feedbackEnabled) {
      toast({
        title: "Feedback is currently disabled",
        description: "Please try again later or contact the platform team.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is authenticated
    if (!user) {
      console.error("No authenticated user found");
      toast({
        title: "Authentication required",
        description: "Please log in to submit feedback.",
        variant: "destructive",
      });
      return;
    }

    // Validate type before submission
    if (!TYPE_OPTIONS.includes(selectedType)) {
      console.error("Invalid feedback type:", selectedType);
      toast({
        title: "Invalid feedback type",
        description: "Please select either Bug or Feature.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackId = crypto.randomUUID();

      // Force token refresh to ensure we have a valid JWT
      console.log("Refreshing authentication session...");
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw new Error("Authentication session expired. Please log in again.");
      }

      if (!refreshedSession) {
        console.error("No session after refresh");
        throw new Error("Unable to authenticate. Please log in again.");
      }

      console.log("Session refreshed successfully, token valid until:", new Date(refreshedSession.expires_at! * 1000).toISOString());

      // Add small delay to ensure localStorage is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Upload multiple attachments
      const uploadedAttachments = [];
      if (attachments.length > 0) {
        console.log(`Uploading ${attachments.length} attachment(s)...`);
        
        for (const file of attachments) {
          const safeName = normalizeFileName(file.name);
          const filePath = `${feedbackId}/${safeName}`;
          
          const { error: uploadError } = await supabase.storage
            .from("feedback")
            .upload(filePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          uploadedAttachments.push({
            fileName: file.name,
            filePath: filePath,
            fileSize: file.size,
            contentType: file.type || "application/octet-stream",
          });
        }
        
        console.log(`Successfully uploaded ${uploadedAttachments.length} file(s)`);
      }

      console.log("Submitting feedback:", { 
        type: selectedType, 
        subject: subject.trim(), 
        userId: user.id,
        attachmentsCount: uploadedAttachments.length,
        attachments: uploadedAttachments,
      });
      
      await submitFeedback({
        id: feedbackId,
        type: selectedType,
        subject: subject.trim(),
        description: description.trim() || undefined,
        module,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });
      
      console.log("Feedback submitted successfully with ID:", feedbackId);

      toast({
        title: "Feedback submitted",
        description: autoEmailEnabled
          ? "Thanks! We sent you a confirmation email and the admin team will follow up."
          : "Thanks! The admin team will follow up soon.",
      });

      setSubject("");
      setDescription("");
      setModule(null);
      setAttachments([]);
      setSubmittedDate(new Date().toLocaleString());
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      const errorMessage = error instanceof Error ? error.message : "Unable to submit feedback right now.";
      toast({
        title: "Something went wrong",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-primary/20 bg-card/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-semibold">Share feedback with the platform team</CardTitle>
                <CardDescription>
                  Quickly report issues or request enhancements. Your submission routes directly to the Business Dev AI admins.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/feedback" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  View All Feedback
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={selectedType} onValueChange={handleTypeChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bug" className="flex items-center gap-2">
                  <Bug className="h-4 w-4" /> Report a bug
                </TabsTrigger>
                <TabsTrigger value="feature" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Request a feature
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="feedback-email">Your email</Label>
                  <Input id="feedback-email" value={submittedByEmail} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback-date">Submitted on</Label>
                  <Input id="feedback-date" value={submittedDate} readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-module">Module (optional)</Label>
                <Select value={module ?? "none"} onValueChange={(value) => setModule(value === "none" ? null : value)}>
                  <SelectTrigger id="feedback-module">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {FEEDBACK_MODULE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-subject">Subject</Label>
                <Input
                  id="feedback-subject"
                  placeholder={selectedType === "bug" ? "Something isn’t working" : "Describe your idea"}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={180}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-description">Details (optional)</Label>
                <Textarea
                  id="feedback-description"
                  placeholder={
                    selectedType === "bug"
                      ? "Share steps to reproduce, expected vs actual behavior, and any screenshots."
                      : "Explain the value of this feature, who benefits, and any must-have requirements."
                  }
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-attachment">Attachments (optional)</Label>
                <Input
                  id="feedback-attachment"
                  type="file"
                  accept="image/*,application/pdf,.zip,.log,.txt"
                  onChange={handleAttachmentChange}
                  multiple
                />
                {attachments.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-muted-foreground">Selected files ({attachments.length}):</p>
                    <div className="space-y-1">
                      {attachments.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Upload screenshots, logs, or other helpful context. You can select multiple files. Files are stored securely in Supabase Storage.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  By submitting, you agree that the platform team may contact you for more information.
                </p>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Submit feedback"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
