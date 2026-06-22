import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProposalCard } from "./ProposalCard";
import { useProposals } from "@/hooks/useProposals";
import { Loader2, Search } from "lucide-react";
import type { ProposalStatus } from "@/types/proposal";

interface ProposalListProps {
  dealId?: string;
  clientId?: string;
  variant?: "table" | "cards";
}

export const ProposalList = ({ dealId, clientId, variant = "cards" }: ProposalListProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: proposals, isLoading } = useProposals({ dealId, clientId });

  const filteredProposals = proposals?.filter((proposal) => {
    const matchesSearch = proposal.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No proposals yet. Create one to get started.</p>
      </div>
    );
  }

  const statusCounts = proposals.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<ProposalStatus, number>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({proposals.length})</SelectItem>
            <SelectItem value="draft">Draft ({statusCounts.draft || 0})</SelectItem>
            <SelectItem value="sent">Sent ({statusCounts.sent || 0})</SelectItem>
            <SelectItem value="viewed">Viewed ({statusCounts.viewed || 0})</SelectItem>
            <SelectItem value="signed">Signed ({statusCounts.signed || 0})</SelectItem>
            <SelectItem value="declined">Declined ({statusCounts.declined || 0})</SelectItem>
            <SelectItem value="expired">Expired ({statusCounts.expired || 0})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {variant === "cards" ? (
        <div className="space-y-3">
          {filteredProposals?.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProposals?.map((proposal) => (
              <TableRow key={proposal.id}>
                <TableCell>{proposal.title}</TableCell>
                <TableCell>{proposal.client?.name}</TableCell>
                <TableCell>{proposal.deal?.title}</TableCell>
                <TableCell>
                  {/* Status badge would go here */}
                  {proposal.status}
                </TableCell>
                <TableCell>{new Date(proposal.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{proposal.sent_at ? new Date(proposal.sent_at).toLocaleDateString() : "-"}</TableCell>
                <TableCell>
                  {/* Actions would go here */}
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {filteredProposals?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No proposals match your filters.</p>
        </div>
      )}
    </div>
  );
};
