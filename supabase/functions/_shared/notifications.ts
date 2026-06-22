interface SendGridEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export async function sendEmail(params: SendGridEmailParams): Promise<void> {
  const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
  
  if (!sendGridApiKey) {
    console.warn('[notifications] SendGrid API key not configured, skipping email');
    return;
  }

  // Get sender email from environment or use default
  const defaultFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@resend.dev';
  
  const { 
    to, 
    subject, 
    html, 
    from = defaultFromEmail,
    fromName = 'Lovable BD System',
    replyTo,
    cc,
    bcc
  } = params;

  try {
    const emailPayload: any = {
      personalizations: [{
        to: [{ email: to }]
      }],
      from: fromName ? { email: from, name: fromName } : { email: from },
      subject,
      content: [{ type: 'text/html', value: html }],
    };

    // Add reply-to if provided
    if (replyTo) {
      emailPayload.reply_to = { email: replyTo };
    }

    // Add CC if provided
    if (cc && cc.length > 0) {
      emailPayload.personalizations[0].cc = cc.map(email => ({ email }));
    }

    // Add BCC if provided
    if (bcc && bcc.length > 0) {
      emailPayload.personalizations[0].bcc = bcc.map(email => ({ email }));
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    console.log(`[notifications] Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('[notifications] Failed to send email:', error);
    throw error;
  }
}

interface ProposalNotificationData {
  proposalTitle: string;
  clientName: string;
  dealTitle: string;
  proposalUrl?: string;
  viewedAt?: string;
  signedAt?: string;
  declinedAt?: string;
  expiresAt?: string;
}

export async function sendProposalNotification(
  recipientEmail: string,
  type: 'proposal_viewed' | 'proposal_signed' | 'proposal_declined' | 'proposal_expiring',
  data: ProposalNotificationData
): Promise<void> {
  const templates = {
    proposal_viewed: {
      subject: `🔔 ${data.clientName} viewed your proposal`,
      html: `
        <h2>Good News!</h2>
        <p><strong>${data.clientName}</strong> has viewed your proposal: <strong>${data.proposalTitle}</strong></p>
        <p>Deal: ${data.dealTitle}</p>
        <p>Viewed at: ${new Date(data.viewedAt!).toLocaleString()}</p>
        ${data.proposalUrl ? `<p><a href="${data.proposalUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Proposal</a></p>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification from your Business Development system.</p>
      `,
    },
    proposal_signed: {
      subject: `🎉 ${data.clientName} signed the proposal!`,
      html: `
        <h2>Congratulations! 🎉</h2>
        <p><strong>${data.clientName}</strong> has signed your proposal: <strong>${data.proposalTitle}</strong></p>
        <p>Deal: ${data.dealTitle}</p>
        <p>Signed at: ${new Date(data.signedAt!).toLocaleString()}</p>
        ${data.proposalUrl ? `<p><a href="${data.proposalUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Signed Proposal</a></p>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 20px;">The deal has been automatically updated to "Closed Won" status.</p>
      `,
    },
    proposal_declined: {
      subject: `❌ ${data.clientName} declined the proposal`,
      html: `
        <h2>Proposal Declined</h2>
        <p><strong>${data.clientName}</strong> has declined your proposal: <strong>${data.proposalTitle}</strong></p>
        <p>Deal: ${data.dealTitle}</p>
        <p>Declined at: ${new Date(data.declinedAt!).toLocaleString()}</p>
        ${data.proposalUrl ? `<p><a href="${data.proposalUrl}" style="background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Proposal</a></p>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Consider reaching out to understand their concerns.</p>
      `,
    },
    proposal_expiring: {
      subject: `⏰ Proposal expiring soon: ${data.proposalTitle}`,
      html: `
        <h2>Proposal Expiring Soon</h2>
        <p>Your proposal <strong>${data.proposalTitle}</strong> for <strong>${data.clientName}</strong> will expire in 3 days.</p>
        <p>Deal: ${data.dealTitle}</p>
        <p>Expires at: ${new Date(data.expiresAt!).toLocaleString()}</p>
        ${data.proposalUrl ? `<p><a href="${data.proposalUrl}" style="background-color: #F44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Take Action</a></p>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Consider following up with the client to maintain momentum.</p>
      `,
    },
  };

  const template = templates[type];
  await sendEmail({
    to: recipientEmail,
    subject: template.subject,
    html: template.html,
  });
}

export async function checkNotificationPreferences(
  supabaseClient: any,
  userId: string,
  notificationType: string
): Promise<boolean> {
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      // Default to enabled if no preferences found
      return true;
    }

    const preferences = profile.notification_preferences || {};
    
    // Default all notification types to true if not specified
    return preferences[notificationType] !== false;
  } catch (error) {
    console.error('[notifications] Error checking preferences:', error);
    return true; // Default to enabled on error
  }
}
