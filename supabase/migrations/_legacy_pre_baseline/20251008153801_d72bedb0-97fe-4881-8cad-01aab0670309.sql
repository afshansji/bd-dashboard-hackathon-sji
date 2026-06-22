-- Create team_eod_submissions table
CREATE TABLE IF NOT EXISTS team_eod_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL,
  task_links TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, submission_date)
);

-- Create activecollab_task_data table
CREATE TABLE IF NOT EXISTS activecollab_task_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_task_id TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_name TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT,
  last_comment TEXT,
  last_comment_date TIMESTAMPTZ,
  hours_logged NUMERIC DEFAULT 0,
  sync_date DATE NOT NULL,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team_daily_summaries table
CREATE TABLE IF NOT EXISTS team_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  ai_summary JSONB NOT NULL DEFAULT '{}',
  tasks_completed INTEGER DEFAULT 0,
  hours_logged NUMERIC DEFAULT 0,
  productivity_score NUMERIC,
  key_accomplishments TEXT[] DEFAULT '{}',
  concerns TEXT[] DEFAULT '{}',
  eod_submission_id UUID REFERENCES team_eod_submissions(id) ON DELETE SET NULL,
  agent_run_id UUID REFERENCES ai_agent_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, summary_date)
);

-- Enable RLS
ALTER TABLE team_eod_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activecollab_task_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_daily_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_eod_submissions
CREATE POLICY "Users can view their own EOD submissions"
  ON team_eod_submissions FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own EOD submissions"
  ON team_eod_submissions FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own EOD submissions"
  ON team_eod_submissions FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Managers can view all EOD submissions"
  ON team_eod_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('super_admin', 'manager', 'pm')
    )
  );

-- RLS Policies for activecollab_task_data
CREATE POLICY "Users can view tasks assigned to them"
  ON activecollab_task_data FOR SELECT
  USING (assignee_id::text = auth.uid()::text);

CREATE POLICY "Managers can view all task data"
  ON activecollab_task_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('super_admin', 'manager', 'pm')
    )
  );

CREATE POLICY "Service role can manage task data"
  ON activecollab_task_data FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for team_daily_summaries
CREATE POLICY "Users can view their own summaries"
  ON team_daily_summaries FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Managers can view all summaries"
  ON team_daily_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('super_admin', 'manager', 'pm')
    )
  );

CREATE POLICY "Service role can manage summaries"
  ON team_daily_summaries FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_eod_submissions_user_date ON team_eod_submissions(user_id, submission_date DESC);
CREATE INDEX idx_eod_submissions_date ON team_eod_submissions(submission_date DESC);
CREATE INDEX idx_activecollab_sync_date ON activecollab_task_data(sync_date DESC);
CREATE INDEX idx_activecollab_assignee ON activecollab_task_data(assignee_id);
CREATE INDEX idx_daily_summaries_user_date ON team_daily_summaries(user_id, summary_date DESC);
CREATE INDEX idx_daily_summaries_date ON team_daily_summaries(summary_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_eod_submissions_updated_at
  BEFORE UPDATE ON team_eod_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activecollab_task_data_updated_at
  BEFORE UPDATE ON activecollab_task_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_daily_summaries_updated_at
  BEFORE UPDATE ON team_daily_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();