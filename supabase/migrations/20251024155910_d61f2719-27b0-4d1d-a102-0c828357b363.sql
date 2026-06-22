-- Add slug columns to clients and leads tables
ALTER TABLE clients ADD COLUMN slug text UNIQUE;
CREATE INDEX idx_clients_slug ON clients(slug);

ALTER TABLE leads ADD COLUMN slug text UNIQUE;
CREATE INDEX idx_leads_slug ON leads(slug);

-- Function to generate slug with numeric suffix
CREATE OR REPLACE FUNCTION generate_slug_numeric(base_text text) 
RETURNS text AS $$
DECLARE
  slug_base text;
  numeric_suffix text;
  final_slug text;
  counter int := 0;
BEGIN
  -- Convert to kebab-case
  slug_base := lower(regexp_replace(base_text, '[^a-z0-9]+', '-', 'g'));
  slug_base := trim(both '-' from slug_base);
  slug_base := left(slug_base, 50);
  
  -- Generate 5-digit random number
  numeric_suffix := lpad(floor(random() * 99999)::text, 5, '0');
  
  -- Combine
  final_slug := slug_base || '-' || numeric_suffix;
  
  -- Ensure uniqueness with retry logic
  WHILE EXISTS(SELECT 1 FROM clients WHERE slug = final_slug) OR 
        EXISTS(SELECT 1 FROM leads WHERE slug = final_slug) LOOP
    counter := counter + 1;
    IF counter > 10 THEN
      -- If collision after 10 tries, add timestamp
      numeric_suffix := lpad(floor(random() * 99999)::text, 5, '0');
      final_slug := slug_base || '-' || numeric_suffix || '-' || extract(epoch from now())::bigint::text;
      EXIT;
    END IF;
    numeric_suffix := lpad(floor(random() * 99999)::text, 5, '0');
    final_slug := slug_base || '-' || numeric_suffix;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for clients
CREATE OR REPLACE FUNCTION auto_generate_client_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug_numeric(COALESCE(NEW.name, NEW.company, 'client'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_client_slug
BEFORE INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION auto_generate_client_slug();

-- Trigger function for leads
CREATE OR REPLACE FUNCTION auto_generate_lead_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug_numeric(COALESCE(NEW.contact_name, NEW.company_name, 'lead'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_lead_slug
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION auto_generate_lead_slug();

-- Backfill existing records with slugs
UPDATE clients 
SET slug = generate_slug_numeric(COALESCE(name, company, 'client'))
WHERE slug IS NULL;

UPDATE leads 
SET slug = generate_slug_numeric(COALESCE(contact_name, company_name, 'lead'))
WHERE slug IS NULL;