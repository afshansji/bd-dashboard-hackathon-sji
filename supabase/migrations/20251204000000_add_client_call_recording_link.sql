-- Add client_call_recording_link column to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_call_recording_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN deals.client_call_recording_link IS 'URL link to the client call recording';





