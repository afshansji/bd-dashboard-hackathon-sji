-- Add missing columns to gemini_videos table for Veo 3 support
ALTER TABLE gemini_videos 
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9',
  ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT '720p',
  ADD COLUMN IF NOT EXISTS negative_prompt TEXT,
  ADD COLUMN IF NOT EXISTS has_audio BOOLEAN DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_gemini_videos_user_status ON gemini_videos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_gemini_videos_created_at ON gemini_videos(created_at DESC);