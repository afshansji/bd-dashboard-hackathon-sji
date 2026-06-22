import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeamPerformance } from '@/hooks/useTeamPerformance';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function TeamPerformance() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const { data, isLoading } = useTeamPerformance({ period });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Performance</h1>
          <p className="text-muted-foreground mt-1">Individual and team-wide performance tracking</p>
        </div>
        
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Performers
          </CardTitle>
          <CardDescription>Ranked by performance score</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.leaderboard.map((member, index) => {
                const icons = [Trophy, Medal, Award];
                const Icon = icons[index] || TrendingUp;
                const colors = ['text-yellow-500', 'text-gray-400', 'text-orange-600'];
                const color = colors[index] || 'text-primary';

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Icon className={`h-6 w-6 ${color}`} />
                      <div>
                        <p className="font-medium">{member.userName}</p>
                        <p className="text-sm text-muted-foreground">Rank #{index + 1}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {member.performanceScore.toLocaleString()} pts
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-20 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          data?.teamMembers.map((member) => (
            <Card key={member.userId}>
              <CardHeader>
                <CardTitle className="text-lg">{member.userName}</CardTitle>
                <CardDescription>Rank #{member.rank}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Performance Score:</span>
                  <span className="font-bold text-primary">
                    {Number(member.metrics.performance_score).toLocaleString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Campaigns</p>
                    <p className="text-lg font-semibold">{member.metrics.campaigns_owned}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contacts</p>
                    <p className="text-lg font-semibold">{member.metrics.contacts_reached}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Meetings</p>
                    <p className="text-lg font-semibold">{member.metrics.meetings_booked}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deals</p>
                    <p className="text-lg font-semibold">{member.metrics.deals_won}</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Efficiency Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${Math.min(Number(member.metrics.efficiency_rating), 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Number(member.metrics.efficiency_rating).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
