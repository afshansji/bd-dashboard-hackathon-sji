-- Add slug column to bd_campaigns table
ALTER TABLE bd_campaigns ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index for slug
CREATE UNIQUE INDEX IF NOT EXISTS bd_campaigns_slug_unique ON bd_campaigns(slug);

-- Generate slugs for existing campaigns
UPDATE bd_campaigns 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- Create function to auto-generate slugs on insert
CREATE OR REPLACE FUNCTION generate_campaign_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-slug generation
DROP TRIGGER IF EXISTS bd_campaigns_slug_trigger ON bd_campaigns;
CREATE TRIGGER bd_campaigns_slug_trigger
  BEFORE INSERT ON bd_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION generate_campaign_slug();

-- Add slug column to campaign_contacts table
ALTER TABLE campaign_contacts ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index for contact slug
CREATE UNIQUE INDEX IF NOT EXISTS campaign_contacts_slug_unique ON campaign_contacts(slug);

-- Generate slugs for existing contacts
UPDATE campaign_contacts 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      COALESCE(contact_name, 'contact'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- Create function to auto-generate contact slugs
CREATE OR REPLACE FUNCTION generate_contact_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          COALESCE(NEW.contact_name, 'contact'),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    ) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-slug generation
DROP TRIGGER IF EXISTS campaign_contacts_slug_trigger ON campaign_contacts;
CREATE TRIGGER campaign_contacts_slug_trigger
  BEFORE INSERT ON campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION generate_contact_slug();