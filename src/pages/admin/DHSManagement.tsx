import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllDHSSubmissions } from "@/hooks/useDHSSubmissions";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { DHSTeamSummary } from "@/components/dhs/DHSTeamSummary";

export default function DHSManagement() {
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: allDHSSubmissions, isLoading } = useAllDHSSubmissions(dateFilter);

  // Filter submissions by search term
  const filteredSubmissions = allDHSSubmissions?.filter((submission) => {
    const matchesSearch = searchTerm === "" ||
      submission.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">DHS Management</h1>
        <p className="text-muted-foreground">
          Monitor team Daily Head Start submissions and track BD health indicators
        </p>
      </div>

      {/* Team Summary Dashboard */}
      <DHSTeamSummary />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Date filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {submission.profiles?.full_name || submission.profiles?.email || "Unknown User"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(submission.date), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {submission.content ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: submission.content }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No content provided</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchTerm
                ? "No submissions match your search"
                : "No DHS submissions found for this period"}
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                }}
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

