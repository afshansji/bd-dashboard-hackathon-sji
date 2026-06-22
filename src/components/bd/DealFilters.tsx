import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  CalendarIcon,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { DEAL_STAGES, DEAL_STATUSES, STAGE_LABELS, STATUS_LABELS } from '@/lib/dealStages';
import { Calendar } from '@/components/ui/calendar';

export interface DealFiltersState {
  stages?: string[];
  statuses?: string[];
  ownerIds?: string[];
  pmIds?: string[];
  podIds?: string[];
  categories?: string[];
  dealTypes?: string[];
  dateFrom?: Date | null;
  dateTo?: Date | null;
  createdDateFrom?: Date | null;
  createdDateTo?: Date | null;
  syncedOnly?: boolean;
  hideStaleDeals?: boolean;
  search?: string;
}

interface DealFiltersProps {
  filters: DealFiltersState;
  onFiltersChange: (filters: DealFiltersState) => void;
  owners: AdminUser[];
  pms: AdminUser[];
  pods: Array<{ id: string; name: string }>;
  categories: string[];
}

function getUserDisplayName(user: AdminUser) {
  if (user.first_name || user.last_name) {
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  }
  return user.email;
}

function getActiveFilterCount(filters: DealFiltersState): number {
  let count = 0;
  if (filters.stages?.length) count++;
  if (filters.statuses?.length) count++;
  if (filters.ownerIds?.length) count++;
  if (filters.pmIds?.length) count++;
  if (filters.podIds?.length) count++;
  if (filters.categories?.length) count++;
  if (filters.dealTypes?.length) count++;
  if (filters.dateFrom || filters.dateTo) count++;
  if (filters.createdDateFrom || filters.createdDateTo) count++;
  if (filters.syncedOnly) count++;
  if (filters.hideStaleDeals) count++;
  if (filters.statuses && filters.statuses.length > 0 && filters.statuses.length < 4) count++;
  if (filters.search) count++;
  return count;
}

export function DealFilters({ filters, onFiltersChange, owners, pms, pods, categories }: DealFiltersProps) {
  const stageOptions = useMemo(() => Object.values(DEAL_STAGES), []);
  const statusOptions = useMemo(() => Object.values(DEAL_STATUSES), []);

  const toggleFilterValue = (
    key: 'stages' | 'statuses' | 'ownerIds' | 'pmIds' | 'podIds' | 'categories' | 'dealTypes',
    value: string
  ) => {
    const current = new Set(filters[key] ?? []);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    onFiltersChange({
      ...filters,
      [key]: Array.from(current),
    });
  };

  const handleDateChange = (
    key: 'dateFrom' | 'dateTo' | 'createdDateFrom' | 'createdDateTo',
    value: Date | null
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {getActiveFilterCount(filters) > 0 && (
          <Badge variant="secondary" className="gap-1">
            {getActiveFilterCount(filters)} filter{getActiveFilterCount(filters) > 1 ? 's' : ''} active
          </Badge>
        )}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Stage
              {filters.stages?.length ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {filters.stages.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search stages..." />
              <CommandList>
                <CommandEmpty>No stage found.</CommandEmpty>
                <CommandGroup>
                  {stageOptions.map((stage) => (
                    <CommandItem
                      key={stage}
                      onSelect={() => toggleFilterValue('stages', stage)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={filters.stages?.includes(stage)} />
                      <span>{STAGE_LABELS[stage]}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Status
              {filters.statuses?.length ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {filters.statuses.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search statuses..." />
              <CommandList>
                <CommandEmpty>No status found.</CommandEmpty>
                <CommandGroup>
                  {statusOptions.map((status) => (
                    <CommandItem
                      key={status}
                      onSelect={() => toggleFilterValue('statuses', status)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={filters.statuses?.includes(status)} />
                      <span>{STATUS_LABELS[status]}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Owner
              {filters.ownerIds?.length ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {filters.ownerIds.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search owners..." />
              <CommandList>
                <CommandEmpty>No owner found.</CommandEmpty>
                <CommandGroup>
                  {owners.map((owner) => (
                    <CommandItem
                      key={owner.id}
                      onSelect={() => toggleFilterValue('ownerIds', owner.id)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={filters.ownerIds?.includes(owner.id)} />
                      <span>{getUserDisplayName(owner)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              PM
              {filters.pmIds?.length ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {filters.pmIds.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search PMs..." />
              <CommandList>
                <CommandEmpty>No PM found.</CommandEmpty>
                <CommandGroup>
                  {pms.map((pm) => (
                    <CommandItem
                      key={pm.id}
                      onSelect={() => toggleFilterValue('pmIds', pm.id)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={filters.pmIds?.includes(pm.id)} />
                      <span>{getUserDisplayName(pm)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Category
              {filters.categories?.length ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {filters.categories.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search categories..." />
              <CommandList>
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandGroup>
                  {categories.map((category) => (
                    <CommandItem
                      key={category}
                      onSelect={() => toggleFilterValue('categories', category)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={filters.categories?.includes(category)} />
                      <span>{category}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Type
              {filters.dealTypes?.length ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {filters.dealTypes.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => toggleFilterValue('dealTypes', 'newbusiness')}
                    className="flex items-center gap-2"
                  >
                    <Checkbox checked={filters.dealTypes?.includes('newbusiness')} />
                    <span>New Business</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => toggleFilterValue('dealTypes', 'existingbusiness')}
                    className="flex items-center gap-2"
                  >
                    <Checkbox checked={filters.dealTypes?.includes('existingbusiness')} />
                    <span>Existing Business</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              POD
              {filters.podIds?.length ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {filters.podIds.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search PODs..." />
              <CommandList>
                <CommandEmpty>No POD found.</CommandEmpty>
                <CommandGroup>
                  {pods.map((pod) => (
                    <CommandItem
                      key={pod.id}
                      onSelect={() => toggleFilterValue('podIds', pod.id)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={filters.podIds?.includes(pod.id)} />
                      <span>{pod.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Close Date
              {(filters.dateFrom || filters.dateTo) && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  ✓
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">From</Label>
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom ?? undefined}
                    onSelect={(date) => handleDateChange('dateFrom', date ?? null)}
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">To</Label>
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ?? undefined}
                    onSelect={(date) => handleDateChange('dateTo', date ?? null)}
                  />
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onFiltersChange({ ...filters, dateFrom: null, dateTo: null })}>
                Clear Dates
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Created Date
              {(filters.createdDateFrom || filters.createdDateTo) && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  ✓
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">From</Label>
                  <Calendar
                    mode="single"
                    selected={filters.createdDateFrom ?? undefined}
                    onSelect={(date) => handleDateChange('createdDateFrom', date ?? null)}
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">To</Label>
                  <Calendar
                    mode="single"
                    selected={filters.createdDateTo ?? undefined}
                    onSelect={(date) => handleDateChange('createdDateTo', date ?? null)}
                  />
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onFiltersChange({ ...filters, createdDateFrom: null, createdDateTo: null })}>
                Clear Created Dates
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={filters.syncedOnly ?? false}
            onCheckedChange={(checked) =>
              onFiltersChange({
                ...filters,
                syncedOnly: Boolean(checked),
              })
            }
          />
          Synced from Control Tower
        </Label>

        <Label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={filters.hideStaleDeals ?? false}
            onCheckedChange={(checked) =>
              onFiltersChange({
                ...filters,
                hideStaleDeals: Boolean(checked),
              })
            }
          />
          Hide Stale Deals
        </Label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search deals"
          value={filters.search ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          className="w-full sm:w-64"
        />
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
