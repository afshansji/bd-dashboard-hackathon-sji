import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Archive,
  ArrowLeft,
  ArrowUpDown,
  Brain,
  CheckCircle2,
  FileSpreadsheet,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  Rocket,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCampaignDetail } from '@/hooks/useCampaignDetail';
import type { CampaignContactStatus } from '@/hooks/useCampaignDetail';
import { useExaIntegration } from '@/hooks/useExaIntegration';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { CampaignLeadImportDialog } from '@/components/bd/CampaignLeadImportDialog';
import { CampaignGoogleSheetImportDialog } from '@/components/bd/CampaignGoogleSheetImportDialog';
import { AddCampaignContactDialog } from '@/components/bd/AddCampaignContactDialog';
import { CampaignContactsTable } from '@/components/bd/CampaignContactsTable';
import { ContactListControls } from '@/components/bd/ContactListControls';
import { EmptyContactList } from '@/components/bd/EmptyContactList';
import { useCampaignContactResearch } from '@/hooks/useCampaignContactResearch';
import type { QuickActionType } from '@/components/bd/QuickActionsCell';
import { CampaignStatusSelect } from '@/components/bd/CampaignStatusSelect';
import type { CampaignStatus } from '@/Api/adminCampaigns';
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PIPELINE_STAGES: { status: CampaignContactStatus; title: string; description: string }[] = [
  { status: 'identified', title: 'Identified', description: 'Contacts imported into the campaign' },
  { status: 'researched', title: 'Researched', description: 'Research summaries created' },
  { status: 'client_not_ideal', title: 'Client Not Ideal', description: 'Contact determined not to be a good fit' },
  { status: 'contacted_linkedin', title: 'Request Sent', description: 'Social media request sent' },
  { status: 'contacted_social', title: 'Social Media Request', description: 'Facebook/Instagram request sent' },
  { status: 'connected', title: 'Connected', description: 'Connection accepted' },
  { status: 'client_not_responsive', title: 'Client Not Responsive', description: 'Contact not responding to outreach' },
  { status: 'messaged', title: 'Message Sent', description: 'Direct message delivered' },
  { status: 'contacted_email', title: 'Email Sent', description: 'Email outreach via GHL' },
  { status: 'responded', title: 'Responded', description: 'Prospect replied to outreach' },
  { status: 'meeting_booked', title: 'Meeting Booked', description: 'Meeting scheduled with prospect' },
  { status: 'close_lost', title: 'Close Lost', description: 'Deal did not close' },
  { status: 'won', title: 'Won', description: 'Deal won successfully' },
];

const STAGE_BADGE_CLASSES: Record<CampaignContactStatus, string> = {
  identified: 'bg-slate-100 text-slate-900',
  researched: 'bg-blue-100 text-blue-900',
  client_not_ideal: 'bg-amber-100 text-amber-900',
  contacted_linkedin: 'bg-indigo-100 text-indigo-900',
  contacted_social: 'bg-violet-100 text-violet-900',
  connected: 'bg-emerald-100 text-emerald-900',
  client_not_responsive: 'bg-rose-100 text-rose-900',
  messaged: 'bg-purple-100 text-purple-900',
  contacted_email: 'bg-orange-100 text-orange-900',
  responded: 'bg-teal-100 text-teal-900',
  meeting_booked: 'bg-green-200 text-green-900',
  close_lost: 'bg-red-100 text-red-900',
  won: 'bg-emerald-200 text-emerald-950',
};


export default function CampaignDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    campaign,
    contactByStatus,
    contacts,
    markCompleted,
    softArchive,
    updateCampaign,
    refetch,
    isUpdating,
    isLoading,
    isError,
    error,
  } = useCampaignDetail(slug);
  const { runCampaignResearch, isRunningResearch } = useExaIntegration();
  const { hasPermission } = useUserPermissions();
  const emailsSentCount = campaign?.emails_sent ?? 0;
  const { mutateAsync: runContactResearch } = useCampaignContactResearch();
  const [leadImportDialogOpen, setLeadImportDialogOpen] = useState(false);
  const [googleSheetImportDialogOpen, setGoogleSheetImportDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  
  // Smart List state
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>(() => {
    const saved = localStorage.getItem('campaign-view-mode');
    return (saved as 'list' | 'pipeline') || 'list';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignContactStatus[]>([]);

  // Pipeline sorting state
  const [pipelineSortOrder, setPipelineSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state for list view
  const { currentPage, pageSize, setCurrentPage, setPageSize, reset: resetPagination } = usePagination(10);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('campaign-view-mode', viewMode);
  }, [viewMode]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [searchQuery, statusFilter, resetPagination]);

  const linkedinStats = (campaign?.linkedin_stats as Record<string, number | undefined>) || {};
  const ghlStats = (campaign?.ghl_stats as Record<string, number | undefined>) || {};

  // Calculate metrics dynamically from actual contacts instead of static campaign fields
  const totalContactsCount = Object.values(contactByStatus).reduce((sum, contacts) => sum + contacts.length, 0);
  const researchedCount = contactByStatus.researched?.length || 0;
  const connectedCount = contactByStatus.connected?.length || 0;
  const meetingsBooked = contactByStatus.meeting_booked?.length || 0;
  const respondedCount = contactByStatus.responded?.length || 0;
  
  const linkedinRequestsSent = campaign?.linkedin_requests_sent ?? 0;
  const linkedinRequestsTotal = linkedinRequestsSent || linkedinStats.requests_sent || 0;
  const acceptanceRate = linkedinRequestsTotal
    ? Math.round(((linkedinStats.connections_accepted || 0) / linkedinRequestsTotal) * 100)
    : 0;
  
  // Response total: use dynamic count from contacts + any external stats
  const responseTotal = respondedCount + (linkedinStats.responses_received || 0) + (ghlStats.replies || 0);

  const campaignMetadata = (campaign?.metadata as Record<string, unknown>) ?? {};
  const researchReportUrl = typeof campaignMetadata["research_report_url"] === "string"
    ? (campaignMetadata["research_report_url"] as string)
    : typeof (campaignMetadata["latest_research_report"] as { url?: string } | undefined)?.url === "string"
      ? ((campaignMetadata["latest_research_report"] as { url?: string }).url as string)
      : undefined;

  const canRunResearch = hasPermission(["campaigns", "campaign_research", "research", "exa"], "edit")
    || hasPermission(/research/i, "edit");

  // Calculate conversion rate from actual contacts
  const conversionRate = totalContactsCount > 0 
    ? Math.round((meetingsBooked / totalContactsCount) * 100) 
    : 0;

  const handleMarkCompleted = async () => {
    try {
      await markCompleted();
      toast({
        title: 'Campaign marked completed',
        description: 'AI summary generation queued successfully.',
      });
    } catch (updateError) {
      toast({
        title: 'Unable to mark as completed',
        description: updateError instanceof Error ? updateError.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async () => {
    try {
      await softArchive();
      toast({
        title: 'Campaign archived',
        description: 'The campaign has been archived and dependent views refreshed.',
      });
    } catch (updateError) {
      toast({
        title: 'Unable to archive campaign',
        description: updateError instanceof Error ? updateError.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  };

  const handleRunResearch = async () => {
    if (!campaign?.id) return;
    try {
      await runCampaignResearch({ campaignId: campaign.id });
    } catch (error) {
      console.error('Unable to trigger campaign research', error);
    }
  };

  // Filter and sort contacts for list view
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    let result = [...contacts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.contact_name.toLowerCase().includes(query) ||
          c.contact_company?.toLowerCase().includes(query) ||
          c.contact_title?.toLowerCase().includes(query) ||
          c.contact_email?.toLowerCase().includes(query) ||
          c.linkedin_headline?.toLowerCase().includes(query) ||
          c.current_employer?.toLowerCase().includes(query) ||
          c.current_position_title?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter.length > 0) {
      result = result.filter((c) => statusFilter.includes(c.status));
    }

    return result;
  }, [contacts, searchQuery, statusFilter]);

  // Paginate contacts for list view
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredContacts.length);

  // Calculate status counts for filter dropdown
  const statusCounts = useMemo(() => {
    if (!contacts) return {} as Record<CampaignContactStatus, number>;
    return contacts.reduce((acc, contact) => {
      acc[contact.status] = (acc[contact.status] || 0) + 1;
      return acc;
    }, {} as Record<CampaignContactStatus, number>);
  }, [contacts]);

  // Quick action handler
  const handleQuickAction = async (action: QuickActionType, contactSlug: string) => {
    const contact = contacts?.find((c) => c.slug === contactSlug);
    if (!contact) return;

    switch (action) {
      case 'view':
        window.open(`/campaigns/${campaign?.slug}/contacts/${contact.slug}`, '_blank', 'noopener,noreferrer');
        break;

      case 'research':
        try {
          toast({
            title: 'Running AI research...',
            description: `Analyzing ${contact.contact_name}`,
          });
          await runContactResearch({ contactId: contact.id, contactSlug: contact.slug });
        } catch (error) {
          console.error('Research failed', error);
        }
        break;

      case 'connect':
        if (contact.contact_linkedin_url) {
          window.open(contact.contact_linkedin_url, '_blank');
        } else {
          toast({
            title: 'No LinkedIn URL',
            description: 'This contact does not have a LinkedIn profile',
            variant: 'destructive',
          });
        }
        break;

      case 'message':
        if (contact.contact_linkedin_url) {
          window.open(`${contact.contact_linkedin_url}/detail/recent-activity/`, '_blank');
        } else {
          window.open(`/campaigns/${campaign?.slug}/contacts/${contact.slug}`, '_blank', 'noopener,noreferrer');
        }
        break;

      case 'email':
        if (contact.contact_email) {
          window.location.href = `mailto:${contact.contact_email}`;
        } else {
          toast({
            title: 'No email address',
            description: 'This contact does not have an email address',
            variant: 'destructive',
          });
        }
        break;

      case 'meeting':
        toast({
          title: 'Meeting scheduler coming soon!',
          description: 'This feature is under development',
        });
        break;

      case 'followup':
        window.open(`/campaigns/${campaign?.slug}/contacts/${contact.slug}`, '_blank', 'noopener,noreferrer');
        break;

      default:
        window.open(`/campaigns/${campaign?.slug}/contacts/${contact.slug}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter([]);
  };

  const handleTogglePipelineSort = () => {
    setPipelineSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    await updateCampaign({ campaign: { status: newStatus } });
  };

  // Filter contacts by search query for pipeline view
  const filteredContactsByStatus = useMemo(() => {
    if (!searchQuery && statusFilter.length === 0) return contactByStatus;

    const filtered: Record<CampaignContactStatus, typeof contacts> = {} as Record<CampaignContactStatus, typeof contacts>;
    const query = searchQuery.toLowerCase();

    PIPELINE_STAGES.forEach((stage) => {
      const stageContacts = contactByStatus[stage.status] || [];
      let result = stageContacts;

      // Apply search filter
      if (searchQuery) {
        result = result.filter(
          (c) =>
            c.contact_name.toLowerCase().includes(query) ||
            c.contact_company?.toLowerCase().includes(query) ||
            c.contact_title?.toLowerCase().includes(query) ||
            c.contact_email?.toLowerCase().includes(query) ||
            c.linkedin_headline?.toLowerCase().includes(query) ||
            c.current_employer?.toLowerCase().includes(query) ||
            c.current_position_title?.toLowerCase().includes(query)
        );
      }

      // Apply status filter (keep only if stage is in filter or no filter active)
      if (statusFilter.length > 0 && !statusFilter.includes(stage.status)) {
        result = [];
      }

      filtered[stage.status] = result;
    });

    return filtered;
  }, [contactByStatus, searchQuery, statusFilter]);

  // Sort contacts by name for pipeline view
  const sortedContactByStatus = useMemo(() => {
    const sorted: Record<CampaignContactStatus, typeof contacts> = {} as Record<CampaignContactStatus, typeof contacts>;

    PIPELINE_STAGES.forEach((stage) => {
      const stageContacts = filteredContactsByStatus[stage.status] || [];
      sorted[stage.status] = [...stageContacts].sort((a, b) => {
        const nameA = (a.contact_name || '').toLowerCase();
        const nameB = (b.contact_name || '').toLowerCase();
        const comparison = nameA.localeCompare(nameB);
        return pipelineSortOrder === 'asc' ? comparison : -comparison;
      });
    });

    return sorted;
  }, [filteredContactsByStatus, pipelineSortOrder]);

  if (isLoading) {
    return <div className="container mx-auto py-10">Loading campaign...</div>;
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load campaign</CardTitle>
          </CardHeader>
          <CardContent>{(error as Error)?.message || 'Unknown error'}</CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/campaigns">
              <ArrowLeft className="h-4 w-4" /> Back to campaigns
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/campaigns/${slug}/details`}>
                Campaign Details
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/campaigns/${slug}/tasks`}>
                Tasks
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canRunResearch && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleRunResearch}
              disabled={isRunningResearch}
            >
              {isRunningResearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Run R&D
            </Button>
          )}
          <Button
            variant="default"
            className="gap-2"
            onClick={() => setAddContactDialogOpen(true)}
          >
            <Users className="h-4 w-4" />
            Add Contact
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setLeadImportDialogOpen(true)}
          >
            <Users className="h-4 w-4" />
            Add Leads
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setGoogleSheetImportDialogOpen(true)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Leads
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleArchive}
            disabled={campaign.status === 'archived' || isUpdating}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Archive
          </Button>
          <Button
            className="gap-2"
            onClick={handleMarkCompleted}
            disabled={campaign.status === 'completed' || isUpdating}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Mark Completed
          </Button>
        </div>
      </div>

      {/* Research Alert - Conditional */}
      {researchReportUrl && (
        <Alert>
          <Rocket className="h-4 w-4" />
          <AlertTitle>Research Report Available</AlertTitle>
          <AlertDescription>
            <Button asChild variant="link" className="px-0 text-sm h-auto">
              <a href={researchReportUrl} target="_blank" rel="noreferrer">
                View research report →
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Section - Campaign Header & Key Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{campaign.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {campaign.campaign_types && campaign.campaign_types.length > 0 ? (
                  campaign.campaign_types.map((type) => (
                    <Badge key={type} variant="outline" className="capitalize">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="capitalize">
                    {campaign.campaign_type?.replace('_', ' ')}
                  </Badge>
                )}
                <CampaignStatusSelect
                  currentStatus={campaign.status as CampaignStatus}
                  onStatusChange={handleStatusChange}
                  disabled={isUpdating}
                  showBadge={true}
                />
                {campaign.ai_agent_id && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Brain className="h-3 w-3" /> AI Enabled
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            <MetricCard
              label="Total Contacts"
              value={totalContactsCount}
              icon={Users}
              iconColor="text-blue-600"
            />
            <MetricCard
              label="Researched"
              value={researchedCount}
              icon={Brain}
              iconColor="text-purple-600"
            />
            <MetricCard
              label="Connected"
              value={connectedCount}
              icon={Linkedin}
              iconColor="text-blue-700"
            />
            <MetricCard
              label="Emails Sent"
              value={emailsSentCount}
              icon={Mail}
              iconColor="text-orange-500"
            />
            <MetricCard
              label="Responses"
              value={responseTotal}
              icon={MessageCircle}
              iconColor="text-green-600"
            />
            <MetricCard
              label="Meetings"
              value={meetingsBooked}
              icon={CheckCircle2}
              iconColor="text-emerald-600"
            />
            <MetricCard
              label="Conversion"
              value={`${conversionRate}%`}
              icon={TrendingUp}
              iconColor="text-orange-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Focus Area - Contact Pipeline / Smart List */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <CardTitle>Campaign Contacts</CardTitle>
            <ContactListControls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              statusCounts={statusCounts}
            />
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'list' ? (
            // Smart List View
            <div className="space-y-4">
              {filteredContacts.length > 0 ? (
                <>
                  {/* Results count */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      Showing {startIndex} to {endIndex} of {filteredContacts.length} contacts
                      {filteredContacts.length < (contacts?.length || 0) && (
                        <span className="ml-1">
                          (filtered from {contacts?.length || 0} total)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Show</span>
                      <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                        <SelectTrigger className="w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>per page</span>
                    </div>
                  </div>

                  {/* Table */}
                  <CampaignContactsTable
                    contacts={paginatedContacts}
                    campaignId={campaign.id}
                    campaignSlug={campaign.slug}
                    onQuickAction={handleQuickAction}
                    onNavigate={(contactSlug) => navigate(`/campaigns/${campaign.slug}/contacts/${contactSlug}`)}
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>

                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNum)}
                                  isActive={currentPage === pageNum}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              ) : (
                <EmptyContactList
                  hasContacts={(contacts?.length || 0) > 0}
                  hasFilters={searchQuery !== '' || statusFilter.length > 0}
                  onClearFilters={handleClearFilters}
                  onAddLeads={() => setLeadImportDialogOpen(true)}
                />
              )}
            </div>
          ) : (
            // Pipeline View - Horizontal scrollable Kanban board
            <div className="relative">
              {/* Hint for horizontal scroll */}
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Scroll horizontally to view all stages</span>
                  <span className="text-primary animate-pulse">→</span>
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {totalContactsCount} total contacts across 13 stages
                </p>
              </div>
              
              {/* Use regular overflow-x-auto for visible scrollbar with fade indicator */}
              <div className="relative">
                <div className="overflow-x-auto overflow-y-hidden pb-3 scrollbar-visible">
                <div className="flex gap-3 min-w-max">{/* min-w-max ensures content extends beyond container */}
                  {(() => {
                    // Reorder stages: filtered stages first, then the rest
                    if (statusFilter.length > 0) {
                      const filteredStages = PIPELINE_STAGES.filter(stage => statusFilter.includes(stage.status));
                      const otherStages = PIPELINE_STAGES.filter(stage => !statusFilter.includes(stage.status));
                      return [...filteredStages, ...otherStages];
                    }
                    return PIPELINE_STAGES;
                  })().map((stage) => {
                    const stageContacts = sortedContactByStatus[stage.status] || [];
                    const isFiltered = statusFilter.length > 0 && statusFilter.includes(stage.status);
                    return (
                      <div key={stage.status} className="flex-shrink-0 w-[300px]">
                        <div className={cn(
                          "h-full rounded-lg border p-3 space-y-3",
                          isFiltered 
                            ? "bg-primary/5 border-primary/30 ring-2 ring-primary/20" 
                            : "bg-muted/20"
                        )}>
                          {/* Stage Header */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">{stage.title}</h3>
                                <Badge variant="secondary" className={cn("text-xs font-semibold", stageBadgeClass(stage.status))}>
                                  {stageContacts.length}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-accent"
                                onClick={handleTogglePipelineSort}
                                title={`Sort ${pipelineSortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
                              >
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground leading-tight">{stage.description}</p>
                            <Separator />
                          </div>
                          
                          {/* Scrollable cards container */}
                          <ScrollArea className="h-[480px]">
                            <div className="space-y-2.5 pr-2">
                              {stageContacts.length === 0 ? (
                                <Card className="border-dashed bg-background/50">
                                  <CardContent className="flex flex-col items-center justify-center py-6 px-3 text-center">
                                  {stage.status === 'identified' ? (
                                    <>
                                      <Users className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-xs font-medium mb-1">No contacts yet</p>
                                      <p className="text-[10px] text-muted-foreground mb-2">Import leads to get started</p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setLeadImportDialogOpen(true)}
                                        className="gap-1.5 h-7 text-xs"
                                      >
                                        <Users className="h-3 w-3" />
                                        Add Leads
                                      </Button>
                                    </>
                                  ) : stage.status === 'researched' && contactByStatus.identified?.length > 0 ? (
                                    <>
                                      <Brain className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-xs font-medium mb-1">No research yet</p>
                                      <p className="text-[10px] text-muted-foreground mb-2">Run research on identified contacts</p>
                                      {canRunResearch && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleRunResearch}
                                          disabled={isRunningResearch}
                                          className="gap-1.5 h-7 text-xs"
                                        >
                                          {isRunningResearch ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Rocket className="h-3 w-3" />
                                          )}
                                          Run R&D
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                                        <div className="text-base text-muted-foreground">→</div>
                                      </div>
                                      <p className="text-xs text-muted-foreground">Move contacts here</p>
                                    </>
                                  )}
                                    </CardContent>
                                </Card>
                              ) : (
                                stageContacts.map((contact) => (
                                  <button
                                    key={contact.id}
                                    onClick={() => window.open(`/campaigns/${campaign.slug}/contacts/${contact.slug}`, '_blank', 'noopener,noreferrer')}
                                    className="w-full rounded-md border bg-card p-2.5 text-left hover:bg-accent hover:shadow-md hover:border-primary/20 transition-all duration-200"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarFallback className="text-xs font-medium">
                                          {contact.contact_name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-xs leading-tight truncate mb-0.5">
                                          {contact.contact_name}
                                        </p>
                                        {contact.linkedin_headline && (
                                          <p className="text-[10px] text-muted-foreground truncate italic line-clamp-1 mb-0.5">
                                            {contact.linkedin_headline}
                                          </p>
                                        )}
                                        {contact.contact_company && (
                                          <p className="text-[10px] text-muted-foreground truncate">
                                            {contact.contact_title ? `${contact.contact_title} at ` : ''}{contact.contact_company}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                          {contact.research_summary && (
                                            <Badge variant="secondary" className="text-[9px] h-3.5 px-1 gap-0.5">
                                              <Brain className="h-2 w-2" />
                                            </Badge>
                                          )}
                                          {contact.contact_email && (
                                            <Mail className="h-2.5 w-2.5 text-muted-foreground" />
                                          )}
                                          {contact.contact_linkedin_url && (
                                            <Linkedin className="h-2.5 w-2.5 text-muted-foreground" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
                
                {/* Fade indicator on the right to show more content */}
                <div className="absolute top-0 right-0 bottom-3 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {campaign && (
        <>
          <CampaignLeadImportDialog
            open={leadImportDialogOpen}
            onOpenChange={setLeadImportDialogOpen}
            campaign={campaign}
            onImportComplete={() => {
              refetch();
              toast({
                title: "Leads imported",
                description: "New contacts added to campaign pipeline",
              });
            }}
          />
          <CampaignGoogleSheetImportDialog
            open={googleSheetImportDialogOpen}
            onOpenChange={setGoogleSheetImportDialogOpen}
            campaign={campaign}
            onImportComplete={() => {
              refetch();
              toast({
                title: "Import successful",
                description: "Contacts imported from Google Sheets",
              });
            }}
          />
          <AddCampaignContactDialog
            open={addContactDialogOpen}
            onOpenChange={setAddContactDialogOpen}
            campaignId={campaign.id}
            onContactAdded={() => {
              refetch();
              toast({
                title: "Contact added",
                description: "New contact has been added to the campaign",
              });
            }}
          />
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor?: string;
}) {
  return (
    <div className="flex flex-col space-y-2 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor || 'text-muted-foreground'}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function stageBadgeClass(status: CampaignContactStatus) {
  return `${STAGE_BADGE_CLASSES[status] ?? ''} border-none`;
}
