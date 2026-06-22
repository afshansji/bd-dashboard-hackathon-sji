import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-4 rounded" /></CardHeader><CardContent><Skeleton className="h-7 w-20 mb-1" /><Skeleton className="h-3 w-16" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (<Card key={i}><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>))}
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-8 rounded-lg" /></CardHeader><CardContent><Skeleton className="h-8 w-24 mb-2" /><Skeleton className="h-4 w-20" /></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (<Card key={i}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-8 w-8 rounded-lg" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-32" /></CardContent></Card>))}
      </div>
    </div>
  );
}

export function EmptyDealsState({ title = "No deals found", description = "Deals will appear here once they enter this stage." }: { title?: string; description?: string }) {
  return (
    <Card><CardContent className="flex flex-col items-center justify-center py-12">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">{description}</p>
    </CardContent></Card>
  );
}
