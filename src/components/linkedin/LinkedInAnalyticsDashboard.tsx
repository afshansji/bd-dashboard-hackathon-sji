import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, Send, MessageCircle, TrendingUp, Target, 
  ThumbsUp, ThumbsDown, Minus 
} from "lucide-react";
import { useLinkedInMessageAnalytics } from "@/hooks/useLinkedInMessageAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkedInAnalyticsDashboardProps {
  campaignId?: string;
}

export function LinkedInAnalyticsDashboard({ campaignId }: LinkedInAnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useLinkedInMessageAnalytics(campaignId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Message Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Message Performance Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{analytics.totalGenerated}</p>
            <p className="text-xs text-muted-foreground">Generated</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{analytics.totalSent}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-green-600">{analytics.totalResponses}</p>
            <p className="text-xs text-muted-foreground">Responses</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{analytics.responseRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Response Rate</p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Conversion Funnel</h4>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Generated → Sent</span>
                <span>{analytics.totalGenerated > 0 ? ((analytics.totalSent / analytics.totalGenerated) * 100).toFixed(0) : 0}%</span>
              </div>
              <Progress 
                value={analytics.totalGenerated > 0 ? (analytics.totalSent / analytics.totalGenerated) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Sent → Response</span>
                <span>{analytics.responseRate.toFixed(0)}%</span>
              </div>
              <Progress 
                value={analytics.responseRate} 
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* By Message Type */}
        {analytics.byMessageType.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">By Message Type</h4>
            <div className="space-y-2">
              {analytics.byMessageType.map((item) => (
                <div key={item.message_type} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.message_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">
                      {item.total_generated} gen
                    </span>
                    <span className="text-blue-600">
                      {item.total_sent} sent
                    </span>
                    <span className="text-green-600">
                      {item.total_responses} resp
                    </span>
                    <Badge variant={item.response_rate > 30 ? "default" : "secondary"}>
                      {item.response_rate.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Tone */}
        {analytics.byTone.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Performance by Tone</h4>
            <div className="grid grid-cols-3 gap-2">
              {analytics.byTone.map((item) => (
                <div key={item.tone} className="p-3 bg-muted/50 rounded text-center">
                  <p className="text-sm font-medium truncate">{item.tone}</p>
                  <p className="text-lg font-bold text-primary">{item.responseRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {item.responses}/{item.sent} responses
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Last 7 Days</h4>
          <div className="flex gap-1 h-16 items-end">
            {analytics.recentPerformance.map((day) => {
              const maxValue = Math.max(...analytics.recentPerformance.map(d => d.sent + d.responses), 1);
              const sentHeight = (day.sent / maxValue) * 100;
              const respHeight = (day.responses / maxValue) * 100;
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex flex-col gap-0.5 items-center" style={{ height: '50px' }}>
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${sentHeight}%` }}
                      title={`${day.sent} sent`}
                    />
                    <div 
                      className="w-full bg-green-500 rounded-b"
                      style={{ height: `${respHeight}%` }}
                      title={`${day.responses} responses`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Sent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Responses</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
