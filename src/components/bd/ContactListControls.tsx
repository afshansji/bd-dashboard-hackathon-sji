import { Search, SlidersHorizontal, List, Columns, Tags, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { CampaignContactStatus } from '@/features/campaign-detail/types';

const STATUS_OPTIONS: { value: CampaignContactStatus; label: string }[] = [
  { value: 'identified', label: 'Identified' },
  { value: 'researched', label: 'Researched' },
  { value: 'client_not_ideal', label: 'Client Not Ideal' },
  { value: 'contacted_linkedin', label: 'Request Sent' },
  { value: 'contacted_social', label: 'Social Media Request' },
  { value: 'connected', label: 'Connected' },
  { value: 'client_not_responsive', label: 'Client Not Responsive' },
  { value: 'messaged', label: 'Messaged' },
  { value: 'contacted_email', label: 'Email Sent' },
  { value: 'responded', label: 'Responded' },
  { value: 'meeting_booked', label: 'Meeting' },
  { value: 'close_lost', label: 'Close Lost' },
  { value: 'won', label: 'Won' },
];

interface ContactListControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: CampaignContactStatus[];
  onStatusFilterChange: (statuses: CampaignContactStatus[]) => void;
  viewMode: 'list' | 'pipeline';
  onViewModeChange: (mode: 'list' | 'pipeline') => void;
  statusCounts?: Record<CampaignContactStatus, number>;
  tagFilter?: string[];
  onTagFilterChange?: (tags: string[]) => void;
  availableTags?: string[];
}

export function ContactListControls({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  statusCounts,
  tagFilter = [],
  onTagFilterChange,
  availableTags = [],
}: ContactListControlsProps) {
  const handleStatusToggle = (status: CampaignContactStatus) => {
    if (statusFilter.includes(status)) {
      onStatusFilterChange(statusFilter.filter((s) => s !== status));
    } else {
      onStatusFilterChange([...statusFilter, status]);
    }
  };

  const handleClearStatusFilter = () => {
    onStatusFilterChange([]);
  };

  const handleTagToggle = (tag: string) => {
    if (!onTagFilterChange) return;
    if (tagFilter.includes(tag)) {
      onTagFilterChange(tagFilter.filter((t) => t !== tag));
    } else {
      onTagFilterChange([...tagFilter, tag]);
    }
  };

  const handleClearTagFilter = () => {
    onTagFilterChange?.([]);
  };

  const hasStatusFilter = statusFilter.length > 0;
  const hasTagFilter = tagFilter.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Left: Search */}
        <div className="relative w-full sm:flex-1 sm:min-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, company, title, or email"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Right: Filters and View Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Status
                {hasStatusFilter && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {statusFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={statusFilter.includes(option.value)}
                  onCheckedChange={() => handleStatusToggle(option.value)}
                >
                  <span className="flex-1">{option.label}</span>
                  {statusCounts && statusCounts[option.value] > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {statusCounts[option.value]}
                    </Badge>
                  )}
                </DropdownMenuCheckboxItem>
              ))}
              {hasStatusFilter && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={handleClearStatusFilter}
                  >
                    Clear Filter
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tag Filter */}
          {availableTags.length > 0 && onTagFilterChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Tags className="h-4 w-4" />
                  Tags
                  {hasTagFilter && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {tagFilter.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={tagFilter.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
                {hasTagFilter && (
                  <>
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={handleClearTagFilter}
                    >
                      Clear Filter
                    </Button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'pipeline' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('pipeline')}
              className="gap-2"
            >
              <Columns className="h-4 w-4" />
              Pipeline
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(hasStatusFilter || hasTagFilter) && (
        <div className="flex flex-wrap gap-2">
          {statusFilter.map((status) => {
            const option = STATUS_OPTIONS.find((opt) => opt.value === status);
            return option ? (
              <Badge
                key={status}
                variant="secondary"
                className="gap-2"
              >
                Status: {option.label}
                <button
                  onClick={() => handleStatusToggle(status)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {tagFilter.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-2"
            >
              Tag: {tag}
              <button
                onClick={() => handleTagToggle(tag)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
