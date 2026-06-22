-- Create gemini_videos table for persistent storage
CREATE TABLE IF NOT EXISTS public.gemini_videos (
  id TEXT PRIMARY KEY,
  operation_name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  duration INTEGER,
  status TEXT NOT NULL DEFAULT 'processing',
  video_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_status CHECK (status IN ('processing', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE public.gemini_videos ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own videos
CREATE POLICY "Users can view their own videos"
  ON public.gemini_videos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
  ON public.gemini_videos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.gemini_videos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON public.gemini_videos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_gemini_videos_user_id ON public.gemini_videos(user_id);
CREATE INDEX idx_gemini_videos_status ON public.gemini_videos(status);