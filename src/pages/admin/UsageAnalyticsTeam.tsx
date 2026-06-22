import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { useUserActivityStats } from '@/hooks/useUserActivityStats';

export default function UsageAnalyticsTeam() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading } = useUserActivityStats({ period, includeAllUsers: true, recentLimit: 0 });

  const teamMembers = useMemo(() => {
    const members = data?.teamMembers ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = normalizedSearch
      ? members.filter((member) => member.userName.toLowerCase().includes(normalizedSearch))
      : members;

    return [...filtered].sort((a, b) => {
      if (b.activityScore !== a.activityScore) {
        return b.activityScore - a.activityScore;
      }
      return b.activityCount - a.activityCount;
    });
  }, [data?.teamMembers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Stats</h1>
          <p className="text-muted-foreground">Usage analytics across all members</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full sm:w-[220px]"
          />
          <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Click a member to view detailed activity</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Activity Score</TableHead>
                  <TableHead>Activity Count</TableHead>
                  <TableHead>Login Count</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/adminpanel/usage-analytics/members/${member.userId}`}
                        className="text-primary hover:underline"
                      >
                        {member.userName}
                      </Link>
                    </TableCell>
                    <TableCell>{member.activityScore}</TableCell>
                    <TableCell>{member.activityCount}</TableCell>
                    <TableCell>{member.loginCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.lastActivityAt
                        ? formatDistanceToNow(new Date(member.lastActivityAt), { addSuffix: true })
                        : 'No activity'}
                    </TableCell>
                  </TableRow>
                ))}
                {teamMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      {searchTerm.trim()
                        ? 'No members match your search.'
                        : 'No members found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
