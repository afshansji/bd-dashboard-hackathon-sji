// DHS (Daily Head Start) Tracker Types

export interface DHSSubmission {
  id: string;
  user_id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DHSSubmissionFormData {
  content: string;
}

export interface DHSTeamSummary {
  date: string;
  total_submissions: number;
  submission_rate: number;
}

export interface DHSSubmissionWithUser extends DHSSubmission {
  profiles?: {
    full_name?: string;
    email: string;
  };
}

