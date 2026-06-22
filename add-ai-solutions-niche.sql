-- Run this SQL in your Supabase SQL Editor to add AI Solutions niche
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste and Run

INSERT INTO public.target_niches (
  name,
  description,
  status,
  priority,
  services,
  industries
) VALUES (
  'AI Solutions',
  'Artificial Intelligence and Machine Learning solutions and services',
  'active',
  'high',
  ARRAY['AI Development', 'Machine Learning', 'Natural Language Processing', 'Computer Vision', 'AI Consulting'],
  ARRAY['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing']
)
ON CONFLICT DO NOTHING;

-- Verify it was added
SELECT id, name, status, priority FROM public.target_niches WHERE name = 'AI Solutions';

