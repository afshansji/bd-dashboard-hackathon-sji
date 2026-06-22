import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Mail } from "lucide-react";
import { EnrollmentDebugHelper } from "./EnrollmentDebugHelper";
import { DetailedSystemCheck } from "./DetailedSystemCheck";

export function EmailDiagnostics() {
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: [],
    };

    try {
      // Check 1: User Authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      diagnostics.checks.push({
        name: "User Authentication",
        status: user && !authError ? "pass" : "fail",
        message: user ? `Authenticated as ${user.email}` : "Not authenticated",
        details: authError?.message,
      });

      if (!user) {
        setResults(diagnostics);
        setTesting(false);
        return;
      }

      // Check 2: SendGrid Configuration (check if function exists)
      diagnostics.checks.push({
        name: "SendGrid Function",
        status: "info",
        message: "send-campaign-email function should be deployed",
      });

      // Check 3: Email Templates
      const { data: templates, error: templateError } = await supabase
        .from('email_templates')
        .select('id, name')
        .limit(5);

      diagnostics.checks.push({
        name: "Email Templates",
        status: templates && templates.length > 0 ? "pass" : "warn",
        message: templates ? `Found ${templates.length} email template(s)` : "No email templates found",
        details: templateError?.message,
      });

      // Check 4: Sequence Batch Queue
      const { data: batches, error: batchError } = await supabase
        .from('sequence_batch_queue')
        .select('id, status, scheduled_for')
        .order('created_at', { ascending: false })
        .limit(5);

      diagnostics.checks.push({
        name: "Email Queue",
        status: !batchError ? "pass" : "fail",
        message: batches ? `Found ${batches.length} batch(es) in queue` : "Could not check queue",
        details: batches?.map((b: any) => `${b.status}: scheduled for ${new Date(b.scheduled_for).toLocaleString()}`).join(", "),
      });

      // Check 5: Recent Execution Logs
      const { data: logs, error: logsError } = await supabase
        .from('sequence_execution_log')
        .select('id, status, executed_at')
        .order('executed_at', { ascending: false })
        .limit(5);

      diagnostics.checks.push({
        name: "Execution Logs",
        status: !logsError ? "pass" : "fail",
        message: logs ? `Found ${logs.length} recent execution(s)` : "No execution logs",
        details: logs?.map((l: any) => `${l.status} at ${new Date(l.executed_at).toLocaleString()}`).join(", "),
      });

      // Check 6: Campaign Emails Table
      const { data: emails, error: emailsError } = await supabase
        .from('campaign_emails')
        .select('id, status, sent_at')
        .order('sent_at', { ascending: false })
        .limit(5);

      diagnostics.checks.push({
        name: "Sent Emails",
        status: !emailsError ? "pass" : "fail",
        message: emails && emails.length > 0 ? `Found ${emails.length} sent email(s)` : "No emails sent yet",
        details: emails?.map((e: any) => `${e.status} at ${new Date(e.sent_at).toLocaleString()}`).join(", "),
      });

      // Check 7: Test Email Send (if email provided)
      if (testEmail && testEmail.includes('@')) {
        try {
          const { data, error: sendError } = await supabase.functions.invoke('send-campaign-email', {
            body: {
              to: testEmail,
              subject: 'Test Email from SJ BD Dashboard',
              body: '<p>This is a test email to verify email delivery is working correctly.</p><p>If you received this, the system is configured properly!</p>',
              contactId: user.id, // Use user ID as dummy contact ID
              campaignId: user.id, // Use user ID as dummy campaign ID
            },
          });

          diagnostics.checks.push({
            name: "Test Email Send",
            status: !sendError ? "pass" : "fail",
            message: !sendError ? `Test email sent to ${testEmail}` : "Failed to send test email",
            details: sendError?.message,
          });
        } catch (error: any) {
          diagnostics.checks.push({
            name: "Test Email Send",
            status: "fail",
            message: "Error sending test email",
            details: error.message,
          });
        }
      }

      setResults(diagnostics);
    } catch (error: any) {
      diagnostics.checks.push({
        name: "Diagnostics Error",
        status: "fail",
        message: "Error running diagnostics",
        details: error.message,
      });
      setResults(diagnostics);
    }

    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warn":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <DetailedSystemCheck />
      
      <EnrollmentDebugHelper />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email System Diagnostics
          </CardTitle>
          <CardDescription>
            Test your email automation setup and troubleshoot delivery issues
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="testEmail">Test Email Address (optional)</Label>
          <Input
            id="testEmail"
            type="email"
            placeholder="your@email.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Enter an email to send a test message and verify delivery
          </p>
        </div>

        <Button onClick={runDiagnostics} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            "Run Email Diagnostics"
          )}
        </Button>

        {results && (
          <div className="space-y-3 mt-6">
            <h3 className="font-semibold text-sm">Results:</h3>
            {results.checks.map((check: any, index: number) => (
              <Alert key={index} variant={check.status === "fail" ? "destructive" : "default"}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <AlertTitle className="text-sm font-medium">{check.name}</AlertTitle>
                    <AlertDescription className="text-sm">
                      {check.message}
                      {check.details && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {check.details}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

