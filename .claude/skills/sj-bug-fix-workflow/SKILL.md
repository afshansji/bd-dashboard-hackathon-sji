---
name: sj-bug-fix-workflow
description: "Follow this 8-step process for EVERY bug fix. No shortcuts. Ensures bugs are properly diagnosed, fixed, and documented."
---

# SJ Innovation Bug Fix Workflow

Follow these 8 steps for EVERY bug fix. No shortcuts. Skipping steps leads to incomplete fixes and regressions.

## Step 1: Reproduce

Before touching any code, reproduce the exact bug.

**Document:**
- Exact steps to trigger the bug (numbered list)
- Browser and version (if frontend)
- User role (team_member, manager, admin, super_admin)
- Data state (what records exist, what's selected)
- Expected behavior vs actual behavior
- Error messages (console, network tab, Supabase logs)
- Screenshot or recording if visual

**If you can't reproduce it, don't fix it.** Ask for more information.

## Step 2: Isolate

Determine where the bug lives:

| Layer | Symptoms | How to Check |
|-------|----------|-------------|
| **Frontend (React)** | UI doesn't render, wrong data displayed, click doesn't work | Browser console, React DevTools |
| **State (TanStack Query)** | Stale data, doesn't update after mutation, loading forever | Check query keys, invalidation, cache |
| **API (Hooks/Edge Functions)** | Network errors, wrong response, timeout | Network tab, Edge Function logs |
| **Database (Supabase)** | Empty results, permission denied, constraint violation | Supabase dashboard, SQL editor |
| **Integration** | External service fails | Check credentials, API status, logs |

**Ask yourself:** "If I make the API return the correct data, does the UI work?" If yes, the bug is in the backend. If no, it's in the frontend.

## Step 3: Read the Error

Parse the actual error message. Don't skip this.

### React Errors
- `Cannot read properties of undefined` → Missing null check, data not loaded
- `Too many re-renders` → State update in render body, missing deps in useEffect
- `Invalid hook call` → Hook called conditionally or in wrong order
- `Objects are not valid as a React child` → Trying to render an object instead of string

### Supabase Error Codes
- `PGRST116` → No rows returned (RLS blocking or record doesn't exist)
- `PGRST301` → JWT expired (session needs refresh)
- `42501` → Permission denied (RLS policy violation)
- `23505` → Unique constraint violation (duplicate data)
- `23503` → Foreign key violation (referenced record missing)
- `42P01` → Table doesn't exist (migration not applied)
- `PGRST204` → Column not found (schema mismatch)

### Network Errors
- `401` → Authentication failed (token expired/invalid)
- `403` → Authorization failed (role insufficient)
- `404` → Endpoint not found (wrong URL or function name)
- `422` → Validation error (wrong request body)
- `500` → Server error (check Edge Function logs)
- `504` → Timeout (function took too long)

## Step 4: Root Cause

Find the ACTUAL cause. Don't fix symptoms.

### Common Root Causes in This Project

1. **RLS Policy Missing/Wrong**
   - Check: `supabase/migrations/` for the table's policies
   - Verify: User's role in `user_roles` table
   - Test: Query as service role vs user role

2. **Hook Dependency Stale**
   - Check: `useEffect`/`useMemo`/`useCallback` dependency arrays
   - Verify: Dependencies include all referenced variables
   - Watch for: Object/array deps that change reference every render

3. **Race Condition**
   - Check: Multiple simultaneous mutations or subscriptions
   - Verify: Order of operations is deterministic
   - Common in: Realtime subscriptions (sequences), parallel mutations

4. **Type Mismatch**
   - Check: `src/integrations/supabase/types.ts` for actual types
   - Verify: Component expects same shape as hook returns
   - Common: UUID string vs object, null vs undefined

5. **Null Check Missing**
   - Check: Optional chaining on all Supabase results
   - Verify: `data?.property` not `data.property`
   - Note: `strictNullChecks: false` means TS won't warn you

6. **Query Key Wrong**
   - Check: Query key includes all parameters that affect the query
   - Verify: Mutation invalidates the correct query key
   - Common: Missing ID in query key, wrong key string

7. **Environment Variable Missing**
   - Check: `.env` file has required vars
   - Verify: `VITE_` prefix for frontend vars
   - Edge Functions: Check Supabase dashboard env config

8. **Migration Not Applied**
   - Check: Table/column exists in Supabase dashboard
   - Verify: Latest migrations are deployed
   - Fix: Apply missing migration

## Step 5: Write a Failing Test (If Testable)

If the bug is in a hook or utility function, write a test that reproduces it:

```typescript
// tests/bugfix-[description].test.ts
import { describe, it, expect } from 'bun:test';

describe('Bug: [description]', () => {
  it('should [expected behavior]', () => {
    // Arrange: set up the conditions that trigger the bug
    // Act: perform the action
    // Assert: verify the correct behavior
  });
});
```

Run with: `npm run test`

Skip this step if the bug is purely visual or in an Edge Function that can't be unit tested.

## Step 6: Fix

Apply the **minimal change** that fixes the root cause.

### Rules
- Change ONLY what's broken
- Don't refactor adjacent code
- Don't add features
- Don't "improve" things while you're in there
- Don't change formatting of unchanged lines
- If you need to change > 20 lines, reconsider your approach

### After fixing
- Verify TypeScript compiles: `npx tsc --noEmit`
- Verify lint passes: `npm run lint`
- Verify tests pass: `npm run test`

## Step 7: Verify

Test the fix thoroughly:

### Verification Checklist
- [ ] Original bug no longer reproduces (exact same steps from Step 1)
- [ ] No regressions in related features
- [ ] Works with user role: team_member
- [ ] Works with user role: manager
- [ ] Works with user role: admin (if applicable)
- [ ] Loading state still works
- [ ] Error state still works
- [ ] Empty state still works
- [ ] Browser console has no new errors
- [ ] Network tab shows correct requests/responses

### Side Effect Check
If you changed:
- A hook → Check all components that use it
- A database table → Check all hooks that query it
- An Edge Function → Check all hooks that call it
- A shared utility → Check all files that import it
- RLS policies → Check access from all roles

## Step 8: Document

Write a clear commit message and, for significant bugs, add a note.

### Commit Message Format
```
fix: [what was fixed]

Root cause: [why it was broken]
Fix: [what was changed and why]
```

### For Significant Bugs
Add a brief note to the relevant spec or CLAUDE.md:
```markdown
### Known Issues (Resolved)
- **[Date]**: [Bug description]. Root cause: [explanation]. Fixed in [commit/PR].
```

## Anti-Patterns (Don't Do These)

1. **"Shotgun debugging"** - Changing random things until it works. Follow the steps.
2. **"Works on my machine"** - Test with the same role, data, and browser as the reporter.
3. **"While I'm here..."** - Don't refactor, add features, or clean up during a bug fix.
4. **"Just add a try-catch"** - Swallowing errors hides bugs. Find the root cause.
5. **"Reset the cache"** - If clearing cache "fixes" it, the cache invalidation is the bug.
6. **"Add a setTimeout"** - Timing hacks hide race conditions. Fix the race condition.
7. **"Skip the test"** - If you can't test it, document WHY in the commit message.
