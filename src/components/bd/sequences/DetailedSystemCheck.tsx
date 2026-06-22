import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DetailedSystemCheck() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runFullSystemCheck = async () => {
    setChecking(true);
    setResults(null);

    const report: any = {
      timestamp: new Date().toISOString(),
      sections: {
        enrollments: { title: "Enrollments", items: [] },
        batches: { title: "Email Batches", items: [] },
        sentEmails: { title: "Sent Emails", items: [] },
        executionLogs: { title: "Execution Logs", items: [] },
        sequences: { title: "Sequences", items: [] },
        templates: { title: "Email Templates", items: [] },
        contacts: { title: "Your Contacts", items: [] },
      },
      criticalIssues: [],
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;

      // 1. Check Your Enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('contact_sequence_enrollments')
        .select(`
          id,
          status,
          enrolled_at,
          total_sent,
          total_to_send,
          next_batch_at,
          last_step_executed_at,
          email_template_id,
          scheduling_mode,
          send_days,
          time_window_start,
          time_window_end,
          contact:campaign_contacts!inner(
            id,
            contact_name,
            contact_email,
            campaign_id
          ),
          sequence:campaign_sequences(
            id,
            name,
            status
          )
        `)
        .order('enrolled_at', { ascending: false })
        .limit(20);

      if (enrollments && enrollments.length > 0) {
        const yourEnrollments = enrollments.filter((e: any) => 
          e.contact?.contact_email?.toLowerCase().includes(userEmail?.split('@')[0]?.toLowerCase() || 'xxx')
        );

        report.sections.enrollments.items.push({
          type: 'info',
          title: `Found ${enrollments.length} Total Enrollments`,
          details: `${yourEnrollments.length} appear to be yours (based on email match)`,
        });

        yourEnrollments.forEach((enrollment: any) => {
          const hasEmailsSent = enrollment.total_sent > 0;
          report.sections.enrollments.items.push({
            type: hasEmailsSent ? 'success' : 'warning',
            title: `${enrollment.contact?.contact_name} - ${enrollment.sequence?.name}`,
            details: [
              `Status: ${enrollment.status}`,
              `Enrolled: ${new Date(enrollment.enrolled_at).toLocaleString()}`,
              `Emails Sent: ${enrollment.total_sent}/${enrollment.total_to_send}`,
              `Mode: ${enrollment.scheduling_mode}`,
              `Template ID: ${enrollment.email_template_id || 'NOT SET!'}`,
              `Send Days: ${enrollment.send_days?.join(', ') || 'Any day'}`,
              `Time Window: ${enrollment.time_window_start || 'Any'} - ${enrollment.time_window_end || 'Any'}`,
              `Next Batch: ${enrollment.next_batch_at ? new Date(enrollment.next_batch_at).toLocaleString() : 'Not scheduled'}`,
              `Last Executed: ${enrollment.last_step_executed_at ? new Date(enrollment.last_step_executed_at).toLocaleString() : 'Never'}`,
            ].join('\n'),
          });

          if (!enrollment.email_template_id) {
            report.criticalIssues.push({
              severity: 'error',
              title: 'Missing Email Template',
              message: `Enrollment for ${enrollment.contact?.contact_name} has NO email template set!`,
              fix: 'This enrollment cannot send emails. You need to re-enroll with a template selected.',
            });
          }

          if (enrollment.status !== 'active') {
            report.criticalIssues.push({
              severity: 'warning',
              title: 'Enrollment Not Active',
              message: `Enrollment for ${enrollment.contact?.contact_name} is ${enrollment.status}`,
              fix: 'Only active enrollments send emails.',
            });
          }

          if (enrollment.sequence?.status !== 'active') {
            report.criticalIssues.push({
              severity: 'error',
              title: 'Sequence Not Active',
              message: `Sequence "${enrollment.sequence?.name}" is ${enrollment.sequence?.status}`,
              fix: 'Activate the sequence by clicking the Play button.',
            });
          }
        });
      } else {
        report.sections.enrollments.items.push({
          type: 'error',
          title: 'No Enrollments Found',
          details: 'No contacts are enrolled in any sequences.',
        });
        report.criticalIssues.push({
          severity: 'error',
          title: 'No Enrollments',
          message: 'You need to enroll contacts in a sequence first.',
          fix: 'Go to Sequences → Select a sequence → Click "Enroll Contacts"',
        });
      }

      // 2. Check Batch Queue
      const { data: batches } = await supabase
        .from('sequence_batch_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (batches && batches.length > 0) {
        const pendingBatches = batches.filter((b: any) => b.status === 'pending');
        const completedBatches = batches.filter((b: any) => b.status === 'completed');
        const failedBatches = batches.filter((b: any) => b.status === 'failed');

        report.sections.batches.items.push({
          type: pendingBatches.length > 0 ? 'warning' : 'info',
          title: `Batch Queue Status`,
          details: [
            `Total: ${batches.length}`,
            `Pending: ${pendingBatches.length}`,
            `Completed: ${completedBatches.length}`,
            `Failed: ${failedBatches.length}`,
          ].join('\n'),
        });

        if (pendingBatches.length > 0) {
          pendingBatches.slice(0, 5).forEach((batch: any) => {
            const scheduledDate = new Date(batch.scheduled_for);
            const isPast = scheduledDate < new Date();
            
            report.sections.batches.items.push({
              type: isPast ? 'error' : 'info',
              title: `Batch #${batch.batch_number} - ${batch.status}`,
              details: [
                `Scheduled for: ${scheduledDate.toLocaleString()}`,
                `Contacts: ${batch.contacts_in_batch?.length || 0}`,
                `Status: ${batch.status}`,
                isPast ? '⚠️ OVERDUE - Should have been processed!' : '⏰ Waiting for scheduled time',
              ].join('\n'),
            });

            if (isPast) {
              report.criticalIssues.push({
                severity: 'error',
                title: 'Overdue Batches Not Processing',
                message: `Batch scheduled for ${scheduledDate.toLocaleString()} is still pending!`,
                fix: 'The cron job is likely not running. Check Supabase cron configuration.',
              });
            }
          });
        }

        if (failedBatches.length > 0) {
          report.criticalIssues.push({
            severity: 'error',
            title: 'Failed Batches',
            message: `${failedBatches.length} batch(es) failed to send`,
            fix: 'Check the error_message column in sequence_batch_queue table.',
          });
        }
      } else {
        report.sections.batches.items.push({
          type: 'warning',
          title: 'No Batches Found',
          details: 'No email batches have been created. This means enrollments may not be creating batches properly.',
        });
        report.criticalIssues.push({
          severity: 'error',
          title: 'No Batches Created',
          message: 'Enrollments should create batches, but none exist.',
          fix: 'Check if sequence-enroll-contacts function is working properly.',
        });
      }

      // 3. Check Sent Emails
      const { data: sentEmails } = await supabase
        .from('campaign_emails')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (sentEmails && sentEmails.length > 0) {
        const yourEmails = sentEmails.filter((e: any) => 
          e.to_email?.toLowerCase().includes(userEmail?.split('@')[0]?.toLowerCase() || 'xxx')
        );

        report.sections.sentEmails.items.push({
          type: yourEmails.length > 0 ? 'success' : 'warning',
          title: `Found ${sentEmails.length} Sent Emails`,
          details: `${yourEmails.length} sent to your email address`,
        });

        yourEmails.forEach((email: any) => {
          report.sections.sentEmails.items.push({
            type: 'success',
            title: `Email to ${email.to_email}`,
            details: [
              `Subject: ${email.subject}`,
              `Sent: ${new Date(email.sent_at).toLocaleString()}`,
              `Status: ${email.status}`,
              `SendGrid ID: ${email.sendgrid_message_id || 'N/A'}`,
            ].join('\n'),
          });
        });

        if (yourEmails.length === 0) {
          report.criticalIssues.push({
            severity: 'error',
            title: 'No Emails Sent to You',
            message: 'System shows emails were sent, but none to your address.',
            fix: 'Check if you used the correct email when adding the contact.',
          });
        }
      } else {
        report.sections.sentEmails.items.push({
          type: 'error',
          title: 'No Emails Sent',
          details: 'No emails have been sent by the system.',
        });
        report.criticalIssues.push({
          severity: 'error',
          title: 'Zero Emails Sent',
          message: 'The system has not sent ANY emails.',
          fix: 'This means send-campaign-email function is not being called or SendGrid is not configured.',
        });
      }

      // 4. Check Execution Logs
      const { data: logs } = await supabase
        .from('sequence_execution_log')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);

      if (logs && logs.length > 0) {
        const successLogs = logs.filter((l: any) => l.status === 'success');
        const failedLogs = logs.filter((l: any) => l.status === 'failed');

        report.sections.executionLogs.items.push({
          type: failedLogs.length > 0 ? 'error' : 'success',
          title: `Execution Logs`,
          details: [
            `Total: ${logs.length}`,
            `Success: ${successLogs.length}`,
            `Failed: ${failedLogs.length}`,
          ].join('\n'),
        });

        if (failedLogs.length > 0) {
          report.criticalIssues.push({
            severity: 'error',
            title: 'Failed Executions',
            message: `${failedLogs.length} execution(s) failed`,
            fix: 'Check error_message in sequence_execution_log table for details.',
          });
        }
      } else {
        report.sections.executionLogs.items.push({
          type: 'warning',
          title: 'No Execution Logs',
          details: 'No execution attempts recorded.',
        });
      }

      // 5. Check Sequences
      const { data: sequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (sequences && sequences.length > 0) {
        const activeSequences = sequences.filter((s: any) => s.status === 'active');
        
        report.sections.sequences.items.push({
          type: activeSequences.length > 0 ? 'success' : 'error',
          title: `Sequences: ${sequences.length} total, ${activeSequences.length} active`,
          details: sequences.map((s: any) => `${s.name} (${s.status})`).join('\n'),
        });

        if (activeSequences.length === 0) {
          report.criticalIssues.push({
            severity: 'error',
            title: 'No Active Sequences',
            message: 'All sequences are draft/paused/archived.',
            fix: 'Activate at least one sequence to send emails.',
          });
        }
      }

      // 6. Check Email Templates
      const { data: templates } = await supabase
        .from('email_templates')
        .select('*');

      if (templates && templates.length > 0) {
        report.sections.templates.items.push({
          type: 'success',
          title: `${templates.length} Email Template(s)`,
          details: templates.map((t: any) => `${t.name} - "${t.subject}"`).join('\n'),
        });
      } else {
        report.sections.templates.items.push({
          type: 'error',
          title: 'No Email Templates',
          details: 'Cannot send emails without templates.',
        });
        report.criticalIssues.push({
          severity: 'error',
          title: 'No Email Templates',
          message: 'You need to create at least one email template.',
          fix: 'Create a template with subject and body content.',
        });
      }

      // 7. Check Your Contacts
      const { data: contacts } = await supabase
        .from('campaign_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (contacts && contacts.length > 0) {
        const yourContacts = contacts.filter((c: any) => 
          c.contact_email?.toLowerCase().includes(userEmail?.split('@')[0]?.toLowerCase() || 'xxx')
        );

        report.sections.contacts.items.push({
          type: 'info',
          title: `${yourContacts.length} Contact(s) with Your Email`,
          details: yourContacts.map((c: any) => 
            `${c.contact_name} (${c.contact_email}) - Status: ${c.status}`
          ).join('\n'),
        });
      }

      setResults(report);
    } catch (error: any) {
      report.criticalIssues.push({
        severity: 'error',
        title: 'System Check Error',
        message: error.message,
        fix: 'Check console for details.',
      });
      setResults(report);
    }

    setChecking(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card className="border-2 border-orange-500">
      <CardHeader>
        <CardTitle className="text-orange-600">🔍 Deep System Analysis</CardTitle>
        <CardDescription>
          Comprehensive check to find why emails aren't being sent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runFullSystemCheck} 
          disabled={checking} 
          className="w-full"
          variant="destructive"
        >
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Deep Analysis...
            </>
          ) : (
            "🚨 Run Full System Check"
          )}
        </Button>

        {results && (
          <div className="space-y-6 mt-6">
            {/* Critical Issues First */}
            {results.criticalIssues.length > 0 && (
              <Alert variant="destructive" className="border-2">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="text-lg font-bold">
                  🚨 {results.criticalIssues.length} Critical Issue(s) Found!
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-4 space-y-3">
                    {results.criticalIssues.map((issue: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-red-600 pl-3 py-2 bg-red-50">
                        <div className="font-semibold text-red-900">{issue.title}</div>
                        <div className="text-sm text-red-800 mt-1">{issue.message}</div>
                        <div className="text-sm text-red-700 mt-2 font-medium">
                          ✅ Fix: {issue.fix}
                        </div>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Detailed Sections */}
            <Tabs defaultValue="enrollments" className="w-full">
              <TabsList className="grid grid-cols-4 lg:grid-cols-7">
                {Object.entries(results.sections).map(([key, section]: [string, any]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(results.sections).map(([key, section]: [string, any]) => (
                <TabsContent key={key} value={key} className="space-y-2">
                  <h3 className="font-semibold text-lg mb-3">{section.title}</h3>
                  {section.items.length > 0 ? (
                    section.items.map((item: any, idx: number) => (
                      <Alert key={idx}>
                        <div className="flex items-start gap-3">
                          {getIcon(item.type)}
                          <div className="flex-1">
                            <AlertTitle className="text-sm font-medium">
                              {item.title}
                            </AlertTitle>
                            {item.details && (
                              <AlertDescription className="text-xs mt-2 whitespace-pre-line">
                                {item.details}
                              </AlertDescription>
                            )}
                          </div>
                        </div>
                      </Alert>
                    ))
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>No data in this section</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

















