# ⚡ Zerobounce Local - Quick Fix

## Error: "Edge Function returned a non-2xx status code"

---

## 🎯 90% Chance: Missing Super Admin Role

### Fix in 2 Minutes:

**1. Open Supabase Studio**: http://localhost:54323

**2. Click "SQL Editor"** (left sidebar)

**3. Run this SQL**:

```sql
-- Grant super_admin to all local users
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
```

**4. LOGOUT and LOGIN** in your app

**5. Try "Save and Connect"** again

✅ **Should work now!**

---

## Still Failing? Get Details:

### Open Browser Console (F12):

1. Press **F12** → **Network** tab
2. Click "Save and Connect"
3. Find `zerobounce-manage` request
4. Click **Response** tab
5. Read the error

### Common Errors:

| Error | Fix |
|-------|-----|
| `"Super admin access required"` | Grant role above, then **logout/login** |
| `"API key required"` | Make sure you entered the API key |
| `"Connection test failed"` | Test API key at https://api.zerobounce.net/v2/getcredits?api_key=YOUR_KEY |
| `"Zerobounce not configured"` | Run `npx supabase db reset` |

---

## Diagnostic Scripts:

Run these in Supabase Studio SQL Editor:

| Script | What it does |
|--------|--------------|
| `diagnose-local-zerobounce.sql` | Shows exactly what's wrong |
| `fix-local-super-admin.sql` | Grants super_admin role automatically |

---

## Full Setup Guide:

See `START_LOCAL_ZEROBOUNCE.md` for complete step-by-step instructions.

---

## Need More Help?

**Check browser console** (F12) for the exact error, then:

- See `LOCAL_ZEROBOUNCE_DEBUG.md` for detailed troubleshooting
- Run `diagnose-local-zerobounce.sql` to identify the issue
- Check edge function terminal logs

---

**Most Common Fix**: Grant super_admin + logout/login = **FIXED** ✅

