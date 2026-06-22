-- Create user mappings table for Control Tower to local user mapping
CREATE TABLE IF NOT EXISTS control_tower_user_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_tower_user_id text NOT NULL,
  control_tower_email text NOT NULL,
  control_tower_name text,
  local_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(control_tower_user_id),
  UNIQUE(control_tower_email)
);

-- Enable RLS
ALTER TABLE control_tower_user_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view user mappings"
  ON control_tower_user_mappings FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage user mappings"
  ON control_tower_user_mappings FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ct_user_mappings_ct_id 
  ON control_tower_user_mappings(control_tower_user_id);
CREATE INDEX IF NOT EXISTS idx_ct_user_mappings_email 
  ON control_tower_user_mappings(control_tower_email);
CREATE INDEX IF NOT EXISTS idx_ct_user_mappings_local_id 
  ON control_tower_user_mappings(local_user_id);

-- Add updated_at trigger
CREATE TRIGGER update_ct_user_mappings_updated_at
  BEFORE UPDATE ON control_tower_user_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();