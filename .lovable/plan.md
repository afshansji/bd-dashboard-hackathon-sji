

# Fix Profile Identity Mismatch + Multi-Role & Pod Membership

## Problem Summary

1. **Profiles table has swapped IDs** — The `profiles` and `user_roles` records were seeded with IDs that don't match `auth.users`. When Paresh logs in (auth ID `de546d22`), the system fetches Abu's profile (which was incorrectly assigned ID `de546d22` in profiles).

   | User | auth.users ID | profiles ID (WRONG) |
   |---|---|---|
   | Paresh (`paresh@sjinnovation.com`) | `de546d22...` | `02d94b42...` |
   | Abu (`abu.hurayra@sjinnovation.com`) | `02d94b42...` | `de546d22...` |

2. **`user_roles` has a UNIQUE(user_id) constraint** — prevents multiple roles per user. The constraint needs to change to UNIQUE(user_id, role).

3. **No pod membership table exists** — users cannot belong to pods/teams.

## Plan

### Step 1: Fix Profile ID Mismatch (Data Fix)

Swap the profiles to match auth.users:
- UPDATE profile `de546d22` → set email=`paresh@sjinnovation.com`, full_name=`Paresh Sharma`
- UPDATE profile `02d94b42` → set email=`abu.hurayra@sjinnovation.com`, full_name=`Abu Hurayra`

Also fix `user_roles` assignments:
- `de546d22` (Paresh) → `super_admin`
- `02d94b42` (Abu) → `admin`

And fix the `users` table similarly.

### Step 2: Allow Multiple Roles (Schema Migration)

- Drop the `user_roles_user_id_unique` constraint
- Add a new `UNIQUE(user_id, role)` constraint (already defined conceptually but the current DB only has `UNIQUE(user_id)`)
- This allows one user to hold multiple roles (e.g., both `admin` and `project_manager`)

### Step 3: Create Pod Members Table (Schema Migration)

```sql
CREATE TABLE public.pod_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',  -- member, lead, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pod_id, user_id)
);
```

With RLS policies (authenticated can view, owner+manager can manage), indexes, and updated_at trigger.

### Step 4: Update useAuth to Support Multiple Roles

Modify `fetchUserProfile` in `src/hooks/useAuth.tsx` to:
- Fetch **all** roles for the user (not just one via `.limit(1).maybeSingle()`)
- Store roles as an array in the User interface: `roles: UserRole[]`
- Keep `role` as the highest-privilege role for backward compatibility
- Update `hasRole()` to check against the roles array
- Update `hasMinimumRole()` to use the highest role from the array

### Step 5: Seed Pod Memberships

Insert pod_members records linking existing users to seeded pods.

### Step 6: Update ProtectedRoute

Update the role check in `ProtectedRoute.tsx` to work with the new multi-role user structure from useAuth.

### Technical Details

**Files to modify:**
- `src/hooks/useAuth.tsx` — Multi-role support, User interface update
- `src/components/ProtectedRoute.tsx` — Use `roles` array
- `src/components/ProfileDropdown.tsx` — Display primary role or multiple roles

**Database operations:**
- UPDATE `profiles` (fix 2 records)
- UPDATE `user_roles` (fix 2 records)
- UPDATE `users` (fix 2 records)
- Migration: ALTER `user_roles` constraint from UNIQUE(user_id) to UNIQUE(user_id, role)
- Migration: CREATE TABLE `pod_members`
- INSERT seed data into `pod_members`

