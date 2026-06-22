import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-end justify-between h-48 pb-4">
            {[...Array(7)].map((_, i) => (
              <Skeleton
                key={i}
                className="w-12"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between pt-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
