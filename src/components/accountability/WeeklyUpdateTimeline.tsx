import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GoalStatusBadge } from './GoalStatusBadge';
import { useWeeklyUpdates } from '@/hooks/useAccountabilityUpdates';
import { Calendar, TrendingUp, AlertCircle, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

interface WeeklyUpdateTimelineProps {
  activityId: string;
}

export function WeeklyUpdateTimeline({ activityId }: WeeklyUpdateTimelineProps) {
  const { data: updates, isLoading } = useWeeklyUpdates(activityId);

  if (isLoading) {
    return <div className="text-center py-8">Loading updates...</div>;
  }

  if (!updates || updates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No weekly updates yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {updates.map((update, index) => {
            const weekStart = format(new Date(update.week_start_date), 'MMM dd');
            const weekEnd = format(new Date(update.week_end_date), 'MMM dd, yyyy');

            return (
              <div
                key={update.id}
                className="border-l-4 border-primary pl-4 pb-4 relative"
                style={{
                  borderColor: index === 0 ? '#3b82f6' : '#e5e7eb',
                }}
              >
                {/* Timeline dot */}
                <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary border-2 border-white" />

                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {weekStart} - {weekEnd}
                      </span>
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">Latest</Badge>
                      )}
                    </div>
                    <GoalStatusBadge status={update.status} />
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Progress:</span>
                      <span>{update.progress_value} units</span>
                    </div>
                    <div>
                      <Badge variant="outline">{update.progress_percentage}% Complete</Badge>
                    </div>
                  </div>

                  {/* Blockers */}
                  {update.blockers && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm text-red-900">Blockers</div>
                          <div className="text-sm text-red-700 mt-1">{update.blockers}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Help Needed */}
                  {update.help_needed && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm text-yellow-900">Help Needed</div>
                          <div className="text-sm text-yellow-700 mt-1">{update.help_needed}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {update.notes && (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <div className="text-sm text-gray-700">{update.notes}</div>
                    </div>
                  )}

                  {/* Submitter */}
                  <div className="text-xs text-muted-foreground">
                    Submitted by {update.submitter?.full_name || update.submitter?.email} on{' '}
                    {format(new Date(update.created_at), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

