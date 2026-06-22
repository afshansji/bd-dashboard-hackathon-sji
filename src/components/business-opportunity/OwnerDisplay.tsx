import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOwnerLookup } from "@/hooks/useOwners";

export interface DealLikeForOwner {
  owner?: string;
  actual_deal_owner_name?: string | null;
}

interface OwnerDisplayProps {
  deal: DealLikeForOwner | null;
  showAvatar?: boolean;
}

export function OwnerDisplay({ deal, showAvatar = true }: OwnerDisplayProps) {
  const shouldLookup = deal && !deal.actual_deal_owner_name && deal.owner;
  const { name: lookedUpName } = useOwnerLookup(shouldLookup ? deal.owner : null);
  
  if (!deal) {
    return showAvatar ? (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6"><AvatarFallback className="text-xs">NA</AvatarFallback></Avatar>
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    ) : (<span className="text-sm text-muted-foreground">Loading...</span>);
  }
  
  const displayName = deal.actual_deal_owner_name || lookedUpName || 'Unassigned';
  const getInitials = (name: string) => {
    if (name === 'Unassigned') return 'NA';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NA';
    return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
  };

  if (!showAvatar) return <span className="text-sm">{displayName}</span>;

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback></Avatar>
      <span className="text-sm">{displayName}</span>
    </div>
  );
}
