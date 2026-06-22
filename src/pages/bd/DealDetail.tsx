import { AIAgentModal } from "@/components/ai/AIAgentModal";
import { DocumentQAModal } from "@/components/ai/DocumentQAModal";
import { DealControlTowerSync } from "@/components/bd/DealControlTowerSync";
import { MentionInput, TeamMember, extractMentionedEmails, highlightMentionsInText } from "@/components/comments/MentionInput";
import { ProposalDialog } from "@/components/proposals/ProposalDialog";
import { ProposalList } from "@/components/proposals/ProposalList";
import { FileAttachments, RichTextEditor } from "@/components/rich-text";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AiLeadEvaluation from "@/features/pipeline/AiLeadEvaluation";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDealBySlug } from "@/hooks/useDealBySlug";
import { useAddChecklistItem, useDealChecklist, useDeleteChecklistItem, useToggleChecklistItem } from "@/hooks/useDealChecklist";
import { useAddComment, useDealComments, useDeleteComment, useUpdateComment } from "@/hooks/useDealComments";
import { useDealFiles } from "@/hooks/useDealFiles";
import type { DealFile } from "@/hooks/useDeals";
import { useDealSystemInfo } from "@/hooks/useDealSystemInfo";
import { usePMContactInfo } from "@/hooks/usePMContactInfo";
import { usePods } from "@/hooks/usePods";
import { usePushClientToGHL } from "@/hooks/usePushClientToGHL";
import { useRunBDAgent } from "@/hooks/useRunBDAgent";
import { useSyncControlTowerDeals } from "@/hooks/useSyncControlTowerDeals";
import { supabase } from "@/integrations/supabase/client";
import { STAGE_LABELS, STATUS_LABELS, type DealStatus } from "@/lib/dealStages";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bot, Building, Calendar, Check, CheckCircle2, CheckSquare, Copy, DollarSign, ExternalLink, FileCheck, FileSignature, FileText, Folder, FolderOpen, Info, Loader2, Mail, MessageSquare, Pencil, Phone, Plus, RefreshCw, Sparkles, Trash2, User, Workflow, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

// Common pipeline options
const PIPELINE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "sales", label: "Sales Pipeline" },
  { value: "enterprise", label: "Enterprise" },
  { value: "smb", label: "SMB" },
  { value: "partnership", label: "Partnership" },
  { value: "renewal", label: "Renewal" },
  { value: "upsell", label: "Upsell" },
];

// Category options
const CATEGORY_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "leadslift", label: "LeadsLift" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

// Type of Work options (alphabetically sorted)
const TYPE_OF_WORK_OPTIONS = [
  { value: "accounting_backoffice", label: "Accounting & Backoffice" },
  { value: "add_new_features", label: "Add New Features to Existing Site" },
  { value: "bug_fixes", label: "Bug Fixes" },
  { value: "build_custom_website", label: "Build Custom Website" },
  { value: "build_ecommerce", label: "Build New eCommerce Website" },
  { value: "cold_calling", label: "Cold Calling" },
  { value: "consultant", label: "Consultant" },
  { value: "crm_setup", label: "CRM Setup" },
  { value: "custom_ai_solution", label: "Custom AI Solution" },
  { value: "data_entry", label: "Data Entry" },
  { value: "design_wireframe", label: "Design + Wireframe" },
  { value: "digital_marketing", label: "Digital Marketing" },
  { value: "email_design_newsletter", label: "Email Design [Newsletter]" },
  { value: "email_development", label: "Email Development" },
  { value: "internal_marketing", label: "Internal Marketing Works" },
  { value: "it_support", label: "IT Support" },
  { value: "landing_page", label: "Landing Page" },
  { value: "lead_generation", label: "Lead Generation" },
  { value: "new_business_campaign", label: "New Business Idea / Campaign" },
  { value: "new_mobile_app", label: "New Mobile App" },
  { value: "new_website", label: "New Website" },
  { value: "partnership_opportunity", label: "Partnership Opportunity" },
  { value: "probono", label: "ProBono" },
  { value: "qa_automation", label: "QA Automation" },
  { value: "qa_manual", label: "QA Manual" },
  { value: "redo_website", label: "Redo Website" },
  { value: "resource", label: "Resource" },
  { value: "server_support", label: "Server Support" },
  { value: "social_media_marketing", label: "Social Media Marketing" },
  { value: "software_development", label: "Software Development" },
  { value: "speed_optimization", label: "Speed Optimization" },
  { value: "update_mobile_app", label: "Update Existing Mobile App" },
  { value: "update_website", label: "Update Existing Website" },
  { value: "white_label_service", label: "White Label Service" },
];

// Lead Source options (alphabetically sorted)
const LEAD_SOURCE_OPTIONS = [
  { value: "aws_iq", label: "AWS IQ" },
  { value: "clutch", label: "Clutch" },
  { value: "cold_email_campaign", label: "Cold Email Campaign" },
  
  { value: "crafted_email", label: "Crafted.email" },
  { value: "email_geeks_slack", label: "Email Geeks (Slack)" },
  { value: "existing_client", label: "Existing Client" },
  { value: "facebook", label: "Facebook" },
  { value: "form_submission", label: "Form Submission" },
  { value: "freelancer", label: "Freelancer" },
  { value: "ghl_directory", label: "GHL Directory" },
  { value: "ghl_form_sub", label: "GHL Form Sub" },
  { value: "google_ads", label: "Google Ads" },
  { value: "hubstaff_talent", label: "Hubstaff Talent" },
  { value: "inbound", label: "Inbound" },
  { value: "internal_sji", label: "Internal SJI" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "marketing_agency", label: "Marketing Agency" },
  { value: "outbound_campaign", label: "Outbound Campaign" },
  { value: "plate_presence", label: "Plate Presence" },
  { value: "plate_presence_form", label: "Plate Presence Form" },
  { value: "reddit", label: "Reddit" },
  { value: "referral", label: "Referral" },
  { value: "shahed_personal_network", label: "Shahed Personal Network" },
  { value: "shopify_campaign", label: "Shopify Campaign" },
  { value: "skool_community", label: "Skool Community" },
  { value: "slack_community_channel", label: "Slack Community Channel" },
  { value: "tutor_db", label: "Tutor DB" },
  { value: "twitter", label: "Twitter" },
  { value: "upwork_existing_client", label: "Upwork (Existing Client)" },
  { value: "upwork_new_client", label: "Upwork (New Client)" },
  { value: "vishwanathan_personal_network", label: "Vishwanathan Personal Network" },
];

interface DealExternalLinks {
  n8n_workflow_url?: string | null;
  activecollab_project_url?: string | null;
}

interface Deal {
  id: string;
  title: string;
  amount: number | null;
  potential_amount?: number | null;
  stage: string | null;
  status?: string | null;
  close_date: string | null;
  expected_closing_date?: string | null;
  probability: number | null;
  created_at: string;
  updated_at: string;
  control_tower_id: string | null;
  control_tower_status: string | null;
  control_tower_client_id: string | null;
  control_tower_owner_id: string | null;
  pm_control_tower_id?: string | null;
  synced_from_control_tower: boolean | null;
  last_synced_at: string | null;
  last_activity_at?: string | null;
  last_activity_by?: string | null;
  client_id: string | null;
  owner_id: string | null;
  pm_assigned_id: string | null;
  notes?: string | null;
  hubspot_deal_id?: string | null;
  hubspot_crm_deal_url?: string | null;
  dealtype?: string | null;
  lead_source?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  external_links?: DealExternalLinks | null;
  deal_files?: DealFile[];
  google_drive_folder_id?: string | null;
  google_drive_folder_url?: string | null;

  // New Control Tower fields
  category?: string | null;
  pipeline?: string | null;
  type_of_work?: string | null;
  pod_id?: string | null;
  deal_details?: string | null;
  client_email?: string | null;
  client_phone?: string | null;

  // Document URLs
  estimate_url?: string | null;
  internal_estimate_doc_url?: string | null;
  client_estimate_doc_url?: string | null;
  estimate_task_link?: string | null;
  client_call_recording_link?: string | null;
  linkedin_profile_url?: string | null;
  internal_estimate_doc_link?: string | null;
  pandadoc_proposal_url?: string | null;

  // Collaboration URLs
  collaborative_ai?: string | null;
  collaborative_ai_link?: string | null;
  workboard_ai_link?: string | null;
  client_agent_url?: string | null;
  client_agent_folder?: string | null;

  // CRM URLs
  leadslift_crm_deal_url?: string | null;

  // POD relationship
  pods?: {
    id: string;
    name: string;
  } | null;

  // Client relationship
  client?: {
    id: string;
    name: string | null;
    company?: string | null;
    website?: string | null;
  } | null;
}

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  contact_person: string;
  website: string;
  industry: string;
  slug: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface QuickActionsPanelProps {
  dealId: string;
  deal: Deal | null;
  controlTowerId?: string | null;
  externalLinks?: DealExternalLinks | null;
}

const actionItems = [
  {
    id: "generate-docs",
    label: "Generate Business Documents",
    icon: FileText,
    tooltip: "N8N Integration - Coming in Phase 2",
  },
  {
    id: "generate-sow",
    label: "Generate SOW with Call Summary",
    icon: FileSignature,
    tooltip: "N8N Integration - Coming in Phase 2",
  },
  {
    id: "generate-nda",
    label: "Generate NDA",
    icon: FileCheck,
    tooltip: "N8N Integration - Coming in Phase 2",
  },
  {
    id: "ask-ai",
    label: "Ask AI for Suggestions",
    icon: Sparkles,
    tooltip: "AI Integration - Coming in Phase 2",
  },
  {
    id: "create-task",
    label: "Create ActiveCollab Task",
    icon: CheckSquare,
    tooltip: "ActiveCollab Integration - Coming in Phase 2",
  },
  {
    id: "create-project",
    label: "Create Project",
    icon: Folder,
    tooltip: "ActiveCollab Integration - Coming in Phase 2",
  },
];

const QuickActionsPanel = ({ dealId, deal, controlTowerId: _controlTowerId, externalLinks: _externalLinks }: QuickActionsPanelProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<{ id: string; name: string; description: string } | null>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["bd-ai-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents").select("id, name, description").in("type", ["deal_analysis", "proposal_review", "objection_handling"]).eq("is_active", true).order("name");

      if (error) throw error;
      return data;
    },
  });

  const runAgent = useRunBDAgent();

  const handleAction = async (actionId: string) => {
    setLoadingAction(actionId);
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast({ title: "Feature coming in Phase 2" });
    setLoadingAction(null);
  };

  const handleAgentClick = (agent: { id: string; name: string; description: string }) => {
    setActiveAgent(agent);
    setAgentResult(null);
  };

  const handleAgentExecute = async (fileIds: string[], userContext: string) => {
    if (!activeAgent || !deal) return;

    try {
      const result = await runAgent.mutateAsync({
        agentId: activeAgent.id,
        dealId: deal.id,
        dealTitle: deal.title,
        clientName: deal.client?.name,
        dealStage: deal.stage || undefined,
        fileIds,
        userContext,
      });

      setAgentResult(result);
    } catch (error) {
      console.error("Agent execution error:", error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Agents Section */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Bot className="h-3 w-3" />
              AI Agents
            </h4>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {agentsLoading ? (
                <div className="col-span-full flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : agents && agents.length > 0 ? (
                agents.map((agent) => (
                  <Button key={agent.id} variant="outline" className="w-full justify-start gap-2" onClick={() => handleAgentClick(agent)}>
                    <Bot className="h-4 w-4" />
                    {agent.name}
                  </Button>
                ))
              ) : (
                <p className="col-span-full text-xs text-muted-foreground">No agents available</p>
              )}

              {/* Document Q&A Button */}
              <Button variant="outline" className="w-full justify-start gap-2 border-primary/50 hover:bg-primary/5" onClick={() => setIsQAModalOpen(true)}>
                <MessageSquare className="h-4 w-4" />
                Ask About Documents
              </Button>
            </div>
          </div>

          <Separator />

          {/* Other Actions */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Other Actions</h4>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {actionItems.map((action) => (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2" disabled onClick={() => handleAction(action.id)}>
                      <action.icon className="h-4 w-4" />
                      {loadingAction === action.id ? "Loading…" : action.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{action.tooltip}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {activeAgent && (
        <AIAgentModal
          open={!!activeAgent}
          onOpenChange={(open) => {
            if (!open) {
              setActiveAgent(null);
              setAgentResult(null);
            }
          }}
          agentId={activeAgent.id}
          agentName={activeAgent.name}
          agentDescription={activeAgent.description}
          dealId={dealId}
          dealTitle={deal?.title || ""}
          onExecute={handleAgentExecute}
          isLoading={runAgent.isPending}
          result={agentResult}
        />
      )}

      <DocumentQAModal open={isQAModalOpen} onOpenChange={setIsQAModalOpen} dealId={dealId} dealTitle={deal?.title || ""} />
    </>
  );
};

interface ExternalLinksSectionProps {
  externalLinks?: DealExternalLinks | null;
  hubspotUrl?: string | null;
  leadsLiftUrl?: string | null;
  estimateUrl?: string | null;
  pandadocUrl?: string | null;
  workboardUrl?: string | null;
  clientAgentUrl?: string | null;
}

const ExternalLinksSection = ({ externalLinks, hubspotUrl, leadsLiftUrl, estimateUrl, pandadocUrl, workboardUrl, clientAgentUrl }: ExternalLinksSectionProps) => {
  const links = useMemo(
    () =>
      [
        {
          label: "HubSpot Deal",
          url: hubspotUrl,
          icon: ExternalLink,
          color: "text-orange-600",
        },
        {
          label: "LeadsLift CRM",
          url: leadsLiftUrl,
          icon: ExternalLink,
          color: "text-blue-600",
        },
        {
          label: "Estimate Document",
          url: estimateUrl,
          icon: FileText,
          color: "text-green-600",
        },
        {
          label: "PandaDoc Proposal",
          url: pandadocUrl,
          icon: FileSignature,
          color: "text-purple-600",
        },
        {
          label: "Workboard AI",
          url: workboardUrl,
          icon: Workflow,
          color: "text-indigo-600",
        },
        {
          label: "Client Agent",
          url: clientAgentUrl,
          icon: User,
          color: "text-teal-600",
        },
        {
          label: "N8N Workflow",
          url: externalLinks?.n8n_workflow_url,
          icon: Workflow,
          color: "text-purple-600",
        },
        {
          label: "ActiveCollab Project",
          url: externalLinks?.activecollab_project_url,
          icon: Folder,
          color: "text-blue-600",
        },
      ].filter((link) => link.url),
    [externalLinks, hubspotUrl, leadsLiftUrl, estimateUrl, pandadocUrl, workboardUrl, clientAgentUrl]
  );

  if (links.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ExternalLink className="h-4 w-4" />
          External Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.map((link) => (
          <a key={link.label} href={link.url!} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between rounded border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${link.color}`}>
            <span className="flex items-center gap-2 text-foreground">
              <link.icon className="h-4 w-4" />
              {link.label}
            </span>
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
};

interface DealStageProgressProps {
  currentStage?: string | null;
}

const pipelineStages = [
  { id: "prospecting", label: STAGE_LABELS.prospecting, color: "bg-blue-500" },
  { id: "qualification", label: STAGE_LABELS.qualification, color: "bg-purple-500" },
  { id: "proposal", label: STAGE_LABELS.proposal, color: "bg-yellow-500" },
  { id: "negotiation", label: STAGE_LABELS.negotiation, color: "bg-orange-500" },
  { id: "closed_won", label: STAGE_LABELS.closed_won, color: "bg-green-500" },
  { id: "closed_lost", label: STAGE_LABELS.closed_lost, color: "bg-red-500" },
];

const DealStageProgress = ({ currentStage }: DealStageProgressProps) => {
  const stageIndex = pipelineStages.findIndex((stage) => stage.id === currentStage);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
      {pipelineStages.map((stage, index) => {
        const isCompleted = stageIndex > index;
        const isCurrent = stageIndex === index;

        return (
          <div key={stage.id} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${isCompleted || isCurrent ? stage.color : "bg-muted text-muted-foreground"}`}>{isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</div>
            <div className="text-sm font-medium capitalize">
              {stage.label}
              {isCurrent && <span className="ml-2 text-xs text-primary">Current</span>}
            </div>
            {index < pipelineStages.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        );
      })}
    </div>
  );
};

const highlightMentions = (text: string, mentionedEmails?: string[] | null, teamMembers?: TeamMember[]) => {
  // If we have teamMembers, use the enhanced highlighting that supports @Name format
  if (teamMembers && teamMembers.length > 0) {
    return highlightMentionsInText(text, teamMembers);
  }

  // Fallback to email-based highlighting
  if (!mentionedEmails || mentionedEmails.length === 0) {
    return <>{text}</>;
  }

  const mentionSet = new Set(mentionedEmails.map((email) => email.toLowerCase()));
  const parts = text.split(/(@[\w.+-@]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("@")) {
          const value = part.slice(1).toLowerCase();
          if (mentionSet.has(value)) {
            return (
              <span key={`${part}-${index}`} className="font-semibold text-primary">
                {part}
              </span>
            );
          }
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
};

export default function DealDetail() {
  const { stage, slug } = useParams<{ stage: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Extract active tab from URL
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "overview";

  // Use the new hook to load deal by slug
  const { deal: dealData, isLoading: loadingDeal, error: dealError, dealId } = useDealBySlug(slug);

  const [deal, setDeal] = useState<Deal | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [pm, setPm] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [validOwners, setValidOwners] = useState<UserProfile[]>([]); // Users from users table only (for owner_id FK constraint)
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const autoApplyAttemptedRef = useRef(false);

  // Google Drive state
  const [syncingFolder, setSyncingFolder] = useState(false);
  const [showMapFolderDialog, setShowMapFolderDialog] = useState(false);
  const [folderUrl, setFolderUrl] = useState("");

  // Proposal state
  const [createProposalOpen, setCreateProposalOpen] = useState(false);

  // Rich text editor state for deal details
  const [dealDetailsContent, setDealDetailsContent] = useState("");

  // Local state for email and phone to prevent loss during refetch
  const [localEmail, setLocalEmail] = useState("");
  const [localPhone, setLocalPhone] = useState("");

  // Permission check for AI Lead Evaluation
  const canViewAiLeadEvaluation = Boolean(user && ["super_admin", "manager", "bd_user"].includes(user.role));

  const { data: comments, isLoading: commentsLoading } = useDealComments(dealId);
  const { data: checklistItems, isLoading: checklistLoading } = useDealChecklist(dealId);
  const { data: systemInfo, isLoading: systemInfoLoading } = useDealSystemInfo(dealId, deal?.title);
  const {
    files,
    loading: filesLoading,
    refetch: refetchFiles,
  } = useDealFiles({
    dealId: deal?.id,
    enabled: !!deal?.id,
  });

  // Attachments query for deal details
  const { data: dealAttachments, refetch: refetchAttachments } = useQuery({
    queryKey: ["deal-attachments", deal?.id],
    enabled: !!deal?.id,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("deal_detail_attachments" as any)
        .select("*")
        .eq("deal_id", deal?.id)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const addCommentMutation = useAddComment(dealId);
  const deleteCommentMutation = useDeleteComment(dealId);
  const updateCommentMutation = useUpdateComment(dealId);
  const addChecklistMutation = useAddChecklistItem(dealId);
  const toggleChecklistMutation = useToggleChecklistItem(dealId);
  const deleteChecklistMutation = useDeleteChecklistItem(dealId);
  const { syncDeals: syncSingleDeal, isSyncing: isSyncingSingle } = useSyncControlTowerDeals(dealId);
  const [isSyncingDeal, setIsSyncingDeal] = useState(false);
  const [resyncingChecklist, setResyncingChecklist] = useState(false);

  // Fetch PM and Owner contact info from both users and employees tables
  const { data: ownerContactInfo } = usePMContactInfo(deal?.owner_id, deal?.control_tower_owner_id);
  const { data: pmContactInfo } = usePMContactInfo(deal?.pm_assigned_id, deal?.pm_control_tower_id);

  // Fetch PODs for dropdown
  const { pods } = usePods();

  // Push client to GHL/Leadslift
  const { mutate: pushToGHL, isPending: isPushingToGHL } = usePushClientToGHL();

  // Handle tab changes and update URL
  const handleTabChange = (newTab: string) => {
    const newSearchParams = new URLSearchParams(location.search);
    if (newTab === "overview") {
      newSearchParams.delete("tab");
    } else {
      newSearchParams.set("tab", newTab);
    }
    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: true }
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const refreshDealDetails = useCallback(async () => {
    if (!dealId) return;

    try {
      const { data: refreshedDeal, error: refreshedDealError } = await supabase.from("deals").select("*, clients(*)").eq("id", dealId).single();

      if (refreshedDealError) throw refreshedDealError;

      if (refreshedDeal) {
        setDeal(refreshedDeal as unknown as unknown as Deal);
      }

      if (refreshedDeal?.client_id) {
        const { data: refreshedClient, error: refreshedClientError } = await supabase.from("clients").select("*").eq("id", refreshedDeal.client_id).single();

        if (!refreshedClientError && refreshedClient) {
          setClient(refreshedClient as Client);
        }
      }
    } catch (refreshError) {
      console.error("Failed to refresh deal after AI evaluation:", refreshError);
    }
  }, [dealId]);

  // Load deal from hook and fetch related data
  useEffect(() => {
    async function loadRelatedData() {
      if (!dealData) return;

      setDeal(dealData as unknown as Deal);
      setDealDetailsContent(dealData.deal_details || "");
      setLocalEmail(dealData.client_email || "");
      setLocalPhone(dealData.client_phone || "");

      // Fetch client
      if (dealData.client_id) {
        const { data: clientData } = await supabase.from("clients").select("*").eq("id", dealData.client_id).maybeSingle();
        if (clientData) setClient(clientData as Client);
      }

      // Fetch owner (check both users and employees tables)
      if (dealData.owner_id) {
        const { data: ownerData } = await supabase.from("users").select("id, first_name, last_name, email").eq("id", dealData.owner_id).maybeSingle();

        if (ownerData) {
          setOwner(ownerData as UserProfile);
        } else {
          // Try employees table if not found in users
          const { data: employeeData } = await supabase.from("employees").select("id, full_name, email").eq("id", dealData.owner_id).maybeSingle();

          if (employeeData) {
            const nameParts = (employeeData.full_name || "").split(" ");
            setOwner({
              id: employeeData.id,
              first_name: nameParts[0] || "",
              last_name: nameParts.slice(1).join(" ") || "",
              email: employeeData.email,
            } as UserProfile);
          }
        }
      }

      // Fetch PM (check both users and employees tables)
      if (dealData.pm_assigned_id) {
        const { data: pmData } = await supabase.from("users").select("id, first_name, last_name, email").eq("id", dealData.pm_assigned_id).maybeSingle();

        if (pmData) {
          setPm(pmData as UserProfile);
        } else {
          // Try employees table if not found in users
          const { data: employeeData } = await supabase.from("employees").select("id, full_name, email").eq("id", dealData.pm_assigned_id).maybeSingle();

          if (employeeData) {
            const nameParts = (employeeData.full_name || "").split(" ");
            setPm({
              id: employeeData.id,
              first_name: nameParts[0] || "",
              last_name: nameParts.slice(1).join(" ") || "",
              email: employeeData.email,
            } as UserProfile);
          }
        }
      }

      // Fetch all users for PM assignment dropdown (from both users and employees tables)
      const [usersResult, employeesResult] = await Promise.all([supabase.from("users").select("id, first_name, last_name, email").eq("status", "active").order("first_name"), supabase.from("employees").select("id, full_name, email").eq("is_active", true).order("full_name")]);

      // Users from users table - valid for Deal Owner (has FK constraint to auth.users)
      const usersOnly: UserProfile[] = (usersResult.data || []).map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
      }));
      usersOnly.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
      setValidOwners(usersOnly);

      // Combine users and employees for PM assignment (no FK constraint)
      // Use a Map to deduplicate by email, preferring users table entries
      const userMap = new Map<string, UserProfile>();

      // Add users first (they take priority)
      (usersResult.data || []).forEach((u) => {
        const email = (u.email || "").toLowerCase();
        userMap.set(email, {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
        });
      });

      // Add employees only if not already in the map
      (employeesResult.data || []).forEach((e) => {
        const email = (e.email || "").toLowerCase();
        if (!userMap.has(email)) {
          const nameParts = (e.full_name || "").split(" ");
          userMap.set(email, {
            id: e.id,
            first_name: nameParts[0] || "",
            last_name: nameParts.slice(1).join(" ") || "",
            email: e.email,
          });
        }
      });

      const combinedUsers: UserProfile[] = Array.from(userMap.values());

      // Sort combined list by first_name
      combinedUsers.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
      setAllUsers(combinedUsers);
    }

    loadRelatedData();
  }, [dealData]);

  // Handle errors from the hook
  useEffect(() => {
    if (dealError) {
      setError(dealError instanceof Error ? dealError.message : "Failed to load deal");
    }
  }, [dealError]);

  // Step 2: Fixed template auto-application with localStorage-based tracking per deal
  useEffect(() => {
    const autoApplyTemplate = async () => {
      // Wait for all data to load
      if (!deal?.id || !deal.stage || checklistLoading) return;

      // Check if we've already attempted for THIS specific deal
      const storageKey = `checklist-template-applied-${deal.id}`;
      if (localStorage.getItem(storageKey)) {
        console.log(`[Checklist] Template already applied for deal ${deal.id}`);
        return;
      }

      // Only apply if checklist is truly empty (not loading)
      if (checklistItems && checklistItems.length > 0) {
        console.log(`[Checklist] Checklist already has ${checklistItems.length} items, skipping template`);
        return;
      }

      // Mark as attempted BEFORE calling the function to prevent race conditions
      localStorage.setItem(storageKey, "true");
      console.log(`[Checklist] Applying template for deal ${deal.id}, stage: ${deal.stage}`);

      try {
        const { data, error } = await supabase.functions.invoke("apply-checklist-template", {
          body: { dealId: deal.id, stage: deal.stage },
        });

        if (error) throw error;
        if (data?.success) {
          console.log(`[Checklist] Template applied successfully:`, data);
          toast({ title: "Checklist template applied" });
          queryClient.invalidateQueries({ queryKey: ["deal-checklist", deal.id] });
        } else {
          console.log(`[Checklist] Template application result:`, data);
        }
      } catch (err) {
        console.error("[Checklist] Failed to apply template:", err);
        // On error, clear the flag so it can be retried
        localStorage.removeItem(storageKey);
      }
    };

    autoApplyTemplate();
  }, [deal?.id, deal?.stage, checklistItems, checklistLoading, queryClient]);

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "-";
    }
  };

  // Convert allUsers to TeamMember format for MentionInput
  const teamMembers: TeamMember[] = useMemo(() => {
    const members = allUsers.map((u) => ({
      id: u.id,
      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
      email: u.email,
    }));
    console.log("DealDetail - Team Members created:", members);
    return members;
  }, [allUsers]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    // Use the new extractMentionedEmails helper
    const { mentionedUsers, mentionedEmails } = extractMentionedEmails(newComment, teamMembers);

    try {
      await addCommentMutation.mutateAsync({
        comment: newComment,
        mentioned_users: mentionedUsers,
        mentioned_user_emails: mentionedEmails,
      });
      setNewComment("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleStartEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        commentId: editingCommentId,
        comment: editingCommentText.trim(),
      });
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    addChecklistMutation.mutate(newChecklistItem);
    setNewChecklistItem("");
  };

  const handleToggleChecklistItem = (itemId: string, isCompleted: boolean) => {
    toggleChecklistMutation.mutate({ itemId, isCompleted });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteChecklistMutation.mutate(itemId);
    }
  };

  // PM Assignment mutation
  const assignPmMutation = useMutation({
    mutationFn: async (pmId: string | null) => {
      if (!deal?.id) throw new Error("No deal ID");

      const oldPmId = deal?.pm_assigned_id;
      const { data, error } = await supabase.from("deals").update({ pm_assigned_id: pmId }).eq("id", deal.id).select("pm_assigned_id").single();

      if (error) throw error;
      return { data, oldPmId };
    },
    onSuccess: async (result, pmId) => {
      if (pmId) {
        const { data: pmData } = await supabase.from("users").select("id, first_name, last_name, email").eq("id", pmId).single();
        if (pmData) setPm(pmData as UserProfile);
      } else {
        setPm(null);
      }

      toast({
        title: "PM assigned successfully",
        description: pmId ? "Project manager has been updated" : "Project manager removed",
      });
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      
      // Send notification (non-blocking)
      if (deal?.id && pmId) {
        sendAssigneeNotification(deal.id, pmId, result.oldPmId || null, 'pm', user?.id);
      }
    },
    onError: (error) => {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Failed to assign PM",
        variant: "destructive",
      });
    },
  });

  const handleAssignPm = (pmId: string) => {
    assignPmMutation.mutate(pmId === "unassigned" ? null : pmId);
  };

  const handleAssignToMe = async (role: "owner" | "pm") => {
    if (!deal?.id || !user?.id) return;

    const field = role === "owner" ? "owner_id" : "pm_assigned_id";
    const oldAssigneeId = role === "owner" ? deal?.owner_id : deal?.pm_assigned_id;

    try {
      const { error } = await supabase
        .from("deals")
        .update({ [field]: user.id })
        .eq("id", deal.id);

      if (error) throw error;

      if (role === "owner") {
        const { data: ownerData } = await supabase.from("users").select("id, first_name, last_name, email").eq("id", user.id).single();
        if (ownerData) setOwner(ownerData as UserProfile);
      } else {
        const { data: pmData } = await supabase.from("users").select("id, first_name, last_name, email").eq("id", user.id).single();
        if (pmData) setPm(pmData as UserProfile);
      }

      toast({
        title: "Assigned successfully",
        description: `You are now the ${role === "owner" ? "deal owner" : "project manager"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      
      // Send notification (self-assignment, but the edge function will skip it)
      sendAssigneeNotification(deal.id, user.id, oldAssigneeId || null, role, user.id);
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Failed to assign",
        variant: "destructive",
      });
    }
  };

  // Helper function to send assignee notification
  const sendAssigneeNotification = async (
    dealId: string,
    newAssigneeId: string | null,
    oldAssigneeId: string | null,
    assignmentType: 'owner' | 'pm',
    changedById?: string
  ) => {
    if (!newAssigneeId) return; // Don't notify if unassigning
    
    try {
      await supabase.functions.invoke('deal-assignee-notification', {
        body: {
          deal_id: dealId,
          new_assignee_id: newAssigneeId,
          old_assignee_id: oldAssigneeId,
          assignment_type: assignmentType,
          changed_by_id: changedById,
        },
      });
      console.log(`[DealDetail] Assignee notification sent for ${assignmentType}`);
    } catch (error) {
      // Don't block the assignment, just log the error
      console.error(`[DealDetail] Failed to send assignee notification:`, error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const handleSyncDealFromControlTower = async () => {
    setIsSyncingDeal(true);
    try {
      await syncSingleDeal();
      // Refresh all deal data after sync
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["deal", dealId] }), queryClient.invalidateQueries({ queryKey: ["deal-checklist", dealId] }), queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] }), queryClient.invalidateQueries({ queryKey: ["deal-files", dealId] })]);

      // Refresh the deal data locally
      await refreshDealDetails();

      toast({
        title: "Sync complete",
        description: "Deal data updated from Control Tower",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSyncingDeal(false);
    }
  };

  const handleResyncChecklist = async () => {
    if (!deal?.synced_from_control_tower) {
      toast({
        title: "Cannot re-sync",
        description: "This deal is not synced from Control Tower",
        variant: "destructive",
      });
      return;
    }

    setResyncingChecklist(true);
    try {
      const { data, error } = await supabase.functions.invoke("resync-deal-checklist", {
        body: { dealId },
      });

      if (error) throw error;

      // Refresh checklist and deal data
      await queryClient.invalidateQueries({ queryKey: ["deal-checklist", dealId] });
      await queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      await refreshDealDetails();

      toast({
        title: "Checklist re-synced",
        description: `${data.synced_count} items synced from Control Tower`,
      });
    } catch (error) {
      toast({
        title: "Re-sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setResyncingChecklist(false);
    }
  };

  const handleMapGoogleDriveFolder = async () => {
    if (!deal || !folderUrl.trim()) return;

    const folderIdMatch = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (!folderIdMatch) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Drive folder URL",
        variant: "destructive",
      });
      return;
    }

    const folderId = folderIdMatch[1];

    try {
      const { error } = await supabase
        .from("deals")
        .update({
          google_drive_folder_id: folderId,
          google_drive_folder_url: folderUrl.trim(),
        })
        .eq("id", deal.id);

      if (error) throw error;

      setDeal({ ...deal, google_drive_folder_id: folderId, google_drive_folder_url: folderUrl.trim() });
      setShowMapFolderDialog(false);
      setFolderUrl("");

      toast({
        title: "Folder mapped",
        description: "Google Drive folder has been linked to this deal",
      });

      await handleSyncDriveFolder(folderId);
    } catch (error) {
      console.error("Failed to map folder", error);
      toast({
        title: "Error",
        description: "Failed to map Google Drive folder",
        variant: "destructive",
      });
    }
  };

  const handleSyncDriveFolder = async (folderId?: string) => {
    if (!deal) return;

    const driveFolder = folderId || deal.google_drive_folder_id;
    if (!driveFolder) return;

    setSyncingFolder(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-deal-files", {
        body: {
          deals: [
            {
              dealId: deal.id,
              driveFolderId: driveFolder,
            },
          ],
        },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (result?.status === "success") {
        toast({
          title: "Sync complete",
          description: `${result.filesAdded || 0} files added, ${result.filesUpdated || 0} updated`,
        });
        refetchFiles();
      } else {
        throw new Error(result?.error || "Sync failed");
      }
    } catch (error) {
      console.error("Sync failed", error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unable to sync Google Drive folder",
        variant: "destructive",
      });
    } finally {
      setSyncingFolder(false);
    }
  };

  const completionPercentage = checklistItems ? Math.round((checklistItems.filter((item) => item.is_completed).length / checklistItems.length) * 100) || 0 : 0;

  const getStageBadgeVariant = (currentStage?: string | null): "default" | "destructive" | "outline" | "secondary" => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      prospecting: "secondary",
      qualification: "outline",
      proposal: "default",
      negotiation: "default",
      closed_won: "default",
      closed_lost: "destructive",
    };
    return variants[currentStage ?? ""] || "secondary";
  };

  if (loadingDeal) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || "Deal not found"}</p>
            <div className="mt-4 text-center">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPath = location.pathname;
  const basePath = `/pipeline/${stage}/${slug}`;
  const isFilesTab = currentPath.includes("/files");

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${stage}`}>{STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[300px] truncate">{deal?.title || "Loading..."}</BreadcrumbPage>
          </BreadcrumbItem>
          {activeTab !== "overview" && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="capitalize">{activeTab}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {deal.client_id && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => pushToGHL({ clientId: deal.client_id! })} disabled={isPushingToGHL || !deal.client_id}>
                    {isPushingToGHL ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {(client as any)?.gohighlevel_contact_id ? "Updating..." : "Creating..."}
                      </>
                    ) : (client as any)?.gohighlevel_contact_id ? (
                      "Update in Leadslift"
                    ) : (
                      "Add Contact & Create Deal on Leadslift"
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{(client as any)?.gohighlevel_contact_id ? "Update this client contact in Leadslift/GoHighLevel CRM" : "Add this client as a contact and create an opportunity in Leadslift CRM"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStageBadgeVariant(deal.stage)} className="capitalize">
                {deal.stage?.replace("_", " ") || "prospecting"}
              </Badge>

              {/* Status Selector */}
              <Select
                value={deal.status || "active"}
                onValueChange={async (value: DealStatus) => {
                  try {
                    await supabase.from("deals").update({ status: value }).eq("id", deal.id);
                    toast({ title: "Status updated successfully" });
                    queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                  } catch (error) {
                    toast({ title: "Failed to update status", variant: "destructive" });
                  }
                }}
              >
                <SelectTrigger className="w-[140px] h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {deal.priority && <Badge variant="outline">Priority: {deal.priority}</Badge>}
              {deal.synced_from_control_tower && <Badge variant="outline">Synced from Control Tower</Badge>}
            </div>
            <Input
              className="text-3xl font-bold border-none p-0 h-auto focus-visible:ring-0"
              value={deal.title}
              onChange={async (e) => {
                try {
                  await supabase.from("deals").update({ title: e.target.value }).eq("id", deal.id);
                  queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                } catch (error) {
                  toast({ title: "Failed to update title", variant: "destructive" });
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {formatDate(deal.created_at)}
              </span>
              {deal.last_activity_at && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Last activity {formatDistanceToNow(new Date(deal.last_activity_at), { addSuffix: true })}
                </span>
              )}
              {deal.last_synced_at && (
                <span className="flex items-center gap-1">
                  <Workflow className="h-4 w-4" />
                  Synced {formatDistanceToNow(new Date(deal.last_synced_at), { addSuffix: true })}
                </span>
              )}
            </div>
            {deal.tags && deal.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {deal.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 min-w-[300px]">
            <div>
              <Label htmlFor="amount" className="text-xs text-muted-foreground">
                Deal Amount
              </Label>
              <Input
                id="amount"
                type="number"
                className="h-10 text-2xl font-bold text-right"
                defaultValue={deal.amount || ""}
                onBlur={async (e) => {
                  const newValue = parseFloat(e.target.value) || null;
                  if (newValue !== deal.amount) {
                    try {
                      await supabase.from("deals").update({ amount: newValue }).eq("id", deal.id);
                      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                      toast({ title: "Deal amount updated" });
                    } catch (error) {
                      toast({ title: "Failed to update amount", variant: "destructive" });
                    }
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="potential_amount" className="text-xs text-muted-foreground">
                Potential Amount
              </Label>
              <Input
                id="potential_amount"
                type="number"
                className="h-8 text-sm text-right"
                defaultValue={deal.potential_amount || ""}
                onBlur={async (e) => {
                  const newValue = parseFloat(e.target.value) || null;
                  if (newValue !== deal.potential_amount) {
                    try {
                      await supabase.from("deals").update({ potential_amount: newValue }).eq("id", deal.id);
                      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                      toast({ title: "Potential amount updated" });
                    } catch (error) {
                      toast({ title: "Failed to update potential amount", variant: "destructive" });
                    }
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="probability" className="text-xs text-muted-foreground">
                Probability (%)
              </Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                step="1"
                className="h-8 text-sm text-right"
                defaultValue={deal.probability ?? ""}
                onBlur={async (e) => {
                  const newValue = e.target.value ? parseFloat(e.target.value) : null;
                  if (newValue !== null && (newValue < 0 || newValue > 100)) {
                    toast({ title: "Probability must be between 0 and 100", variant: "destructive" });
                    return;
                  }
                  try {
                    await supabase.from("deals").update({ probability: newValue }).eq("id", deal.id);
                    queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                    toast({ title: "Probability updated successfully" });
                  } catch (error) {
                    toast({ title: "Failed to update probability", variant: "destructive" });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" colorIndicator="blue">
            Overview
          </TabsTrigger>
          <TabsTrigger value="activities" colorIndicator="green">
            <div className="flex items-center gap-2">
              Activities
              {comments && comments.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 py-0 text-xs">
                  {comments.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="tasks" colorIndicator="yellow">
            <div className="flex items-center gap-2">
              Tasks
              {checklistItems && checklistItems.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 py-0 text-xs">
                  {checklistItems.filter((item) => item.is_completed).length}/{checklistItems.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="documents" colorIndicator="purple">
            <div className="flex items-center gap-2">
              Documents
              {files.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 py-0 text-xs">
                  {files.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="systems" colorIndicator="orange">
            Action
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {deal?.client_id && <AiLeadEvaluation dealId={deal.id} clientId={deal.client_id} companyName={deal.client?.company?.trim() || deal.client?.name?.trim() || deal.title || "Unnamed Deal"} website={deal.client?.website} probability={deal.probability} status={deal.status} canAccess={canViewAiLeadEvaluation} onDealRefetch={refreshDealDetails} />}
          <DealStageProgress currentStage={deal.stage} />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Control Tower Sync Card */}
            {deal.synced_from_control_tower && (
              <div className="md:col-span-2">
                <DealControlTowerSync dealId={deal.id} syncedFromControlTower={deal.synced_from_control_tower} lastSyncedAt={deal.last_synced_at} updatedAt={deal.updated_at} />
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Deal Information - Compact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-4 w-4" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Stage</p>
                    <Select
                      value={deal.stage || "prospecting"}
                      onValueChange={async (value) => {
                        try {
                          await supabase.from("deals").update({ stage: value }).eq("id", deal.id);
                          toast({ title: "Stage updated successfully" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update stage", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select
                      value={deal.status || "active"}
                      onValueChange={async (value: DealStatus) => {
                        try {
                          await supabase.from("deals").update({ status: value }).eq("id", deal.id);
                          toast({ title: "Status updated successfully" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update status", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Close</p>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      defaultValue={deal.expected_closing_date || deal.close_date || ""}
                      onChange={async (e) => {
                        try {
                          await supabase.from("deals").update({ expected_closing_date: e.target.value }).eq("id", deal.id);
                          toast({ title: "Expected close date updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update date", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Source</p>
                    <Select
                      value={deal.lead_source || ""}
                      onValueChange={async (value) => {
                        try {
                          await supabase.from("deals").update({ lead_source: value }).eq("id", deal.id);
                          toast({ title: "Lead source updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update lead source", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Click to select" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deal Type</p>
                    <Select
                      value={deal.dealtype || "newbusiness"}
                      onValueChange={async (value) => {
                        try {
                          await supabase.from("deals").update({ dealtype: value }).eq("id", deal.id);
                          toast({ title: "Deal type updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update deal type", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newbusiness">New Business</SelectItem>
                        <SelectItem value="existingbusiness">Existing Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <Select
                      value={deal.category || ""}
                      onValueChange={async (value) => {
                        try {
                          await supabase.from("deals").update({ category: value }).eq("id", deal.id);
                          toast({ title: "Category updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update category", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Click to select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pipeline</p>
                    <Select
                      value={deal.pipeline || "default"}
                      onValueChange={async (value) => {
                        try {
                          await supabase.from("deals").update({ pipeline: value }).eq("id", deal.id);
                          toast({ title: "Pipeline updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update pipeline", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select pipeline" />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type of Work</p>
                    <Select
                      value={deal.type_of_work || ""}
                      onValueChange={async (value) => {
                        try {
                          await supabase.from("deals").update({ type_of_work: value }).eq("id", deal.id);
                          toast({ title: "Type of work updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update type of work", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Click to select" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OF_WORK_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Email Field */}
                  <div>
                    <Label htmlFor="client-email" className="text-xs text-muted-foreground">
                      Email Address
                    </Label>
                    <Input
                      id="client-email"
                      type="email"
                      placeholder="client@example.com"
                      value={localEmail}
                      onChange={(e) => {
                        // Update local state immediately for responsive UI
                        setLocalEmail(e.target.value);
                      }}
                      onBlur={async (e) => {
                        const newEmail = e.target.value.trim();
                        // Only update if value changed
                        if (newEmail !== (deal.client_email || "")) {
                          try {
                            const { error } = await supabase
                              .from("deals")
                              .update({ client_email: newEmail || null })
                              .eq("id", deal.id);

                            if (error) {
                              console.error("Failed to update email address:", error);
                              toast({ title: "Failed to update email address", description: error.message, variant: "destructive" });
                              // Revert to database value on error
                              setLocalEmail(deal.client_email || "");
                            } else {
                              toast({ title: "Email address updated" });
                              // Update deal object to match saved value
                              setDeal({ ...deal, client_email: newEmail || null });
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                            }
                          } catch (error) {
                            console.error("Error updating email address:", error);
                            toast({ title: "Failed to update email address", variant: "destructive" });
                            // Revert to database value on error
                            setLocalEmail(deal.client_email || "");
                          }
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Client Phone Field */}
                  <div>
                    <Label htmlFor="client-phone" className="text-xs text-muted-foreground">
                      Phone Number
                    </Label>
                    <Input
                      id="client-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={localPhone}
                      onChange={(e) => {
                        // Update local state immediately for responsive UI
                        setLocalPhone(e.target.value);
                      }}
                      onBlur={async (e) => {
                        const newPhone = e.target.value.trim();
                        // Only update if value changed
                        if (newPhone !== (deal.client_phone || "")) {
                          try {
                            const { error } = await supabase
                              .from("deals")
                              .update({ client_phone: newPhone || null })
                              .eq("id", deal.id);

                            if (error) {
                              console.error("Failed to update phone number:", error);
                              toast({ title: "Failed to update phone number", description: error.message, variant: "destructive" });
                              // Revert to database value on error
                              setLocalPhone(deal.client_phone || "");
                            } else {
                              toast({ title: "Phone number updated" });
                              // Update deal object to match saved value
                              setDeal({ ...deal, client_phone: newPhone || null });
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                            }
                          } catch (error) {
                            console.error("Error updating phone number:", error);
                            toast({ title: "Failed to update phone number", variant: "destructive" });
                            // Revert to database value on error
                            setLocalPhone(deal.client_phone || "");
                          }
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">POD</p>
                    <Select
                      value={deal.pod_id || "unassigned"}
                      onValueChange={async (value) => {
                        try {
                          await supabase
                            .from("deals")
                            .update({ pod_id: value === "unassigned" ? null : value })
                            .eq("id", deal.id);
                          toast({ title: "POD updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update POD", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select POD" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {pods.map((pod) => (
                          <SelectItem key={pod.id} value={pod.id}>
                            {pod.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Deal Details - Rich Text Editor */}
                <div className="col-span-2 mt-4">
                  <p className="text-xs text-muted-foreground mb-1">Deal Details</p>
                  <RichTextEditor
                    content={dealDetailsContent}
                    onChange={setDealDetailsContent}
                    onBlur={async () => {
                      if (dealDetailsContent !== (deal.deal_details || "")) {
                        try {
                          await supabase
                            .from("deals")
                            .update({ deal_details: dealDetailsContent || null })
                            .eq("id", deal.id);
                          toast({ title: "Deal details saved" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to save deal details", variant: "destructive" });
                        }
                      }
                    }}
                    placeholder="Enter deal details here... Use @ to mention team members"
                    teamMembers={teamMembers}
                    className="min-h-[150px]"
                  />

                  {/* File Attachments */}
                  <div className="mt-4">
                    <FileAttachments dealId={deal.id} attachments={dealAttachments || []} onAttachmentsChange={() => refetchAttachments()} maxFileSize={5 * 1024 * 1024} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client & Team - Merged */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-4 w-4" />
                  Client & Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client Info */}
                {client && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Client</p>
                    <div className="space-y-2">
                      <div>
                        <Link to={`/clients/${client.slug}`} className="text-sm font-medium text-primary hover:underline">
                          {client.company || client.name}
                        </Link>
                        {client.contact_person && <p className="text-xs text-muted-foreground">{client.contact_person}</p>}
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <a href={`mailto:${client.email}`} className="text-xs hover:underline">
                            {client.email}
                          </a>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <a href={`tel:${client.phone}`} className="text-xs hover:underline">
                            {client.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Team Info */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Team</p>

                  {/* Deal Owner */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Deal Owner</p>
                      {owner?.id !== user?.id && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleAssignToMe("owner")}>
                          Assign to Me
                        </Button>
                      )}
                    </div>
                    {ownerContactInfo ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{ownerContactInfo.full_name}</p>
                          {ownerContactInfo.source === "control_tower" && (
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              CT
                            </Badge>
                          )}
                        </div>
                        {ownerContactInfo.email && (
                          <a href={`mailto:${ownerContactInfo.email}`} className="text-xs text-muted-foreground hover:underline block">
                            {ownerContactInfo.email}
                          </a>
                        )}
                        {ownerContactInfo.phone && (
                          <a href={`tel:${ownerContactInfo.phone}`} className="text-xs text-muted-foreground hover:underline block">
                            {ownerContactInfo.phone}
                          </a>
                        )}
                        <Select
                          value={owner?.id || "unassigned"}
                          onValueChange={async (value) => {
                            const oldOwnerId = owner?.id || null;
                            try {
                              // Immediately update local state for instant UI feedback
                              if (value === "unassigned") {
                                setOwner(null);
                              } else {
                                const selectedUser = allUsers.find((u) => u.id === value);
                                if (selectedUser) {
                                  setOwner(selectedUser);
                                }
                              }

                              const { error: updateError } = await supabase
                                .from("deals")
                                .update({ owner_id: value === "unassigned" ? null : value })
                                .eq("id", deal.id);

                              if (updateError) throw updateError;

                              toast({ title: "Deal owner updated" });
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                              
                              // Send notification (non-blocking)
                              if (value !== "unassigned") {
                                sendAssigneeNotification(deal.id, value, oldOwnerId, 'owner', user?.id);
                              }
                            } catch (error) {
                              console.error("Failed to update deal owner:", error);
                              // Revert on error by refetching
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                              toast({
                                title: "Failed to update deal owner",
                                description: error instanceof Error ? error.message : "Database update failed",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs mt-2">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              Unassigned
                            </SelectItem>
                            {allUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.first_name} {u.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : owner ? (
                      <div>
                        <p className="text-sm font-medium">
                          {owner.first_name} {owner.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{owner.email}</p>
                        <Select
                          value={owner?.id || "unassigned"}
                          onValueChange={async (value) => {
                            const oldOwnerId = owner?.id || null;
                            try {
                              // Immediately update local state for instant UI feedback
                              if (value === "unassigned") {
                                setOwner(null);
                              } else {
                                const selectedUser = allUsers.find((u) => u.id === value);
                                if (selectedUser) {
                                  setOwner(selectedUser);
                                }
                              }

                              const { error: updateError } = await supabase
                                .from("deals")
                                .update({ owner_id: value === "unassigned" ? null : value })
                                .eq("id", deal.id);

                              if (updateError) throw updateError;

                              toast({ title: "Deal owner updated" });
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                              
                              // Send notification (non-blocking)
                              if (value !== "unassigned") {
                                sendAssigneeNotification(deal.id, value, oldOwnerId, 'owner', user?.id);
                              }
                            } catch (error) {
                              console.error("Failed to update deal owner:", error);
                              // Revert on error by refetching
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                              toast({
                                title: "Failed to update deal owner",
                                description: error instanceof Error ? error.message : "Database update failed",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs mt-2">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              Unassigned
                            </SelectItem>
                            {allUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.first_name} {u.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Not assigned</p>
                        <Select
                          value="unassigned"
                          onValueChange={async (value) => {
                            try {
                              // Immediately update local state for instant UI feedback
                              if (value !== "unassigned") {
                                const selectedUser = allUsers.find((u) => u.id === value);
                                if (selectedUser) {
                                  setOwner(selectedUser);
                                }
                              }

                              const { error: updateError } = await supabase
                                .from("deals")
                                .update({ owner_id: value === "unassigned" ? null : value })
                                .eq("id", deal.id);

                              if (updateError) throw updateError;

                              toast({ title: "Deal owner updated" });
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                              
                              // Send notification (non-blocking) - no old owner since was unassigned
                              if (value !== "unassigned") {
                                sendAssigneeNotification(deal.id, value, null, 'owner', user?.id);
                              }
                            } catch (error) {
                              console.error("Failed to update deal owner:", error);
                              // Revert on error by refetching
                              queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                              toast({
                                title: "Failed to update deal owner",
                                description: error instanceof Error ? error.message : "Database update failed",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              Unassigned
                            </SelectItem>
                            {allUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.first_name} {u.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Project Manager */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Project Manager</p>
                      {pm?.id !== user?.id && pmContactInfo?.source === "local_user" && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleAssignToMe("pm")}>
                          Assign to Me
                        </Button>
                      )}
                    </div>
                    {pmContactInfo ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{pmContactInfo.full_name}</p>
                          {pmContactInfo.source === "control_tower" && (
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              CT
                            </Badge>
                          )}
                        </div>
                        {pmContactInfo.email && (
                          <a href={`mailto:${pmContactInfo.email}`} className="text-xs text-muted-foreground hover:underline block">
                            {pmContactInfo.email}
                          </a>
                        )}
                        {pmContactInfo.phone && (
                          <a href={`tel:${pmContactInfo.phone}`} className="text-xs text-muted-foreground hover:underline block">
                            {pmContactInfo.phone}
                          </a>
                        )}
                        {pmContactInfo.source === "local_user" && (
                          <Select value={pm?.id || "unassigned"} onValueChange={handleAssignPm} disabled={assignPmMutation.isPending}>
                            <SelectTrigger className="h-8 text-xs mt-2">
                              <SelectValue placeholder="Select PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned" className="text-xs">
                                Unassigned
                              </SelectItem>
                              {allUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-xs">
                                  {u.first_name} {u.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ) : pm ? (
                      <div>
                        <p className="text-sm font-medium">
                          {pm.first_name} {pm.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{pm.email}</p>
                        <Select value={pm?.id || "unassigned"} onValueChange={handleAssignPm} disabled={assignPmMutation.isPending}>
                          <SelectTrigger className="h-8 text-xs mt-2">
                            <SelectValue placeholder="Select PM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              Unassigned
                            </SelectItem>
                            {allUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.first_name} {u.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Not assigned</p>
                        <Select value="unassigned" onValueChange={handleAssignPm} disabled={assignPmMutation.isPending}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select PM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              Unassigned
                            </SelectItem>
                            {allUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.first_name} {u.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {deal.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Deal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{deal.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Documents & Estimates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" />
                  Documents & Estimates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="internal_estimate_doc_url" className="text-xs">
                    Internal Estimate Doc URL
                  </Label>
                  <Input
                    id="internal_estimate_doc_url"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.internal_estimate_doc_url || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.internal_estimate_doc_url || "")) {
                        try {
                          await supabase.from("deals").update({ internal_estimate_doc_url: e.target.value }).eq("id", deal.id);
                          toast({ title: "Internal estimate doc URL updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update internal estimate doc URL", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="client_estimate_doc_url" className="text-xs">
                    Client Estimate Doc URL
                  </Label>
                  <Input
                    id="client_estimate_doc_url"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.client_estimate_doc_url || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.client_estimate_doc_url || "")) {
                        try {
                          await supabase.from("deals").update({ client_estimate_doc_url: e.target.value }).eq("id", deal.id);
                          toast({ title: "Client estimate doc URL updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update client estimate doc URL", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="pandadoc_proposal_url" className="text-xs">
                    PandaDoc Proposal URL
                  </Label>
                  <Input
                    id="pandadoc_proposal_url"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.pandadoc_proposal_url || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.pandadoc_proposal_url || "")) {
                        try {
                          await supabase.from("deals").update({ pandadoc_proposal_url: e.target.value }).eq("id", deal.id);
                          toast({ title: "PandaDoc URL updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update PandaDoc URL", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="estimate_task_link" className="text-xs">
                    Estimate Task Link
                  </Label>
                  <Input
                    id="estimate_task_link"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.estimate_task_link || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.estimate_task_link || "")) {
                        try {
                          await supabase.from("deals").update({ estimate_task_link: e.target.value }).eq("id", deal.id);
                          toast({ title: "Estimate task link updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update estimate task link", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="client_call_recording_link" className="text-xs">
                    Client Call Recording Link
                  </Label>
                  <Input
                    id="client_call_recording_link"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.client_call_recording_link || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.client_call_recording_link || "")) {
                        try {
                          await supabase.from("deals").update({ client_call_recording_link: e.target.value }).eq("id", deal.id);
                          toast({ title: "Client call recording link updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update client call recording link", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin_profile_url" className="text-xs">
                    LinkedIn Profile
                  </Label>
                  <Input
                    id="linkedin_profile_url"
                    className="h-8 text-sm"
                    placeholder="https://linkedin.com/in/..."
                    defaultValue={deal.linkedin_profile_url || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.linkedin_profile_url || "")) {
                        try {
                          await supabase.from("deals").update({ linkedin_profile_url: e.target.value }).eq("id", deal.id);
                          toast({ title: "LinkedIn profile updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update LinkedIn profile", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Collaboration Tools Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Collaboration & Workspaces
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="workboard_ai_link" className="text-xs">
                    Workboard AI URL
                  </Label>
                  <Input
                    id="workboard_ai_link"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.workboard_ai_link || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.workboard_ai_link || "")) {
                        try {
                          await supabase.from("deals").update({ workboard_ai_link: e.target.value }).eq("id", deal.id);
                          toast({ title: "Workboard AI link updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update Workboard AI link", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="client_agent_url" className="text-xs">
                    Client Agent URL
                  </Label>
                  <Input
                    id="client_agent_url"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.client_agent_url || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.client_agent_url || "")) {
                        try {
                          await supabase.from("deals").update({ client_agent_url: e.target.value }).eq("id", deal.id);
                          toast({ title: "Client agent URL updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update client agent URL", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="client_agent_folder" className="text-xs">
                    Client Agent Folder
                  </Label>
                  <Input
                    id="client_agent_folder"
                    className="h-8 text-sm"
                    placeholder="Enter folder path"
                    defaultValue={deal.client_agent_folder || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.client_agent_folder || "")) {
                        try {
                          await supabase.from("deals").update({ client_agent_folder: e.target.value }).eq("id", deal.id);
                          toast({ title: "Client agent folder updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update client agent folder", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* CRM Links Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ExternalLink className="h-4 w-4" />
                  CRM & External Systems
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="hubspot_crm_deal_url" className="text-xs">
                    HubSpot CRM Deal URL
                  </Label>
                  <Input
                    id="hubspot_crm_deal_url"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.hubspot_crm_deal_url || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.hubspot_crm_deal_url || "")) {
                        try {
                          await supabase.from("deals").update({ hubspot_crm_deal_url: e.target.value }).eq("id", deal.id);
                          toast({ title: "HubSpot URL updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update HubSpot URL", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="leadslift_crm_deal_url" className="text-xs">
                    LeadsLift CRM Deal URL
                  </Label>
                  <Input
                    id="leadslift_crm_deal_url"
                    className="h-8 text-sm"
                    placeholder="https://..."
                    defaultValue={deal.leadslift_crm_deal_url || ""}
                    onBlur={async (e) => {
                      if (e.target.value !== (deal.leadslift_crm_deal_url || "")) {
                        try {
                          await supabase.from("deals").update({ leadslift_crm_deal_url: e.target.value }).eq("id", deal.id);
                          toast({ title: "LeadsLift URL updated" });
                          queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
                        } catch (error) {
                          toast({ title: "Failed to update LeadsLift URL", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </div>
                {deal.control_tower_id && (
                  <div className="rounded border px-3 py-2">
                    <div className="text-xs text-muted-foreground">Control Tower ID</div>
                    <div className="text-sm font-medium">{deal.control_tower_id}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments & Activity
                {comments && comments.length > 0 && <Badge variant="secondary">{comments.length}</Badge>}
              </CardTitle>
              {comments && comments.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const formattedComments = comments
                          .map((comment) => {
                            const name = `${comment.user.first_name || ""} ${comment.user.last_name || ""}`.trim() || comment.user.email;
                            const time = format(new Date(comment.created_at), "hh:mm a");
                            const ago = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
                            return `${name}\n${time} ${ago}\n${comment.comment}`;
                          })
                          .join("\n\n");
                        navigator.clipboard.writeText(formattedComments);
                        toast({ title: "Copied!", description: "All comments copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy all comments with formatting</TooltipContent>
                </Tooltip>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {commentsLoading ? (
                  <div className="space-y-3">
                    <div className="h-20 bg-muted animate-pulse rounded-lg" />
                    <div className="h-20 bg-muted animate-pulse rounded-lg" />
                  </div>
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 p-4 rounded-lg space-y-2" style={{ display: "block" }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{comment.user.first_name?.[0] || comment.user.email[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium" style={{ display: "block" }}>
                              {comment.user.first_name} {comment.user.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground" style={{ display: "block" }}>
                              {format(new Date(comment.created_at), "hh:mm a")} {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              {comment.updated_at && comment.updated_at !== comment.created_at && <span className="ml-1 italic">(edited)</span>}
                            </div>
                          </div>
                        </div>
                        {user?.id === comment.user_id && editingCommentId !== comment.id && (
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleStartEditComment(comment.id, comment.comment)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit comment</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete comment</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>

                      {/* Edit mode */}
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <MentionInput value={editingCommentText} onChange={setEditingCommentText} className="min-h-[80px]" teamMembers={teamMembers} autoFocus />
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={handleCancelEditComment}>
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveEditComment} disabled={!editingCommentText.trim() || updateCommentMutation.isPending}>
                              <Check className="h-4 w-4 mr-1" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm break-words whitespace-pre-wrap" style={{ display: "block" }}>
                          {highlightMentions(comment.comment, comment.mentioned_user_emails, teamMembers)}
                        </div>
                      )}

                      {comment.synced_to_control_tower && (
                        <Badge variant="outline" className="text-xs">
                          Synced to Control Tower
                        </Badge>
                      )}
                      {/* Hidden separator for copy formatting */}
                      <span style={{ display: "block", height: 0, overflow: "hidden" }}>{"\n"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <MentionInput
                  placeholder="Add a comment... Type @ to mention someone"
                  value={newComment}
                  onChange={setNewComment}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !newComment.includes("@")) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  className="min-h-[60px]"
                  teamMembers={teamMembers}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim() || addCommentMutation.isPending}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Proposals Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Proposals
                </CardTitle>
                <Button size="sm" onClick={() => setCreateProposalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ProposalList dealId={deal?.id} clientId={deal?.client_id || undefined} variant="cards" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6 mt-6">
          {loadingDeal ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    <CardTitle>Deal Checklist</CardTitle>
                    {checklistItems && checklistItems.length > 0 && <Badge variant="secondary">{checklistItems.length}</Badge>}
                  </div>

                  {/* Sync Button - Only show if deal is synced from Control Tower */}
                  {/* Sync Button */}
                  <div className="flex items-center gap-2">
                    {deal?.last_synced_at && <span className="text-xs text-muted-foreground">Synced {formatDistanceToNow(new Date(deal.last_synced_at), { addSuffix: true })}</span>}
                    <div className="flex gap-2">
                      <Button onClick={handleResyncChecklist} disabled={resyncingChecklist || !deal?.synced_from_control_tower} variant="outline" size="sm">
                        {resyncingChecklist ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Re-syncing...
                          </>
                        ) : (
                          <>
                            <CheckSquare className="mr-2 h-4 w-4" />
                            Re-sync Checklist
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {checklistItems && checklistItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} />
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {checklistLoading ? (
                    <div className="space-y-2">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </div>
                  ) : checklistItems && checklistItems.length > 0 ? (
                    checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg group">
                        <Checkbox checked={item.is_completed} onCheckedChange={() => handleToggleChecklistItem(item.id, item.is_completed)} />
                        <div className="flex-1 flex items-center gap-2">
                          <label className={`text-sm cursor-pointer ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={item.control_tower_synced_at ? "secondary" : "outline"} className="text-xs">
                                {item.control_tower_synced_at ? "📡 CT" : "📝 Local"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{item.control_tower_synced_at ? `Synced from Control Tower ${formatDistanceToNow(new Date(item.control_tower_synced_at), { addSuffix: true })}` : "Created locally in BD Portal"}</TooltipContent>
                          </Tooltip>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteChecklistItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No checklist items</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add new item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                  />
                  <Button onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim() || addChecklistMutation.isPending}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Google Drive Documents</CardTitle>
                </div>
                {deal?.google_drive_folder_url && (
                  <Button onClick={() => handleSyncDriveFolder()} disabled={syncingFolder} variant="outline" size="sm">
                    {syncingFolder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Folder
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!deal?.google_drive_folder_url ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">No Google Drive folder mapped to this deal</p>
                  <Button onClick={() => setShowMapFolderDialog(true)} variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Map Google Drive Folder
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <a href={deal.google_drive_folder_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex-1 truncate">
                      {deal.google_drive_folder_url}
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => window.open(deal.google_drive_folder_url!, "_blank")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {filesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : files.length > 0 ? (
                    <div className="space-y-2">
                      {files.map((file) => {
                        const isAIReady = file.metadata?.parser === "pdfjs" || file.json_snapshot_path;
                        return (
                          <div key={file.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate">{file.drive_file_name}</span>
                            {file.category ? (
                              <Badge variant="outline" className="text-xs">
                                {file.category}
                              </Badge>
                            ) : null}
                            {isAIReady && (
                              <Badge variant="secondary" className="text-xs">
                                <FileCheck className="h-3 w-3 mr-1" />
                                AI-Ready
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{file.drive_file_type}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No files synced yet. Click "Sync Folder" to fetch documents.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Tab */}
        <TabsContent value="systems" className="space-y-6 mt-6">
          <QuickActionsPanel dealId={deal.id} deal={deal} controlTowerId={deal.control_tower_id} externalLinks={deal.external_links} />

          {/* Control Tower Sync Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Control Tower Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Last Sync Status</p>
                    <p className="text-xs text-muted-foreground">{deal?.last_synced_at ? `Synced ${formatDistanceToNow(new Date(deal.last_synced_at), { addSuffix: true })}` : "Never synced"}</p>
                  </div>
                  {deal?.synced_from_control_tower && <Badge variant="secondary">{deal.control_tower_status || "Active"}</Badge>}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Sync Actions</p>
                  <Button onClick={handleSyncDealFromControlTower} disabled={isSyncingDeal || isSyncingSingle} variant="outline" className="w-full justify-start">
                    {isSyncingDeal || isSyncingSingle ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Pulling latest data...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Pull Latest from Control Tower
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">Sync deal details, checklist items, and comments from Control Tower</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ExternalLinksSection externalLinks={deal.external_links} hubspotUrl={deal.hubspot_crm_deal_url} leadsLiftUrl={deal.leadslift_crm_deal_url} estimateUrl={deal.estimate_url} pandadocUrl={deal.pandadoc_proposal_url} workboardUrl={deal.workboard_ai_link} clientAgentUrl={deal.client_agent_url} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {deal.control_tower_id && (
                  <div>
                    <p className="text-muted-foreground mb-1">Control Tower ID</p>
                    <p className="font-mono text-xs break-all">{deal.control_tower_id}</p>
                  </div>
                )}
                {deal.hubspot_deal_id && (
                  <div>
                    <p className="text-muted-foreground mb-1">HubSpot Deal ID</p>
                    <p className="font-mono text-xs break-all">{deal.hubspot_deal_id}</p>
                  </div>
                )}
                {deal.last_synced_at && (
                  <div>
                    <p className="text-muted-foreground mb-1">Last Synced</p>
                    <p className="font-medium">{new Date(deal.last_synced_at).toLocaleString()}</p>
                  </div>
                )}
                {deal.synced_from_control_tower && (
                  <div>
                    <p className="text-muted-foreground mb-1">Sync Status</p>
                    <Badge variant="secondary">Synced from Control Tower</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showMapFolderDialog} onOpenChange={setShowMapFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map Google Drive Folder</DialogTitle>
            <DialogDescription>Enter the URL of the Google Drive folder containing documents for this deal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-url">Folder URL</Label>
              <Input id="folder-url" placeholder="https://drive.google.com/drive/folders/..." value={folderUrl} onChange={(e) => setFolderUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">Copy the URL from your browser when viewing the folder in Google Drive</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMapGoogleDriveFolder} disabled={!folderUrl.trim()}>
              Map Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProposalDialog open={createProposalOpen} onOpenChange={setCreateProposalOpen} dealId={deal?.id} clientId={deal?.client_id || undefined} />
    </div>
  );
}
