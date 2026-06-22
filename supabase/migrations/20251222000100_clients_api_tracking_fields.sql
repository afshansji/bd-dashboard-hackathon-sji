-- Migration: Add Control Tower REST API Tracking Fields to Clients Table
-- This migration adds fields to track which clients were synced via the REST API
-- and their corresponding Control Tower client IDs.

-- Add API tracking columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS control_tower_client_id TEXT,
ADD COLUMN IF NOT EXISTS synced_from_control_tower_api BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_api_sync_at TIMESTAMPTZ;

-- Create index for faster lookups by Control Tower client ID
CREATE INDEX IF NOT EXISTS idx_clients_ct_api_id
ON public.clients(control_tower_client_id);

-- Create index for filtering synced clients
CREATE INDEX IF NOT EXISTS idx_clients_synced_from_api
ON public.clients(synced_from_control_tower_api)
WHERE synced_from_control_tower_api = TRUE;

-- Add unique constraint to prevent duplicate Control Tower clients
-- Note: This is a partial unique constraint that only applies when control_tower_client_id is NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS unique_control_tower_client_id
ON public.clients(control_tower_client_id)
WHERE control_tower_client_id IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN public.clients.control_tower_client_id IS
'The ID of this client in the Control Tower system (via REST API). Used to track sync status and prevent duplicates.';

COMMENT ON COLUMN public.clients.synced_from_control_tower_api IS
'Indicates whether this client was synced from Control Tower REST API (true) or created locally/via direct Supabase (false).';

COMMENT ON COLUMN public.clients.last_api_sync_at IS
'Timestamp of the last successful sync from Control Tower REST API. NULL if never synced or created locally.';
