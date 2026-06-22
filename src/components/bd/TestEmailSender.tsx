import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * TestEmailSender Component
 * 
 * This component provides a UI for sending test emails directly from the dashboard
 * to verify that the email automation system is working correctly.
 * 
 * Usage: Add this component to any page or create a dedicated test page
 */
export function TestEmailSender() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
    details?: string;
  }>({ type: null, message: '' });

  // Pre-filled with the target email
  const [formData, setFormData] = useState({
    to: 'wadud.shuvro@sjinnovation.com',
    subject: '🧪 Test Email from SJ BD Dashboard - Automation Verification',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0070f3;">✅ Email Automation System Test</h2>
  
  <p>Hello <strong>Wadud Shuvro</strong>!</p>
  
  <p>This is a test email to verify that the email automation system is working correctly.</p>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Test Details:</strong></p>
    <ul style="margin: 10px 0;">
      <li><strong>Date & Time:</strong> ${new Date().toLocaleString()}</li>
      <li><strong>System:</strong> SJ BD Dashboard</li>
      <li><strong>Purpose:</strong> Automation System Verification</li>
    </ul>
  </div>
  
  <p><strong>If you received this email, it means:</strong></p>
  <ol>
    <li>✅ SendGrid is properly configured</li>
    <li>✅ The send-campaign-email function is working</li>
    <li>✅ Email delivery is operational</li>
    <li>✅ The automation system is ready to use</li>
  </ol>
  
  <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
    <p style="margin: 0;"><strong>✨ Next Steps:</strong></p>
    <p style="margin: 10px 0 0 0;">You can now proceed to enroll contacts in sequences, and they should receive emails according to the configured schedule.</p>
  </div>
  
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  
  <p style="color: #666; font-size: 12px; margin: 0;">
    This is an automated test email from SJ Innovation Business Development Dashboard.<br>
    Test conducted at: ${new Date().toISOString()}
  </p>
</div>`
  });

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult({ type: null, message: '' });

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in first.');
      }

      console.log(`Sending test email to: ${formData.to}`);

      // Call the send-campaign-email edge function
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: {
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          contactId: user.id, // Using user ID as dummy contact for test
          campaignId: user.id, // Using user ID as dummy campaign for test
        }
      });

      if (error) {
        throw error;
      }

      const messageId = data?.messageId;

      setResult({
        type: 'success',
        message: `✅ Success! Test email has been sent to ${formData.to}`,
        details: `Email should arrive within 1-5 minutes. Check inbox and spam folder.${messageId ? `\n\nSendGrid Message ID: ${messageId}` : ''}`
      });

      toast.success('Test email sent successfully!', {
        description: `Email sent to ${formData.to}`
      });

      console.log('Test email sent successfully:', data);

    } catch (error: any) {
      console.error('Error sending test email:', error);
      
      const errorMessage = error.message || 'Unknown error occurred';
      
      setResult({
        type: 'error',
        message: '❌ Failed to send test email',
        details: `Error: ${errorMessage}\n\nTroubleshooting:\n• Make sure you're logged in\n• Verify SendGrid API key is configured\n• Check that send-campaign-email function is deployed\n• Review Supabase function logs for details`
      });

      toast.error('Failed to send test email', {
        description: errorMessage
      });
    } finally {
      setSending(false);
    }
  };

  const getAlertIcon = () => {
    switch (result.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'info':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Test Email Sender
        </CardTitle>
        <CardDescription>
          Send a test email to verify the automation system is working correctly
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Setup Requirements</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Make sure you're logged into the dashboard</li>
              <li>Verify SendGrid API key is configured in Supabase</li>
              <li>Ensure send-campaign-email function is deployed</li>
            </ul>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSendTest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To Email Address *</Label>
            <Input
              id="to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="wadud.shuvro@sjinnovation.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Test Email Subject"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Body (HTML) *</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Email body content (HTML supported)"
              className="min-h-[200px] font-mono text-sm"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={sending}
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </form>

        {result.type && (
          <Alert 
            variant={result.type === 'error' ? 'destructive' : 'default'}
            className={
              result.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800'
                : result.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : ''
            }
          >
            {getAlertIcon()}
            <AlertTitle>{result.message}</AlertTitle>
            {result.details && (
              <AlertDescription className="mt-2 whitespace-pre-wrap">
                {result.details}
              </AlertDescription>
            )}
          </Alert>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Expected Timeline</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Script execution:</strong> Instant (&lt; 1 second)</li>
              <li><strong>SendGrid processing:</strong> 1-5 seconds</li>
              <li><strong>Email delivery:</strong> 10 seconds - 5 minutes</li>
              <li><strong>Total time:</strong> Usually within 1-2 minutes</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}





