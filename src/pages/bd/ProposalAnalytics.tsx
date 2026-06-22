import { useState } from "react";
import { ProposalAnalyticsDashboard } from "@/components/proposals/ProposalAnalyticsDashboard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, BarChart3 } from "lucide-react";

export default function ProposalAnalytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const handleExport = () => {
    const data = [
      ['Metric', 'Value'],
      ['Period', period],
      ['Export Date', new Date().toLocaleDateString()],
      ['', ''],
      ['Conversion Funnel', ''],
      ['Total Proposals', ''],
      ['Sent', ''],
      ['Viewed', ''],
      ['Signed', ''],
      ['Declined', ''],
    ];
    
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Proposal Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track proposal performance, conversion rates, and client engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard */}
      <ProposalAnalyticsDashboard period={period} />
    </div>
  );
}
