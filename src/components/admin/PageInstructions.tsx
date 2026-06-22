import { HelpCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PageInstructionsProps {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  relatedLinks?: { label: string; href: string }[];
}

export function PageInstructions({ title, description, steps, tips, relatedLinks }: PageInstructionsProps) {
  return (
    <Alert className="border-primary/50 bg-primary/5 mb-6">
      <HelpCircle className="h-4 w-4 text-primary" />
      <AlertTitle className="text-base font-semibold">{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">{description}</p>
        
        {steps && steps.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-1">How to use this page:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              {steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        )}
        
        {tips && tips.length > 0 && (
          <div className="bg-muted/50 p-2 rounded">
            <p className="text-xs font-medium mb-1">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
              {tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        )}
        
        {relatedLinks && relatedLinks.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {relatedLinks.map((link, i) => (
              <Button key={i} variant="outline" size="sm" asChild>
                <Link to={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
