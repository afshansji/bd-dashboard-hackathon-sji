-- Add category column to deal_files table for file categorization
ALTER TABLE deal_files ADD COLUMN IF NOT EXISTS category TEXT;
