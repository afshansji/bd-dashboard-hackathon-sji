-- Add EOD submissions for Pritesh (Assistant Manager Marketing) and Shahed
INSERT INTO team_eod_submissions (user_id, submission_date, task_links, notes)
VALUES 
  -- Pritesh (Assistant Manager Marketing) - Today
  ('605515ce-e6e7-402d-8dca-b2340452f63d', CURRENT_DATE, 
   ARRAY['https://app.activecollab.com/123/projects/456/tasks/AC-2001', 'https://app.activecollab.com/123/projects/456/tasks/AC-2002'],
   'Reviewed marketing campaign performance metrics and coordinated with team on upcoming social media strategy.'),
  -- Pritesh - Yesterday
  ('605515ce-e6e7-402d-8dca-b2340452f63d', CURRENT_DATE - 1, 
   ARRAY['https://app.activecollab.com/123/projects/456/tasks/AC-2003', 'https://app.activecollab.com/123/projects/456/tasks/AC-2004'],
   'Led weekly marketing team sync. Finalized Q1 marketing budget allocation.'),
  -- Shahed (Super Admin, Marketing) - Today
  ('7481442a-d91b-471a-acc5-3dbd0929998e', CURRENT_DATE,
   ARRAY['https://app.activecollab.com/123/projects/456/tasks/AC-3001'],
   'System architecture review and security audit completion.'),
  -- Shahed - Yesterday
  ('7481442a-d91b-471a-acc5-3dbd0929998e', CURRENT_DATE - 1,
   ARRAY['https://app.activecollab.com/123/projects/456/tasks/AC-3002', 'https://app.activecollab.com/123/projects/456/tasks/AC-3003'],
   'Infrastructure optimization and deployment pipeline improvements.')
ON CONFLICT DO NOTHING;

-- Add daily summaries with realistic data based on user titles
INSERT INTO team_daily_summaries (user_id, summary_date, tasks_completed, hours_logged, productivity_score, key_accomplishments, concerns, ai_summary)
VALUES 
  -- Pritesh (Assistant Manager Marketing) - Today
  ('605515ce-e6e7-402d-8dca-b2340452f63d', CURRENT_DATE, 3, 8.5, 92,
   ARRAY['Reviewed and optimized Facebook and Instagram ad campaigns resulting in 15% better CTR', 
         'Coordinated with design team for upcoming product launch materials', 
         'Analyzed competitor marketing strategies and prepared executive summary'],
   ARRAY[]::text[],
   '{"overall_summary": "Pritesh had an excellent day focusing on campaign optimization and team coordination. As Assistant Manager Marketing, he demonstrated strong leadership in reviewing ad performance and strategic planning.", "recommendations": ["Continue monitoring ad campaign performance daily", "Schedule follow-up meeting with design team for launch timeline"], "hours_analysis": "8.5 hours logged - appropriate for managerial role with mix of analysis and coordination"}'::jsonb),
  -- Pritesh - Yesterday
  ('605515ce-e6e7-402d-8dca-b2340452f63d', CURRENT_DATE - 1, 4, 9, 88,
   ARRAY['Led weekly marketing team synchronization meeting with 12 attendees', 
         'Finalized Q1 marketing budget allocation across channels', 
         'Reviewed and approved content calendar for next month',
         'One-on-one mentoring session with junior marketing executives'],
   ARRAY['Need to address delayed influencer partnership contracts']::text[],
   '{"overall_summary": "Strong performance from Pritesh in his managerial capacity. Led effective team meetings and made key budgetary decisions. Shows excellent leadership qualities.", "recommendations": ["Follow up on influencer contracts by end of week", "Consider delegation of routine approvals to free up strategic time"], "hours_analysis": "9 hours logged - slightly above average but justified by team meeting and budget planning activities"}'::jsonb),
  -- Shahed (Super Admin) - Today
  ('7481442a-d91b-471a-acc5-3dbd0929998e', CURRENT_DATE, 2, 7, 95,
   ARRAY['Completed comprehensive security audit of production systems', 
         'Implemented automated backup verification system'],
   ARRAY[]::text[],
   '{"overall_summary": "Shahed delivered critical infrastructure work with high impact. Security audit findings will improve system reliability significantly.", "recommendations": ["Share security audit findings with team in next sprint planning", "Document backup verification process for operations manual"], "hours_analysis": "7 hours logged - efficient completion of complex infrastructure tasks"}'::jsonb),
  -- Shahed - Yesterday  
  ('7481442a-d91b-471a-acc5-3dbd0929998e', CURRENT_DATE - 1, 3, 8.5, 90,
   ARRAY['Optimized database query performance reducing load time by 40%', 
         'Upgraded deployment pipeline with automated testing', 
         'Code review and mentoring for 3 pull requests'],
   ARRAY[]::text[],
   '{"overall_summary": "Excellent technical contributions from Shahed. Infrastructure improvements show measurable impact on system performance.", "recommendations": ["Share optimization techniques in tech talk", "Document pipeline improvements for team reference"], "hours_analysis": "8.5 hours logged - appropriate for senior technical leadership role"}'::jsonb),
  -- Anik (Marketing PM / Project Coordinator) - Additional recent day
  ('c1579d9d-f7d9-4f60-b83a-c61f6209f64e', CURRENT_DATE - 2, 2, 7.5, 82,
   ARRAY['Coordinated cross-functional project kickoff meeting', 
         'Updated project timelines and resource allocation in project management tool'],
   ARRAY['Waiting on client feedback for requirements document']::text[],
   '{"overall_summary": "Anik effectively managed project coordination activities. Good communication with stakeholders and proactive timeline management.", "recommendations": ["Send follow-up reminder to client for requirements feedback", "Schedule buffer time for requirement changes"], "hours_analysis": "7.5 hours logged - solid day of project coordination work"}'::jsonb)
ON CONFLICT DO NOTHING;