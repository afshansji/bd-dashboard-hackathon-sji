-- Drop old permissive policies for target_niches
DROP POLICY IF EXISTS "Authenticated users can create niches" ON target_niches;
DROP POLICY IF EXISTS "Users can update own niches or admins can update all" ON target_niches;
DROP POLICY IF EXISTS "Users can delete own niches or admins can delete all" ON target_niches;

-- Create new admin-only management policy for target_niches
CREATE POLICY "Admins can manage niches"
ON target_niches
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);