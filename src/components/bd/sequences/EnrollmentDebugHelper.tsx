import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EnrollmentDebugHelper() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const checkEnrollmentStatus = async () => {
    setChecking(true);
    setResults(null);

    const debug: any = {
      timestamp: new Date().toISOString(),
      issues: [],
      info: [],
    };

    try {
      // Check 1: Get recent contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('campaign_contacts')
        .select('id, contact_name, contact_email, campaign_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (contactsError) {
        debug.issues.push({
          severity: 'error',
          title: 'Cannot Access Contacts',
          message: contactsError.message,
        });
      } else if (contacts && contacts.length > 0) {
        debug.info.push({
          severity: 'success',
          title: 'Contacts Found',
          message: `Found ${contacts.length} recent contacts`,
          details: contacts.map((c: any) => `${c.contact_name} (${c.contact_email || 'no email'})`).join(', '),
        });
      } else {
        debug.issues.push({
          severity: 'warning',
          title: 'No Contacts',
          message: 'No contacts found in the system. Add contacts first.',
        });
      }

      // Check 2: Get sequences
      const { data: sequences, error: seqError } = await supabase
        .from('campaign_sequences')
        .select('id, name, status')
        .order('created_at', { ascending: false })
        .limit(5);

      if (seqError) {
        debug.issues.push({
          severity: 'error',
          title: 'Cannot Access Sequences',
          message: seqError.message,
        });
      } else if (sequences && sequences.length > 0) {
        const activeSequences = sequences.filter((s: any) => s.status === 'active');
        debug.info.push({
          severity: activeSequences.length > 0 ? 'success' : 'warning',
          title: 'Sequences Status',
          message: `Found ${sequences.length} sequence(s), ${activeSequences.length} active`,
          details: sequences.map((s: any) => `${s.name} (${s.status})`).join(', '),
        });

        if (activeSequences.length === 0) {
          debug.issues.push({
            severity: 'warning',
            title: 'No Active Sequences',
            message: 'You have sequences but none are active. Activate a sequence to enroll contacts.',
          });
        }
      } else {
        debug.issues.push({
          severity: 'error',
          title: 'No Sequences',
          message: 'No sequences found. Create a sequence first.',
        });
      }

      // Check 3: Get enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('contact_sequence_enrollments')
        .select(`
          id,
          status,
          enrolled_at,
          contact:campaign_contacts(contact_name, contact_email),
          sequence:campaign_sequences(name, status)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(10);

      if (enrollError) {
        debug.issues.push({
          severity: 'error',
          title: 'Cannot Access Enrollments',
          message: enrollError.message,
        });
      } else if (enrollments && enrollments.length > 0) {
        debug.info.push({
          severity: 'success',
          title: 'Enrollments Found',
          message: `Found ${enrollments.length} enrollment(s)`,
          details: enrollments.map((e: any) => 
            `${e.contact?.contact_name || 'Unknown'} in ${e.sequence?.name || 'Unknown'} (${e.status})`
          ).join(', '),
        });

        // Check for wadud shuvro specifically
        const wadudEnrollment = enrollments.find((e: any) => 
          e.contact?.contact_name?.toLowerCase().includes('wadud') ||
          e.contact?.contact_name?.toLowerCase().includes('shuvro')
        );

        if (wadudEnrollment) {
          debug.info.push({
            severity: 'info',
            title: 'Wadud Shuvro Found',
            message: `Contact is enrolled in ${wadudEnrollment.sequence?.name} with status: ${wadudEnrollment.status}`,
          });
        } else {
          debug.issues.push({
            severity: 'warning',
            title: 'Wadud Shuvro Not Enrolled',
            message: 'This contact is not enrolled in any sequence yet.',
          });
        }
      } else {
        debug.issues.push({
          severity: 'warning',
          title: 'No Enrollments',
          message: 'No contacts are enrolled in any sequences yet.',
        });
      }

      // Check 4: Get email templates
      const { data: templates, error: templateError } = await supabase
        .from('email_templates')
        .select('id, name, subject')
        .limit(5);

      if (templateError) {
        debug.issues.push({
          severity: 'error',
          title: 'Cannot Access Email Templates',
          message: templateError.message,
        });
      } else if (templates && templates.length > 0) {
        debug.info.push({
          severity: 'success',
          title: 'Email Templates',
          message: `Found ${templates.length} email template(s)`,
          details: templates.map((t: any) => t.name).join(', '),
        });
      } else {
        debug.issues.push({
          severity: 'error',
          title: 'No Email Templates',
          message: 'No email templates found. Create an email template first.',
        });
      }

      // Check 5: Get batch queue
      const { data: batches, error: batchError } = await supabase
        .from('sequence_batch_queue')
        .select('id, status, scheduled_for, emails_sent, emails_failed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (batchError) {
        debug.info.push({
          severity: 'info',
          title: 'Batch Queue',
          message: 'Cannot check batch queue (this is optional)',
        });
      } else if (batches && batches.length > 0) {
        const pendingBatches = batches.filter((b: any) => b.status === 'pending');
        debug.info.push({
          severity: 'info',
          title: 'Email Batches',
          message: `Found ${batches.length} batch(es), ${pendingBatches.length} pending`,
          details: batches.map((b: any) => 
            `${b.status}: sent ${b.emails_sent || 0}, failed ${b.emails_failed || 0}`
          ).join(', '),
        });
      } else {
        debug.info.push({
          severity: 'info',
          title: 'No Email Batches',
          message: 'No email batches queued yet.',
        });
      }

      setResults(debug);
    } catch (error: any) {
      debug.issues.push({
        severity: 'error',
        title: 'Debug Error',
        message: error.message,
      });
      setResults(debug);
    }

    setChecking(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment Troubleshooter</CardTitle>
        <CardDescription>
          Check why contacts aren't showing in the Enrollment Status table
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkEnrollmentStatus} disabled={checking} className="w-full">
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking System...
            </>
          ) : (
            "Check Enrollment Status"
          )}
        </Button>

        {results && (
          <div className="space-y-4 mt-6">
            {results.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-red-600">⚠️ Issues Found ({results.issues.length})</h3>
                {results.issues.map((issue: any, index: number) => (
                  <Alert key={`issue-${index}`} variant="destructive">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <AlertTitle className="text-sm font-medium">{issue.title}</AlertTitle>
                        <AlertDescription className="text-sm">
                          {issue.message}
                          {issue.details && (
                            <div className="mt-1 text-xs">
                              {issue.details}
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}

            {results.info.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">ℹ️ System Status</h3>
                {results.info.map((info: any, index: number) => (
                  <Alert key={`info-${index}`}>
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(info.severity)}
                      <div className="flex-1">
                        <AlertTitle className="text-sm font-medium">{info.title}</AlertTitle>
                        <AlertDescription className="text-sm text-muted-foreground">
                          {info.message}
                          {info.details && (
                            <div className="mt-1 text-xs">
                              {info.details}
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

















