import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCampaignBySlug } from '@/hooks/useCampaignBySlug';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosPrivate from '@/lib/axiosPrivate';
import { CampaignStatusSelect } from '@/components/bd/CampaignStatusSelect';
import type { CampaignStatus } from '@/Api/adminCampaigns';

export default function CampaignDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useCampaignBySlug(slug || '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (newStatus: CampaignStatus) => {
      if (!slug) throw new Error('Campaign slug is required');
      const { data } = await axiosPrivate.put(`/admin-campaigns/${slug}`, {
        campaign: { status: newStatus },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-by-slug', slug] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
  });

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    await updateMutation.mutateAsync(newStatus);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading campaign details...</div>
      </div>
    );
  }

  if (error || !data?.campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-destructive">Failed to load campaign details</div>
        <Button asChild className="mt-4">
          <Link to="/campaigns">Back to Outreach</Link>
        </Button>
      </div>
    );
  }

  const campaign = data.campaign;
  const campaignTypes = campaign.campaign_types || [campaign.campaign_type];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/campaigns/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* Campaign Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{campaign.name}</CardTitle>
          <div className="flex gap-2 flex-wrap mt-2">
            <CampaignStatusSelect
              currentStatus={campaign.status as CampaignStatus}
              onStatusChange={handleStatusChange}
              disabled={updateMutation.isPending}
              showBadge={true}
            />
            {campaignTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {type.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          {(campaign.start_date || campaign.end_date) && (
            <div>
              <h3 className="font-semibold mb-2">Duration</h3>
              <div className="text-sm text-muted-foreground">
                {campaign.start_date && (
                  <div>Start: {format(new Date(campaign.start_date), 'PPP')}</div>
                )}
                {campaign.end_date && (
                  <div>End: {format(new Date(campaign.end_date), 'PPP')}</div>
                )}
              </div>
            </div>
          )}

          {/* Target Metrics */}
          <div>
            <h3 className="font-semibold mb-2">Target Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Target Contacts</div>
                <div className="text-2xl font-bold">
                  {campaign.target_contacts_count || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Reached</div>
                <div className="text-2xl font-bold">
                  {campaign.actual_contacts_reached || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Responses</div>
                <div className="text-2xl font-bold">
                  {campaign.responses_received || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Meetings</div>
                <div className="text-2xl font-bold">
                  {campaign.meetings_booked || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Objective */}
          {campaign.campaign_objective && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Campaign Objective
              </h3>
              <div
                className="prose prose-sm max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: campaign.campaign_objective }}
              />
            </div>
          )}

          {/* Target Regions */}
          {campaign.target_regions && campaign.target_regions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Target Regions</h3>
              <div className="flex gap-2 flex-wrap">
                {campaign.target_regions.map((region) => (
                  <Badge key={region} variant="outline">
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Target Contacts */}
          {campaign.target_contacts && campaign.target_contacts.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Target Contact Types</h3>
              <div className="flex gap-2 flex-wrap">
                {campaign.target_contacts.map((contact) => (
                  <Badge key={contact} variant="outline">
                    {contact}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
