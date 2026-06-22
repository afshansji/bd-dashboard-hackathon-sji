import { Link } from "react-router-dom";
import { Bug, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FeedbackWidget() {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex max-w-xs flex-col gap-3">
      <Card className="border-primary/30 shadow-lg shadow-primary/20">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">We value your feedback</p>
            <p className="text-xs text-muted-foreground">
              Spot a bug or have a feature idea? Let the platform team know in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/feedback/submit?type=bug">
                <Bug className="h-4 w-4" />
                Report bug
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-2">
              <Link to="/feedback/submit?type=feature">
                <Sparkles className="h-4 w-4" />
                Request feature
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
