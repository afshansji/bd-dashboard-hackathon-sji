import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  TrendingUp,
  Users,
  Pencil,
  History as HistoryIcon,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useBDCampaigns } from '@/hooks/useBDCampaigns';
import type { BDCampaign } from '@/hooks/useBDCampaigns';
import { useTargetNiches } from '@/hooks/useTargetNiches';
import type { TargetNiche } from '@/hooks/useTargetNiches';
import { useCampaignOwners } from '@/hooks/useCampaignOwners';
import { CampaignDialog } from '@/components/bd/CampaignDialog';
import { CampaignAnalyticsDashboard } from '@/components/bd/CampaignAnalyticsDashboard';
import { useTotalEmailsSent } from '@/hooks/useCampaignEmailStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AggregateStats = {
  totalContacts: number;
  totalMeetings: number;
  totalDeals: number;
  totalResponses: number;
};

export default function CampaignManagement() {
  const pagination = usePagination(12);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BDCampaign | null>(null);

  // Only apply search when empty or 3+ characters
  const effectiveSearchQuery = searchQuery.length === 0 || searchQuery.length >= 3
    ? searchQuery
    : undefined;

  const { campaigns, total, isLoading, error } = useBDCampaigns(
    undefined,
    pagination.currentPage,
    pagination.pageSize,
    effectiveSearchQuery,
    statusFilter,
    ownerFilter
  );
  const { niches } = useTargetNiches();
  const { data: campaignOwners = [] } = useCampaignOwners();
  const { data: totalEmailsSent = 0 } = useTotalEmailsSent();
  
  const errorMessage = error instanceof Error && error.message ? error.message : null;
  const totalPages = Math.ceil(total / pagination.pageSize);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    pagination.reset();
  }, [effectiveSearchQuery, statusFilter, ownerFilter]);

  const handleRetry = () => {
    if (pagination.currentPage !== 1) {
      pagination.setCurrentPage(1);
    }
    void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
  };
  const aggregateStats = useMemo(() => {
    return campaigns.reduce<AggregateStats>(
      (acc, campaign) => {
        acc.totalContacts += campaign.actual_contacts_reached ?? 0;
        acc.totalMeetings += campaign.meetings_booked ?? 0;
        acc.totalDeals += campaign.deals_generated ?? 0;
        acc.totalResponses += campaign.responses_received ?? 0;
        return acc;
      },
      {
        totalContacts: 0,
        totalMeetings: 0,
        totalDeals: 0,
        totalResponses: 0,
      },
    );
  }, [campaigns]);

  const metrics = [
    {
      title: 'Total Campaigns',
      value: total,
      icon: Layers,
    },
    {
      title: 'Active Campaigns',
      value: campaigns.filter((c) => c.status === 'active').length,
      icon: TrendingUp,
    },
    {
      title: 'Contacts Reached',
      value: aggregateStats.totalContacts,
      icon: Users,
    },
    {
      title: 'Emails Sent',
      value: totalEmailsSent,
      icon: Mail,
    },
    {
      title: 'Total Responses',
      value: aggregateStats.totalResponses,
      icon: MessageCircle,
    },
    {
      title: 'Meetings Booked',
      value: aggregateStats.totalMeetings,
      icon: Phone,
    },
    {
      title: 'Deals Generated',
      value: aggregateStats.totalDeals,
      icon: TrendingUp,
    },
  ];

  if (isLoading) return <div>Loading campaigns...</div>;

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unable to load campaigns.';

    return (
      <>
        <CampaignDialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingCampaign(null);
          }}
          niches={niches}
          campaign={editingCampaign || undefined}
          mode={editingCampaign ? 'edit' : 'create'}
        />
        <div className="container mx-auto py-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Outreach</h1>
              <p className="text-muted-foreground">Track and manage your outbound campaigns</p>
            </div>
            <Button onClick={() => {
              setEditingCampaign(null);
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertTitle>Unable to load campaigns</AlertTitle>
            <AlertDescription>
              <p className="mb-4">{errorMessage}</p>
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['bd-campaigns'] })}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <CampaignDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCampaign(null);
        }}
        niches={niches}
        campaign={editingCampaign || undefined}
        mode={editingCampaign ? 'edit' : 'create'}
      />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Outreach</h1>
            <p className="text-muted-foreground">Track and manage your outbound campaigns</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/campaigns/import-history">
                <HistoryIcon className="mr-2 h-4 w-4" />
                Import History
              </Link>
            </Button>
            <Button onClick={() => {
              setEditingCampaign(null);
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-8">
            <AlertTitle>Failed to load campaigns</AlertTitle>
            <AlertDescription>
              <p>
                We couldn't load campaign metrics right now.
                {errorMessage ? ` Error: ${errorMessage}` : ' Please try again.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="campaigns" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
                {metrics.map((metric) => (
                  <Card key={metric.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                      <metric.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metric.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns (min 3 characters)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchQuery.length > 0 && searchQuery.length < 3 && (
                    <p className="text-xs text-muted-foreground mt-1 ml-1">
                      Type {3 - searchQuery.length} more character{3 - searchQuery.length !== 1 ? 's' : ''} to search
                    </p>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {campaignOwners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-6">
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' || ownerFilter !== 'all'
                        ? 'No campaigns found matching your search criteria.'
                        : 'No campaigns yet. Create your first campaign to get started.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {campaigns.map((campaign) => (
                      <CampaignCard 
                        key={campaign.id} 
                        campaign={campaign} 
                        niches={niches}
                        onEdit={(c) => {
                          setEditingCampaign(c);
                          setDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => pagination.currentPage > 1 && pagination.setCurrentPage(pagination.currentPage - 1)}
                          className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => pagination.setCurrentPage(pageNum)}
                              isActive={pagination.currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => pagination.currentPage < totalPages && pagination.setCurrentPage(pagination.currentPage + 1)}
                          className={pagination.currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
            </TabsContent>

            <TabsContent value="analytics">
              <CampaignAnalyticsDashboard campaigns={campaigns} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

function CampaignCard({ campaign, niches, onEdit }: { campaign: BDCampaign; niches: TargetNiche[]; onEdit: (campaign: BDCampaign) => void }) {
  const navigate = useNavigate();
  const niche = niches.find((n) => n.id === campaign.niche_id);
  const targetCount = campaign.target_contacts_count ?? 0;
  const contactsReached = campaign.actual_contacts_reached ?? 0;
  const progress = targetCount ? (contactsReached / targetCount) * 100 : 0;

  const statusColors: Record<BDCampaign['status'], 'secondary' | 'default' | 'outline'> = {
    planning: 'secondary',
    active: 'default',
    paused: 'outline',
    completed: 'default',
    archived: 'outline',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{campaign.name}</CardTitle>
            <CardDescription>
              {campaign.brands && campaign.brands.length > 0
                ? campaign.brands.map(b => b.name).filter(Boolean).join(", ")
                : campaign.brand?.name || "No brand"} • {niche?.name || "Unknown Niche"}
            </CardDescription>
          </div>
          <Badge variant={statusColors[campaign.status]} className="uppercase">
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaign.owner && (
          <div className="flex items-center gap-2 text-sm">
            <Avatar className="h-6 w-6">
              <AvatarImage src={campaign.owner.avatar_url || undefined} alt={campaign.owner.full_name || 'Owner'} />
              <AvatarFallback className="text-xs">
                {campaign.owner.full_name?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">Owner:</span>
            <span className="font-medium truncate">{campaign.owner.full_name || campaign.owner.email}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {contactsReached} / {targetCount} contacts
            </span>
          </div>
          <Progress value={progress} />
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Responses</div>
            <div className="font-medium">{campaign.responses_received ?? 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Meetings</div>
            <div className="font-medium">{campaign.meetings_booked ?? 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Deals</div>
            <div className="font-medium">{campaign.deals_generated ?? 0}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(campaign.campaign_types || [campaign.campaign_type]).map((type) => (
            <Badge key={type} variant="outline" className="capitalize">
              {type.replace('_', ' ')}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(campaign);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1" 
            onClick={() => navigate(`/campaigns/${campaign.slug}`)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
