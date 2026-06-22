-- Add mentioned users and emails columns to deal_comments
ALTER TABLE deal_comments 
ADD COLUMN IF NOT EXISTS mentioned_users text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mentioned_user_emails text[] DEFAULT '{}';

-- Add helpful comments
COMMENT ON COLUMN deal_comments.mentioned_users IS 'Array of user IDs mentioned in the comment using @ syntax';
COMMENT ON COLUMN deal_comments.mentioned_user_emails IS 'Array of emails of users mentioned in the comment';

-- Create index for better query performance when searching by mentions
CREATE INDEX IF NOT EXISTS idx_deal_comments_mentioned_users ON deal_comments USING GIN (mentioned_users);