import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Mail, Linkedin, Phone } from "lucide-react";
import { useSequences } from "@/hooks/useSequences";
import type { LogFilters } from "@/hooks/useSequenceExecutionLogsAdvanced";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface ExecutionLogFiltersProps {
  filters: LogFilters;
  onFilterChange: (filters: LogFilters) => void;
}

const STATUS_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'skipped', label: 'Skipped' },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'phone', label: 'Phone', icon: Phone },
];

export function ExecutionLogFilters({ filters, onFilterChange }: ExecutionLogFiltersProps) {
  const { data: sequences = [] } = useSequences();

  const updateFilter = (key: keyof LogFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleStatus = (status: string) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    updateFilter('statuses', newStatuses.length > 0 ? newStatuses : undefined);
  };

  const toggleChannel = (channel: string) => {
    const currentChannels = filters.channels || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    updateFilter('channels', newChannels.length > 0 ? newChannels : undefined);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'page' || key === 'pageSize' || key === 'sortBy' || key === 'sortOrder') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  }).length;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          )}
        </div>

        {/* First Row: Sequence, Contact Search, Global Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Sequence</Label>
            <Select
              value={filters.sequenceId || "all"}
              onValueChange={(value) => updateFilter('sequenceId', value === "all" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sequences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sequences</SelectItem>
                {sequences.map((seq) => (
                  <SelectItem key={seq.id} value={seq.id}>
                    {seq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contact Search</Label>
            <Input
              placeholder="Search by name or email..."
              value={filters.contactSearch || ""}
              onChange={(e) => updateFilter('contactSearch', e.target.value || undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Global Search</Label>
            <Input
              placeholder="Search all fields..."
              value={filters.search || ""}
              onChange={(e) => updateFilter('search', e.target.value || undefined)}
            />
          </div>
        </div>

        {/* Second Row: Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
            />
          </div>
        </div>

        {/* Third Row: Status Checkboxes */}
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-4">
            {STATUS_OPTIONS.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={(filters.statuses || []).includes(status.value)}
                  onCheckedChange={() => toggleStatus(status.value)}
                />
                <label
                  htmlFor={`status-${status.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {status.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Fourth Row: Channel Toggles */}
        <div className="space-y-2">
          <Label>Channels</Label>
          <div className="flex gap-2">
            {CHANNEL_OPTIONS.map((channel) => {
              const Icon = channel.icon;
              const isActive = (filters.channels || []).includes(channel.value);
              return (
                <Button
                  key={channel.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleChannel(channel.value)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {channel.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.sequenceId && (
              <Badge variant="secondary">
                Sequence: {sequences.find(s => s.id === filters.sequenceId)?.name}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('sequenceId', undefined)}
                />
              </Badge>
            )}
            {filters.contactSearch && (
              <Badge variant="secondary">
                Contact: {filters.contactSearch}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('contactSearch', undefined)}
                />
              </Badge>
            )}
            {(filters.statuses || []).map(status => (
              <Badge key={status} variant="secondary">
                Status: {status}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => toggleStatus(status)}
                />
              </Badge>
            ))}
            {(filters.channels || []).map(channel => (
              <Badge key={channel} variant="secondary">
                Channel: {channel}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => toggleChannel(channel)}
                />
              </Badge>
            ))}
            {filters.dateFrom && (
              <Badge variant="secondary">
                From: {filters.dateFrom}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('dateFrom', undefined)}
                />
              </Badge>
            )}
            {filters.dateTo && (
              <Badge variant="secondary">
                To: {filters.dateTo}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('dateTo', undefined)}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
