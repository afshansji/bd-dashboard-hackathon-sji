import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCampaignROI, useUpdateCampaignROI } from '@/hooks/useCampaignROI';
import { useCampaignBySlug } from '@/hooks/useCampaignBySlug';
import { DollarSign, TrendingUp, TrendingDown, Target, Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampaignROI() {
  const { slug } = useParams<{ slug: string }>();
  const { data: campaignData } = useCampaignBySlug(slug || '');
  const campaign = campaignData?.campaign;
  const { data: roiData, isLoading } = useCampaignROI(campaign?.id || '');
  const updateROI = useUpdateCampaignROI();

  const [avgDealValue, setAvgDealValue] = useState<string>('');
  const [costPerContact, setCostPerContact] = useState<string>('');

  const handleUpdateAssumptions = () => {
    if (!campaign?.id) return;

    updateROI.mutate({
      campaignId: campaign.id,
      avgDealValue: avgDealValue ? Number(avgDealValue) : undefined,
      costPerContact: costPerContact ? Number(costPerContact) : undefined,
    });

    setAvgDealValue('');
    setCostPerContact('');
  };

  if (!campaign) {
    return (
      <div className="container mx-auto py-8">
        <p>Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{campaign.name} - ROI Calculator</h1>
        <p className="text-muted-foreground mt-1">Track costs, revenue, and calculate return on investment</p>
      </div>

      {/* ROI Overview Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${roiData?.breakdown.totalCost.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${roiData?.breakdown.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              {roiData && roiData.breakdown.netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${roiData && roiData.breakdown.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${roiData?.breakdown.netProfit.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ROI</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${roiData && roiData.breakdown.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roiData?.breakdown.roi.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cost Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Update Cost Assumptions
          </CardTitle>
          <CardDescription>
            Modify the average deal value and cost per contact to recalculate ROI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="avgDealValue">Average Deal Value ($)</Label>
              <Input
                id="avgDealValue"
                type="number"
                placeholder={`Current: $${roiData?.financials.average_deal_value.toLocaleString()}`}
                value={avgDealValue}
                onChange={(e) => setAvgDealValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPerContact">Cost Per Contact ($)</Label>
              <Input
                id="costPerContact"
                type="number"
                placeholder={`Current: $${roiData?.financials.cost_per_contact.toLocaleString()}`}
                value={costPerContact}
                onChange={(e) => setCostPerContact(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleUpdateAssumptions}
            className="mt-6"
            disabled={updateROI.isPending || (!avgDealValue && !costPerContact)}
          >
            {updateROI.isPending ? 'Updating...' : 'Update Assumptions'}
          </Button>
        </CardContent>
      </Card>

      {/* Detailed Financials */}
      {roiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Spend:</span>
                <span className="font-medium">${roiData.financials.actual_spend.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deals Revenue:</span>
                <span className="font-medium">${roiData.financials.deals_revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost Per Deal:</span>
                <span className="font-medium">${roiData.financials.cost_per_deal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost Per Meeting:</span>
                <span className="font-medium">${roiData.financials.cost_per_meeting.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected Deals:</span>
                <span className="font-medium">{roiData.projections.projectedDeals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected Revenue:</span>
                <span className="font-medium">${roiData.projections.projectedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected ROI:</span>
                <span className={`font-medium ${roiData.projections.projectedROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roiData.projections.projectedROI.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
