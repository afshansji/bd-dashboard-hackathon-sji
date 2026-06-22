import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, HelpCircle } from "lucide-react";

interface ValidationSummaryProps {
  validEmails: string[];
  invalidEmails: Array<{ email: string; status: string; reason?: string }>;
  unknownEmails: Array<{ email: string; status: string }>;
}

export function EmailValidationSummary({
  validEmails,
  invalidEmails,
  unknownEmails,
}: ValidationSummaryProps) {
  const totalEmails = validEmails.length + invalidEmails.length + unknownEmails.length;

  if (totalEmails === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Email Validation Results
          <Badge variant="outline">{totalEmails} total</Badge>
        </CardTitle>
        <CardDescription>
          Results from Zerobounce email validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validEmails.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Valid Emails ({validEmails.length})</span>
            </div>
            <div className="text-xs text-muted-foreground">
              These contacts will be imported
            </div>
          </div>
        )}

        {invalidEmails.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Invalid Emails ({invalidEmails.length})
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {invalidEmails.map((item, index) => (
                    <div key={index} className="text-xs">
                      <span className="font-mono">{item.email}</span>
                      <span className="ml-2 text-destructive/80">
                        ({item.status}
                        {item.reason && `: ${item.reason}`})
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2">
                  These contacts will NOT be imported due to invalid email addresses
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {unknownEmails.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span>Unknown/Catch-All Emails ({unknownEmails.length})</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>These emails have uncertain validation status:</p>
              <div className="max-h-40 overflow-y-auto">
                {unknownEmails.map((item, index) => (
                  <div key={index} className="text-xs">
                    <span className="font-mono">{item.email}</span>
                    <span className="ml-2">({item.status})</span>
                  </div>
                ))}
              </div>
              <p className="mt-2">
                These contacts will be imported but may need manual verification
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {validEmails.length}
              </div>
              <div className="text-xs text-muted-foreground">Valid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">
                {invalidEmails.length}
              </div>
              <div className="text-xs text-muted-foreground">Invalid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {unknownEmails.length}
              </div>
              <div className="text-xs text-muted-foreground">Unknown</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
