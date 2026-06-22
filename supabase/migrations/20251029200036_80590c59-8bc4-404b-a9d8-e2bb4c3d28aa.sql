-- One-time cleanup: Remove revenue projection deals that were synced before exclusion logic was added
DELETE FROM deals
WHERE control_tower_metadata->>'dealstage' ~ '^960[0-9]{6}$';