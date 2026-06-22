# How to Check/Add SendGrid Configuration

## 🔍 Check if SendGrid is Configured

### Method 1: Via Dashboard Diagnostic Tool
1. Go to: `http://localhost:5173/sequences`
2. Click tab: **"Email Diagnostics"**
3. Click: **"Run Email Diagnostics"**
4. Look for: SendGrid configuration check

### Method 2: Via Supabase Dashboard
1. Open: https://supabase.com
2. Select your project
3. Go to: **Project Settings** (⚙️ icon bottom left)
4. Click: **Edge Functions**
5. Scroll to: **Environment Variables**
6. Look for: `SENDGRID_API_KEY`

---

## ❌ If SendGrid API Key is NOT Configured

You need to add it:

### Step 1: Get SendGrid API Key

1. Go to: https://sendgrid.com
2. **Sign up** or **Login**
3. Click: **Settings** → **API Keys**
4. Click: **Create API Key**
5. Name: `SJ-BD-Dashboard`
6. Permissions: **Full Access** (or minimum: Mail Send)
7. Click: **Create & View**
8. **Copy the key** (starts with `SG.`)
   ⚠️ **Important:** Save it now! You can't see it again

### Step 2: Add to Supabase

1. Go to: Supabase Dashboard → Your Project
2. Click: **Project Settings** (⚙️)
3. Click: **Edge Functions**
4. Scroll to: **Environment Variables**
5. Click: **Add Variable**
6. Name: `SENDGRID_API_KEY`
7. Value: Paste the key (e.g., `SG.xxxxxxxxxxxxx`)
8. Click: **Save**

### Step 3: Redeploy Functions

After adding the key, redeploy the email function:

```bash
supabase functions deploy send-campaign-email
```

OR if you don't have Supabase CLI:
1. Supabase Dashboard → Edge Functions
2. Click `send-campaign-email`
3. Click **Deploy** or **Redeploy**

### Step 4: Test Again

Run the browser console test again.

---

## ✅ If SendGrid IS Configured

But still not receiving emails, check:

### 1. Verify Sender Email in SendGrid

1. Go to: SendGrid Dashboard
2. Click: **Settings** → **Sender Authentication**
3. Option A: **Verify Single Sender**
   - Add: `bd@sjinnovation.com`
   - Verify via email
4. Option B: **Authenticate Domain** (better)
   - Add: `sjinnovation.com`
   - Follow DNS setup instructions

⚠️ **Without sender verification, emails may not be delivered or go to spam**

### 2. Check SendGrid Activity

1. Go to: https://app.sendgrid.com
2. Click: **Activity Feed**
3. Search: `wadud.shuvro@sjinnovation.com`
4. Check status:
   - ✅ **Delivered** → Check spam folder
   - ⏳ **Processed** → Wait a bit longer
   - ❌ **Bounced** → Email address issue
   - 🚫 **Dropped** → SendGrid blocked it

### 3. Check Supabase Function Logs

1. Supabase Dashboard → **Edge Functions**
2. Click: `send-campaign-email`
3. Click: **Logs** tab
4. Look for recent calls
5. Check for errors

---

## 🧪 Alternative: Use Free SendGrid Trial

If you don't have SendGrid account:

1. **Free tier:** 100 emails/day forever
2. **No credit card required** for signup
3. **Takes 5 minutes** to setup

---

## 📞 Need Help?

Tell me what you see:
- ❓ **"SendGrid API key not configured"** → Follow Step 1 above
- ❓ **"Email sent successfully"** but not in inbox → Check spam, verify sender
- ❓ **Other error** → Tell me the exact error message

---

## ✅ Success Checklist

- [ ] SendGrid account created
- [ ] API key generated
- [ ] API key added to Supabase environment variables
- [ ] Functions redeployed
- [ ] Sender email verified (bd@sjinnovation.com)
- [ ] Test email sent successfully
- [ ] Email received in inbox

---

Once all items are checked, the system will work! ✨





