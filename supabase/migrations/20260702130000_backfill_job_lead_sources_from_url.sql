-- Backfill job lead source from job_url for rows stored with legacy generic source values.

UPDATE public.upwork_jobs
SET source = 'reddit'
WHERE (job_url ILIKE '%reddit.com%' OR job_url ILIKE '%redd.it%')
  AND source IN ('upwork', 'upwork_inspector', 'upwork-inspector', '');

UPDATE public.upwork_jobs
SET source = 'hackernews'
WHERE job_url ILIKE '%news.ycombinator.com%'
  AND source IN ('upwork', 'upwork_inspector', 'upwork-inspector', '');

UPDATE public.upwork_jobs
SET source = 'twitter'
WHERE (job_url ILIKE '%twitter.com%' OR job_url ILIKE '%x.com%')
  AND source IN ('upwork', 'upwork_inspector', 'upwork-inspector', '');

UPDATE public.upwork_jobs
SET source = 'linkedin'
WHERE job_url ILIKE '%linkedin.com%'
  AND source IN ('upwork', 'upwork_inspector', 'upwork-inspector', '');

UPDATE public.upwork_jobs
SET source = 'facebook'
WHERE (job_url ILIKE '%facebook.com%' OR job_url ILIKE '%fb.com%')
  AND source IN ('upwork', 'upwork_inspector', 'upwork-inspector', '');

UPDATE public.upwork_jobs
SET source = 'freelancer'
WHERE job_url ILIKE '%freelancer.com%'
  AND source IN ('upwork', 'upwork_inspector', 'upwork-inspector', '');

UPDATE public.upwork_jobs
SET source = 'wellfound'
WHERE (job_url ILIKE '%wellfound.com%' OR job_url ILIKE '%angel.co%')
  AND source IN ('upwork', 'upwork_inspector', 'upwork-inspector', '');

UPDATE public.upwork_jobs
SET source = 'upwork'
WHERE job_url ILIKE '%upwork.com%'
  AND source IN ('upwork_inspector', 'upwork-inspector', '');
