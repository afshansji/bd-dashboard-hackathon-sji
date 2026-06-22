import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDeals } from '@/hooks/useDeals';
import { useClients } from '@/hooks/useClients';
import { useLeadList } from '@/hooks/useLeads';
import { useProposalMetrics } from '@/hooks/useProposalMetrics';
import { TrendingUp, Users, Target, Award, FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BDDashboard() {
  const { deals, loading: dealsLoading } = useDeals({ enabled: true });
  const { clients, loading: clientsLoading, totalCount } = useClients({ 
    page: 1, 
    limit: 1000 
  });
  const { data: leadsData, isLoading: leadsLoading } = useLeadList({ 
    page: 1, 
    pageSize: 1000 
  });
  const { data: proposalMetrics, isLoading: proposalsLoading } = useProposalMetrics();
  
  const leads = leadsData?.leads || [];
  const isLoading = dealsLoading || clientsLoading || leadsLoading || proposalsLoading;
  
  const newLeads = leads.filter((l) => 
    new Date(l.created_at || '').getMonth() === new Date().getMonth()
  ).length;
  
  const warmLeads = 0; // Will be populated when hubspot hook is available
  const dealsClosed = deals.filter((d) => d.status === 'won').length;
  const totalLeads = leads.length;
  const activeDeals = deals.filter((d) => d.status === 'active').length;
  const totalClients = totalCount || clients.length;
  
  // Calculate top performing deal type
  const dealsByType = deals.reduce((acc: Record<string, number>, deal) => {
    const dealData = deal as any;
    const type = dealData.dealtype || dealData.category || 'General';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const topProduct = Object.entries(dealsByType)
    .sort(([, a], [, b]) => b - a)
    .map(([type]) => type)[0] || '-';
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Business Development Dashboard</h1>
        <p className="text-muted-foreground">
          Track your BD performance and pipeline health
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              New Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeads}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Warm Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warmLeads}</div>
            <p className="text-xs text-muted-foreground">Ready for outreach</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              Deals Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dealsClosed}</div>
            <p className="text-xs text-muted-foreground">This quarter</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-warning" />
              Top Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topProduct}</div>
            <p className="text-xs text-muted-foreground">Best performer</p>
          </CardContent>
        </Card>
      </div>

      {/* Snapshot Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Leads Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalLeads}</p>
                <p className="text-xs text-muted-foreground">Active leads</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/prospecting">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{activeDeals}</p>
                <p className="text-xs text-muted-foreground">In progress</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/prospecting">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalClients}</p>
                <p className="text-xs text-muted-foreground">Converted</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/clients">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposal Performance Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Proposal Performance
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/proposals">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sent This Month</p>
              <p className="text-2xl font-bold">{proposalMetrics?.sentThisMonth || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Signed This Month</p>
              <p className="text-2xl font-bold text-success">{proposalMetrics?.signedThisMonth || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{proposalMetrics?.conversionRate || 0}%</p>
            </div>
            <div className="space-y-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Time to Sign</p>
                <p className="text-2xl font-bold">
                  {proposalMetrics?.avgTimeToSign ? `${proposalMetrics.avgTimeToSign}h` : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
