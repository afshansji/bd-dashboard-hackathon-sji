# LinkedIn Message Templates with Placeholders

## 📋 **Requirement**

The AI should generate LinkedIn message **TEMPLATES** with placeholders like `{{contact_data.contact_name}}` so users can copy-paste them into systems that will replace the placeholders with actual values later.

---

## ✅ **Expected Output**

**Correct:**
```
Hi {{contact_data.contact_name}}, I'm impressed by your work at {{contact_data.current_employer}} in {{contact_data.industry_focus}}. Let's connect!
```

**NOT:**
```
Hi Ben, I'm impressed by your work at Premier Home Solutions in Investment space. Let's connect!
```

---

## 🔧 **Solution**

### **Database Migration**

**File:** `supabase/migrations/20251201000001_linkedin_messages_with_placeholders.sql`

**What it does:**
- Updates the LinkedIn message generator's prompt template
- Instructs the AI to generate messages WITH placeholders
- Provides clear examples of the expected format
- Emphasizes using `{{contact_data.xxx}}` format

---

## 🚀 **Deployment**

### **Run this SQL in Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Click "New Query"
5. Copy and paste the SQL from:
   ```
   sj-bd-dashboard/supabase/migrations/20251201000001_linkedin_messages_with_placeholders.sql
   ```
6. Click "RUN"
7. Verify: ✅ "Success. 1 row updated"

---

## 📝 **Available Placeholders**

The AI will use these placeholders in generated messages:

### **Contact Data:**
- `{{contact_data.contact_name}}` - Contact's name
- `{{contact_data.current_employer}}` - Current company
- `{{contact_data.current_position_title}}` - Job title
- `{{contact_data.industry_focus}}` - Industry/sector
- `{{contact_data.linkedin_headline}}` - LinkedIn headline
- `{{contact_data.linkedin_location}}` - Location

### **Campaign Context:**
- `{{campaign_context.campaign_name}}` - Campaign name
- `{{campaign_context.campaign_type}}` - Campaign type

### **Company Context:**
- `{{company_context.company_name}}` - Company name
- `{{company_context.company_industry}}` - Company industry

---

## 🧪 **Testing**

1. Open any contact in campaign detail
2. Click "Generate LinkedIn Messages"
3. Check that messages contain placeholders like `{{contact_data.contact_name}}`
4. Verify NO actual values appear (no "Ben", "Premier Home Solutions", etc.)

---

## ✅ **Success Criteria**

- ✅ Messages contain `{{contact_data.xxx}}` placeholders
- ✅ NO actual contact names or companies in messages
- ✅ Messages are still contextually relevant
- ✅ Character limits still enforced (200/500)
- ✅ Ready to copy-paste into your system

---

## 📊 **Example Messages**

### **Connection Request:**
```
Hi {{contact_data.contact_name}}, impressed by your work at {{contact_data.current_employer}}. Let's connect!
```

### **Follow-up:**
```
Hi {{contact_data.contact_name}}, I noticed your expertise in {{contact_data.industry_focus}} at {{contact_data.current_employer}}. I'd love to discuss how we can collaborate. Are you available for a quick call this week?
```

---

## 🎯 **Why Placeholders?**

Placeholders allow you to:
1. ✅ Copy-paste messages into your CRM/automation system
2. ✅ Batch process multiple contacts
3. ✅ Maintain consistent message templates
4. ✅ Let your system handle the actual value replacement

---

## 🚀 **Ready to Deploy!**

Run the SQL migration in Supabase Dashboard and your AI will start generating messages with placeholders!









