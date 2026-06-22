-- Drop CollabAI tables in correct order (respecting foreign keys)

-- First drop tables that reference other CollabAI tables
DROP TABLE IF EXISTS public.collabai_messages CASCADE;
DROP TABLE IF EXISTS public.collabai_conversations CASCADE;
DROP TABLE IF EXISTS public.collabai_agents CASCADE;

-- Finally drop the parent table
DROP TABLE IF EXISTS public.collabai_integrations CASCADE;