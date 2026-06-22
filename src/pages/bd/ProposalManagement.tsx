import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, Plus, TrendingUp, Send, CheckCircle, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProposalDialog } from "@/components/proposals/ProposalDialog";
import { ProposalList } from "@/components/proposals/ProposalList";
import { useProposals } from "@/hooks/useProposals";

export default function ProposalManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: proposals } = useProposals();
  const navigate = useNavigate();

  const totalProposals = proposals?.length || 0;
  const sentThisMonth = proposals?.filter((p) => {
    if (!p.sent_at) return false;
    const sentDate = new Date(p.sent_at);
    const now = new Date();
    return sentDate.getMonth() === now.getMonth() && sentDate.getFullYear() === now.getFullYear();
  }).length || 0;

  const signedThisMonth = proposals?.filter((p) => {
    if (!p.completed_at || p.status !== "signed") return false;
    const completedDate = new Date(p.completed_at);
    const now = new Date();
    return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
  }).length || 0;

  const conversionRate = sentThisMonth > 0 ? Math.round((signedThisMonth / sentThisMonth) * 100) : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSignature className="h-8 w-8" />
            Proposal Management
          </h1>
          <p className="text-muted-foreground">Create, send, and track proposals with e-signature</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/proposals/analytics')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Proposal
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProposals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent This Month</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signedThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Proposals</CardTitle>
          <CardDescription>View and manage all your proposals</CardDescription>
        </CardHeader>
        <CardContent>
          <ProposalList variant="cards" />
        </CardContent>
      </Card>

      <ProposalDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
