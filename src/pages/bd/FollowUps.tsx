import { useState } from 'react';
import { Plus, Sparkles, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFollowUps, useFollowUpSuggestions, useGenerateFollowUpSuggestions, type FollowUpStatus, type FollowUpType } from '@/hooks/useFollowUps';
import { FollowUpDialog } from '@/components/followup/FollowUpDialog';
import { FollowUpCard } from '@/components/followup/FollowUpCard';
import { SuggestionCard } from '@/components/followup/SuggestionCard';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function FollowUps() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FollowUpType | 'all'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week');

  const getDateFilters = () => {
    const today = new Date();
    if (dateRange === 'week') {
      return {
        dateFrom: format(startOfWeek(today), 'yyyy-MM-dd'),
        dateTo: format(endOfWeek(today), 'yyyy-MM-dd'),
      };
    } else if (dateRange === 'month') {
      return {
        dateFrom: format(startOfMonth(today), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    }
    return {};
  };

  const { data: followUps, isLoading } = useFollowUps({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    ...getDateFilters(),
  });

  const { data: suggestions } = useFollowUpSuggestions();
  const generateSuggestions = useGenerateFollowUpSuggestions();

  const pendingFollowUps = followUps?.filter(f => f.status === 'pending') || [];
  const completedFollowUps = followUps?.filter(f => f.status === 'completed') || [];
  const overdueFollowUps = followUps?.filter(f => f.status === 'overdue') || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Meetings & Follow-Ups</h1>
          <p className="text-muted-foreground">Track your meetings and follow-up actions with AI-powered suggestions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => generateSuggestions.mutate({})} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Suggestions
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Follow-Up
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingFollowUps.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{overdueFollowUps.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{completedFollowUps.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{suggestions?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({followUps?.length || 0})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingFollowUps.length})</TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Suggestions ({suggestions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading follow-ups...
              </CardContent>
            </Card>
          ) : followUps && followUps.length > 0 ? (
            followUps.map((followUp) => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No follow-ups found. Click "Add Follow-Up" to create one or generate AI suggestions.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingFollowUps.length > 0 ? (
            <>
              {overdueFollowUps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-destructive mb-3">Overdue</h3>
                  <div className="space-y-4">
                    {overdueFollowUps.map((followUp) => (
                      <FollowUpCard key={followUp.id} followUp={followUp} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold mb-3">Upcoming</h3>
                <div className="space-y-4">
                  {pendingFollowUps.filter(f => f.status === 'pending').map((followUp) => (
                    <FollowUpCard key={followUp.id} followUp={followUp} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending follow-ups. You're all caught up!
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions && suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No AI suggestions yet. Generate smart follow-up recommendations for your deals and contacts.
                </p>
                <Button onClick={() => generateSuggestions.mutate({})}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Suggestions
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <FollowUpDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
