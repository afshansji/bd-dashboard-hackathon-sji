-- Add bd_user role to app_role enum for Business Development team members
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'bd_user';