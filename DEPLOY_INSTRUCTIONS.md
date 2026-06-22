# Deployment Instructions - Usage Analytics

## Database Migration (Manual)
Run the following migration manually in Supabase Dashboard > SQL Editor:

- `supabase/migrations/20260206120000_add_user_activity_log.sql`

### Verification
After running the migration, verify:

```sql
select column_name from information_schema.columns
where table_name = 'profiles' and column_name in ('last_login', 'last_seen', 'login_count');

select count(*) from information_schema.tables
where table_name = 'user_activity_log';
```

### Rollback
```sql
drop table if exists public.user_activity_log;
alter table public.profiles
  drop column if exists last_login,
  drop column if exists last_seen,
  drop column if exists login_count;
```

## Frontend
No special deployment steps beyond the normal app deploy.
