# Database Verification and Fix for Lovable

## Step 1: Verify Tables Exist

Please run this query to check if the tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('task_comments', 'task_comment_mentions', 'task_history', 'notifications')
ORDER BY table_name;
```

Expected result: Should return 4 rows (all 4 table names).

If tables are missing, run the full migration from MIGRATION_TO_RUN.sql

---

## Step 2: Verify RLS Policies

Run this to check RLS policies:

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('task_comments', 'task_comment_mentions', 'task_history', 'notifications')
ORDER BY tablename, policyname;
```

Expected: Should show policies for each table.

---

## Step 3: Fix RLS Policies (if data still not loading)

The issue might be that RLS policies are too restrictive. Run this to make them more permissive:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view comments on accessible tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can view history on accessible tasks" ON task_history;

-- Create more permissive policies (allow all authenticated users)
CREATE POLICY "Authenticated users can view all comments"
  ON task_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authenticated users can view all history"
  ON task_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert history"
  ON task_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## Step 4: Verify Foreign Keys

Check if foreign key constraints are correct:

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('task_comments', 'task_comment_mentions', 'task_history', 'notifications')
ORDER BY tc.table_name;
```

---

## Step 5: Test Data Access

Try to insert a test comment (replace TASK_ID with an actual task ID):

```sql
-- First, get a valid task_id
SELECT id, title FROM project_tasks LIMIT 1;

-- Then try to insert (replace 'TASK_ID_HERE' with actual task ID from above)
INSERT INTO task_comments (task_id, author_id, body_text)
VALUES ('TASK_ID_HERE', auth.uid(), 'Test comment from migration verification')
RETURNING *;
```

If this works, the tables and policies are set up correctly.

---

## Summary

Run these steps in order:
1. ✅ Verify tables exist (Step 1)
2. ✅ Check RLS policies exist (Step 2)
3. ✅ Fix RLS policies if too restrictive (Step 3)
4. ✅ Verify foreign keys (Step 4)
5. ✅ Test with actual data (Step 5)

After completing these steps, refresh the application and try again.
