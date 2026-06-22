import { Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyContactListProps {
  hasContacts: boolean;
  hasFilters: boolean;
  onClearFilters?: () => void;
  onAddLeads?: () => void;
}

export function EmptyContactList({
  hasContacts,
  hasFilters,
  onClearFilters,
  onAddLeads,
}: EmptyContactListProps) {
  if (!hasContacts) {
    // No contacts at all in campaign
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Get started by importing leads into this campaign
        </p>
        {onAddLeads && (
          <Button onClick={onAddLeads} className="gap-2">
            <Users className="h-4 w-4" />
            Add Leads
          </Button>
        )}
      </div>
    );
  }

  if (hasFilters) {
    // Has contacts but filters returned no results
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Search className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Try adjusting your search query or filters
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return null;
}
