-- Update checklist template item to remove Collab AI reference
UPDATE checklist_templates
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item->>'title' = 'Create lead in CRM and Collab AI' 
      THEN jsonb_set(item, '{title}', '"Create lead in CRM"')
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items::text ILIKE '%Collab AI%';

-- Also update any existing deal checklist items
UPDATE deal_checklist_items
SET title = 'Create lead in CRM'
WHERE title = 'Create lead in CRM and Collab AI';