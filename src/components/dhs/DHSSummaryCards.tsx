import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneCall, UserCheck, Users, TrendingUp } from "lucide-react";

interface DHSSummaryCardsProps {
  totalFollowUps: number;
  totalCalls: number;
  totalMeetings: number;
  pipelineUpdates: number;
}

export function DHSSummaryCards({
  totalFollowUps,
  totalCalls,
  totalMeetings,
  pipelineUpdates,
}: DHSSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Follow-ups Done</CardTitle>
          <UserCheck className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{totalFollowUps}</div>
          <p className="text-xs text-muted-foreground">Today's activity</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
          <PhoneCall className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{totalCalls}</div>
          <p className="text-xs text-muted-foreground">Today's activity</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Meetings Booked</CardTitle>
          <Users className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{totalMeetings}</div>
          <p className="text-xs text-muted-foreground">Today's activity</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Updates</CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{pipelineUpdates}</div>
          <p className="text-xs text-muted-foreground">Today's activity</p>
        </CardContent>
      </Card>
    </div>
  );
}

