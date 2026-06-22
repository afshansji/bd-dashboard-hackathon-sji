-- Add missing team members to employees table for Deal Owner/PM dropdowns
INSERT INTO employees (control_tower_id, full_name, email, synced_from_control_tower, last_synced_at)
VALUES 
  ('manual-george-baroi', 'George Baroi', 'george.baroi@sjinnovation.com', false, now()),
  ('manual-madhav-ranganekar', 'Madhav Ranganekar', 'madhav.ranganekar@sjinnovation.com', false, now()),
  ('manual-zubair-hossain', 'Zubair Hossain', 'zubair.hossain@sjinnovation.com', false, now()),
  ('manual-sayeed-ahmed', 'Sayeed Ahmed', 'sayeed.ahmed@sjinnovation.com', false, now()),
  ('manual-ketan-kamat', 'Ketan Kamat', 'ketan.kamat@sjinnovation.com', false, now()),
  ('manual-jairaj-lotlikar', 'Jairaj Lotlikar', 'jairaj.lotlikar@sjinnovation.com', false, now())
ON CONFLICT (control_tower_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  last_synced_at = now();

