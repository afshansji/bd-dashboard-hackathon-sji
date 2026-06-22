-- Add AI Solutions as a new target niche
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

