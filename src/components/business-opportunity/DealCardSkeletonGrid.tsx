import { DealCardSkeleton } from "./DealCardSkeleton";

interface DealCardSkeletonGridProps {
  count?: number;
}

export function DealCardSkeletonGrid({ count = 6 }: DealCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <DealCardSkeleton key={i} />
      ))}
    </div>
  );
}
