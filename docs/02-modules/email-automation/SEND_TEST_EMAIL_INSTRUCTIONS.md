# 📧 How to Send Test Email to wadud.shuvro@sjinnovation.com

## 🚀 Quick Start - Browser Console Method

### Step 1: Open the Dashboard
1. Go to your SJ BD Dashboard in the browser: `http://localhost:5173`
2. **Make sure you're logged in** to the dashboard

### Step 2: Open Browser Console
- **Windows/Linux:** Press `F12` or `Ctrl + Shift + J`
- **Mac:** Press `Cmd + Option + J`

### Step 3: Copy and Paste This Code

```javascript
// Test Email Sender - Run in Browser Console
(async function sendTestEmail() {
  console.log('🚀 Starting test email send...\n');

  try {
    // Get Supabase client from window (it should be available in the dashboard)
    const supabase = window.supabase || (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')).createClient(
      window.location.origin.includes('localhost') ? 'YOUR_SUPABASE_URL' : import.meta.env?.VITE_SUPABASE_URL,
      window.location.origin.includes('localhost') ? 'YOUR_SUPABASE_ANON_KEY' : import.meta.env?.VITE_SUPABASE_ANON_KEY
    );
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('❌ Not authenticated. Please log in to the dashboard first.');
    }
    
    console.log(`✅ Authenticated as: ${user.email}\n`);

    // Prepare test email data
    const testEmailData = {
      to: 'wadud.shuvro@sjinnovation.com',
      subject: '🧪 Test Email from SJ BD Dashboard - Automation Verification',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0070f3;">✅ Email Automation System Test</h2>
          
          <p>Hello <strong>Wadud Shuvro</strong>!</p>
          
          <p>This is a test email to verify that the email automation system is working correctly.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Test Details:</strong></p>
            <ul style="margin: 10px 0;">
              <li><strong>Date & Time:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>System:</strong> SJ BD Dashboard</li>
              <li><strong>Purpose:</strong> Automation System Verification</li>
              <li><strong>Sent By:</strong> ${user.email}</li>
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
        </div>
      `,
      contactId: user.id, // Using user ID as dummy contact for test
      campaignId: user.id, // Using user ID as dummy campaign for test
    };

    console.log('📧 Sending test email to: wadud.shuvro@sjinnovation.com');
    console.log('📝 Subject:', testEmailData.subject);
    console.log('⏳ Please wait...\n');

    // Call the send-campaign-email edge function
    const { data, error } = await supabase.functions.invoke('send-campaign-email', {
      body: testEmailData
    });

    if (error) {
      throw error;
    }

    console.log('\n✅ ================================');
    console.log('✅  SUCCESS! Email Sent');
    console.log('✅ ================================\n');
    console.log('📬 Email sent to: wadud.shuvro@sjinnovation.com');
    console.log('⏱️  Timeline: Email should arrive within 1-5 minutes');
    console.log('📁 Check inbox and spam folder');
    
    if (data?.messageId) {
      console.log('📝 SendGrid Message ID:', data.messageId);
    }
    
    console.log('\n✨ The email automation system is working correctly!\n');
    
    alert('✅ Success! Test email sent to wadud.shuvro@sjinnovation.com\n\nCheck inbox (and spam folder) in 1-5 minutes.');
    
    return data;

  } catch (error) {
    console.error('\n❌ ================================');
    console.error('❌  ERROR: Failed to send email');
    console.error('❌ ================================\n');
    console.error('Error message:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Make sure you\'re logged into the dashboard');
    console.error('  2. Verify SendGrid API key is configured in Supabase');
    console.error('  3. Check that send-campaign-email function is deployed');
    console.error('  4. Review Supabase function logs for details\n');
    console.error('Full error:', error);
    
    alert('❌ Error: ' + error.message + '\n\nCheck browser console for details.');
    
    throw error;
  }
})();
```

### Step 4: Press Enter
The script will automatically run and send a test email.

### Step 5: Check Results
- ✅ If successful: You'll see a success message in the console
- ❌ If error: Check the console for error details
- 📧 Check your inbox at wadud.shuvro@sjinnovation.com (and spam folder)

---

## 🎯 Alternative Method 1: Using Email Diagnostics UI

### Step 1: Navigate to Sequences Page
1. Go to the dashboard
2. Click on **"Sequences"** in the sidebar
3. Click on the **"Email Diagnostics"** tab

### Step 2: Run Diagnostics
1. Enter `wadud.shuvro@sjinnovation.com` in the test email field
2. Click **"Run Email Diagnostics"**
3. Wait 30 seconds
4. Check the results on screen
5. Check your email inbox

---

## 🧪 Alternative Method 2: Using Test HTML File

### Step 1: Open the Test File
1. Open `test-email-sender.html` in your browser
2. OR navigate to: `http://localhost:5173/test-email-sender.html` (if served)

### Step 2: Update Configuration (if needed)
- The file is pre-filled with wadud.shuvro@sjinnovation.com
- Subject and body are pre-configured

### Step 3: Send
1. Click the **"Send Test Email"** button
2. Wait for confirmation
3. Check email inbox

---

## 🔍 Troubleshooting

### Problem: "Not authenticated" error
**Solution:** 
- Make sure you're logged into the dashboard
- Refresh the page and try again

### Problem: "SendGrid API key not configured"
**Solution:**
1. Go to Supabase Dashboard
2. Project Settings → Edge Functions
3. Add environment variable: `SENDGRID_API_KEY`
4. Get key from: https://sendgrid.com → Settings → API Keys

### Problem: "Function not found" error
**Solution:**
1. Deploy the function:
   ```bash
   supabase functions deploy send-campaign-email
   ```
2. Verify in Supabase Dashboard → Edge Functions

### Problem: Email not received
**Possible causes:**
1. **Spam folder** - Check spam/junk
2. **SendGrid sender verification** - Verify bd@sjinnovation.com in SendGrid
3. **SendGrid limits** - Check if on free tier and reached limits
4. **Email typo** - Verify the email address is correct
5. **Delivery delay** - Wait up to 15 minutes

---

## 📊 Expected Timeline

1. **Script execution:** Instant (< 1 second)
2. **SendGrid processing:** 1-5 seconds
3. **Email delivery:** 10 seconds - 5 minutes (typically < 1 minute)
4. **Total time:** Usually within 1-2 minutes

---

## ✅ Success Indicators

### In Browser Console:
```
✅ ================================
✅  SUCCESS! Email Sent
✅ ================================

📬 Email sent to: wadud.shuvro@sjinnovation.com
⏱️  Timeline: Email should arrive within 1-5 minutes
📁 Check inbox and spam folder
📝 SendGrid Message ID: ABC123XYZ
```

### In Email Inbox:
- **From:** bd@sjinnovation.com
- **Subject:** 🧪 Test Email from SJ BD Dashboard - Automation Verification
- **Content:** Formatted HTML email with test details

---

## 🎯 What This Test Proves

If you receive the email successfully:
- ✅ Supabase functions are deployed and working
- ✅ SendGrid is properly configured
- ✅ Email delivery pipeline is operational
- ✅ You can now use the automation system to enroll contacts

---

## 📞 Need Help?

1. **Check Supabase Function Logs:**
   - Supabase Dashboard → Edge Functions → send-campaign-email → Logs

2. **Check SendGrid Activity:**
   - SendGrid Dashboard → Activity Feed
   - Search for: wadud.shuvro@sjinnovation.com

3. **Run Email Diagnostics:**
   - Dashboard → Sequences → Email Diagnostics → Run Diagnostics

---

## 🚀 After Successful Test

Once the test email is working:

1. **Create a Campaign** (if not exists)
2. **Add Wadud Shuvro as a contact**
3. **Create a Sequence** (set to Active)
4. **Create an Email Template**
5. **Enroll the contact** using "Add to Automation"
6. **Choose scheduling mode:**
   - **Immediate:** Sends within 5 minutes
   - **Scheduled:** Sends at specific time
   - **Drip:** Sends in batches (recommended)

The automation system is now ready to use! 🎉

---

**Last Updated:** ${new Date().toISOString()}





