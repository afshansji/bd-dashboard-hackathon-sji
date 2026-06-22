-- Diagnostic SQL to check LinkedIn Lead Import issues
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- 1. Check recent import jobs and their status
SELECT 
    id,
    status,
    job_type,
    created_at,
    started_at,
    completed_at,
    imported_count,
    criteria,
    error_details
FROM lead_import_jobs
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if any jobs are stuck in "pending" or "running"
SELECT 
    id,
    status,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_elapsed,
    criteria->>'jobTitles' as job_titles,
    criteria->>'industries' as industries,
    error_details
FROM lead_import_jobs
WHERE status IN ('pending', 'running')
ORDER BY created_at DESC;

-- 3. Check failed jobs with error details
SELECT 
    id,
    created_at,
    criteria->>'jobTitles' as job_titles,
    criteria->>'industries' as industries,
    criteria->>'maxResults' as max_results,
    error_details
FROM lead_import_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check successful imports and their counts
SELECT 
    id,
    created_at,
    completed_at,
    imported_count,
    criteria->>'jobTitles' as job_titles,
    criteria->>'industries' as industries,
    criteria->>'results_count' as exa_results_count
FROM lead_import_jobs
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check if contacts were actually inserted for the latest job
WITH latest_job AS (
    SELECT id, campaign_id, created_at 
    FROM lead_import_jobs 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    cc.id,
    cc.contact_name,
    cc.contact_email,
    cc.contact_linkedin_url,
    cc.contact_company,
    cc.status,
    cc.created_at
FROM campaign_contacts cc
JOIN latest_job lj ON cc.campaign_id = lj.campaign_id
WHERE cc.created_at >= lj.created_at
ORDER BY cc.created_at DESC;

-- 6. Check Edge Function logs table (if it exists)
-- This shows if the function is even being called
SELECT 
    created_at,
    function_name,
    status,
    error_message
FROM edge_function_logs
WHERE function_name = 'campaign-lead-import'
ORDER BY created_at DESC
LIMIT 10;

