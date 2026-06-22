# 📧 Quick Start: Test Email to wadud.shuvro@sjinnovation.com

## 🚀 Fastest Way (30 seconds)

### Browser Console Method

1. **Open dashboard:** `http://localhost:5173`
2. **Login** to the dashboard
3. **Press F12** (or Cmd+Option+J on Mac)
4. **Copy this code:**

```javascript
(async function() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Please login first');
  
  const { data, error } = await supabase.functions.invoke('send-campaign-email', {
    body: {
      to: 'wadud.shuvro@sjinnovation.com',
      subject: '🧪 Test Email from SJ BD Dashboard',
      body: '<h2>Test Email</h2><p>This email confirms the automation system is working!</p><p>Sent at: ' + new Date().toLocaleString() + '</p>',
      contactId: user.id,
      campaignId: user.id
    }
  });
  
  if (error) {
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
  } else {
    console.log('✅ Success:', data);
    alert('✅ Email sent! Check inbox in 1-2 minutes.');
  }
})();
```

5. **Paste** in console and press **Enter**
6. **Check inbox** at wadud.shuvro@sjinnovation.com (and spam folder)

---

## 🎯 Alternative: Use Test Page UI

1. **Navigate to:** `http://localhost:5173/test-email`
2. **Email is pre-filled** with wadud.shuvro@sjinnovation.com
3. **Click:** "Send Test Email"
4. **Check inbox** in 1-2 minutes

✅ **Test page route added to App.tsx**

---

## 🔧 If Test Fails

### Check 1: Are you logged in?
```
Make sure you're logged into the dashboard first
```

### Check 2: Is SendGrid configured?
```
Supabase Dashboard → Project Settings → Edge Functions → Environment Variables
Add: SENDGRID_API_KEY=SG.xxxxx
```

### Check 3: Are functions deployed?
```bash
supabase functions deploy send-campaign-email
```

### Check 4: Check Supabase logs
```
Supabase Dashboard → Edge Functions → send-campaign-email → Logs
```

---

## 📚 Complete Documentation

For complete troubleshooting and automation flow:
- **EMAIL_AUTOMATION_ISSUE_RESOLUTION.md** - Complete guide
- **SEND_TEST_EMAIL_INSTRUCTIONS.md** - Detailed instructions
- **diagnose-automation-issue.sql** - SQL diagnostic queries
- **EMAIL_AUTOMATION_FLOW.md** - How the system works

---

## ✅ Success Indicators

You'll know it worked when:
- ✅ Console shows: "✅ Email sent!"
- ✅ Alert says: "Email sent! Check inbox in 1-2 minutes"
- ✅ Email arrives at wadud.shuvro@sjinnovation.com within 1-5 minutes
- ✅ From: bd@sjinnovation.com
- ✅ Subject: 🧪 Test Email from SJ BD Dashboard

---

## 🎉 What's Next?

Once test email works:

1. **Add contacts** to campaigns
2. **Create sequences** (set to Active)
3. **Enroll contacts** using "Add to Automation"
4. **Monitor progress** in Sequences → Execution Dashboard

The automation system is ready! 🚀

---

**Created for:** Wadud Shuvro  
**Email:** wadud.shuvro@sjinnovation.com  
**System:** SJ BD Dashboard Email Automation





