# Edge Function Deployment - Usage Analytics

## Functions to Deploy
- `user-activity-stats`
- `notify-low-usage`

## Commands
Replace `your-project-ref` with the Supabase project ref.

```bash
supabase functions deploy user-activity-stats --project-ref your-project-ref
supabase functions deploy notify-low-usage --project-ref your-project-ref
```

## Environment Variables
No new environment variables required. Functions use:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Verification
- Call `user-activity-stats` from the admin UI.
- Confirm Team Stats list shows activity scores and search works.
- Trigger `notify-low-usage` from the admin UI button and verify notifications are created.
