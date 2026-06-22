-- Add campaign_id column to project_tasks table
-- This allows tasks to be optionally associated with campaigns
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.bd_campaigns(id) ON DELETE SET NULL;

-- Add index for performance when querying tasks by campaign
CREATE INDEX IF NOT EXISTS idx_project_tasks_campaign_id
ON public.project_tasks(campaign_id);

-- Add comment for documentation
COMMENT ON COLUMN public.project_tasks.campaign_id IS
'Optional foreign key to bd_campaigns - allows tasks to be associated with a campaign';

-- Add campaign_objective column to bd_campaigns table
-- This stores the campaign story/narrative with rich text content
ALTER TABLE public.bd_campaigns
ADD COLUMN IF NOT EXISTS campaign_objective TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.bd_campaigns.campaign_objective IS
'Campaign story/narrative describing goals, target audience, and strategy (supports rich text HTML)';

-- Add category column to project_tasks table
-- Categories: Ideas, Discussion, Work, Other
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('ideas', 'discussion', 'work', 'other')) DEFAULT 'work';

-- Add index for performance when filtering by category
CREATE INDEX IF NOT EXISTS idx_project_tasks_category
ON public.project_tasks(category);

-- Add comment for documentation
COMMENT ON COLUMN public.project_tasks.category IS
'Task category: ideas (brainstorming), discussion (team alignment), work (execution), other (miscellaneous)';