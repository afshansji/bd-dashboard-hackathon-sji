-- Insert sample brands data based on mock data
-- First, let's get some user IDs to use as owners
DO $$
DECLARE
    super_admin_id uuid;
    manager_id uuid;
BEGIN
    -- Get or create a super admin user for brand ownership
    INSERT INTO public.users (email, password_hash, first_name, last_name, role)
    VALUES ('admin@sjinnovation.com', 'dummy_hash', 'Super', 'Admin', 'super_admin'::app_role)
    ON CONFLICT (email) DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role
    RETURNING id INTO super_admin_id;
    
    -- Get or create manager users
    INSERT INTO public.users (email, password_hash, first_name, last_name, role)
    VALUES 
        ('fozle@sjinnovation.com', 'dummy_hash', 'Fozle', 'Rahman', 'manager'::app_role),
        ('sarah@sjinnovation.com', 'dummy_hash', 'Sarah', 'Johnson', 'manager'::app_role),
        ('debanjan@sjinnovation.com', 'dummy_hash', 'Debanjan', 'Bhaumik', 'manager'::app_role),
        ('mike@sjinnovation.com', 'dummy_hash', 'Mike', 'Chen', 'manager'::app_role),
        ('alex@sjinnovation.com', 'dummy_hash', 'Alex', 'Turner', 'manager'::app_role),
        ('emma@sjinnovation.com', 'dummy_hash', 'Emma', 'Wilson', 'manager'::app_role),
        ('lisa@sjinnovation.com', 'dummy_hash', 'Lisa', 'Garcia', 'manager'::app_role)
    ON CONFLICT (email) DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role;

    -- Insert brands
    INSERT INTO public.brands (name, slug, type, description, owner_id, is_active, monthly_budget, status)
    VALUES 
        ('CollabAI', 'collab-ai', 'internal', 'AI collaboration platform for teams', 
         (SELECT id FROM public.users WHERE email = 'fozle@sjinnovation.com'), true, 5000, 'active'),
        
        ('LeadsLift', 'leads-lift', 'internal', 'Lead generation and nurturing platform', 
         (SELECT id FROM public.users WHERE email = 'sarah@sjinnovation.com'), true, 3000, 'active'),
        
        ('Community Outreach', 'community-outreach', 'internal', 'University and community partnerships', 
         (SELECT id FROM public.users WHERE email = 'debanjan@sjinnovation.com'), true, 2000, 'active'),
        
        ('BuildYourAI', 'build-your-ai', 'internal', 'AI development platform and services', 
         (SELECT id FROM public.users WHERE email = 'mike@sjinnovation.com'), true, 4000, 'active'),
        
        ('GHL Developer', 'ghl-developer', 'internal', 'GoHighLevel development and consulting', 
         (SELECT id FROM public.users WHERE email = 'alex@sjinnovation.com'), true, 3500, 'active'),
        
        ('Crafted.Email', 'crafted-email', 'internal', 'Email marketing and automation solutions', 
         (SELECT id FROM public.users WHERE email = 'emma@sjinnovation.com'), true, 2500, 'active'),
        
        ('PlatePresence', 'plate-presence', 'client', 'Restaurant marketing and social media management', 
         (SELECT id FROM public.users WHERE email = 'lisa@sjinnovation.com'), true, 1500, 'active'),
        
        ('SJ Innovation', 'sj-innovation', 'internal', 'Parent company and innovation hub', 
         (SELECT id FROM public.users WHERE email = 'admin@sjinnovation.com'), true, 10000, 'active')
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        owner_id = EXCLUDED.owner_id,
        monthly_budget = EXCLUDED.monthly_budget;

    -- Insert sample KPIs for each brand
    INSERT INTO public.brand_kpis (brand_id, name, type, description, current_value, target_value, source, display_order)
    SELECT 
        b.id,
        kpi_data.name,
        kpi_data.type,
        kpi_data.description,
        kpi_data.current_value,
        kpi_data.target_value,
        kpi_data.source,
        kpi_data.display_order
    FROM public.brands b
    CROSS JOIN (
        SELECT 'Website Sessions' as name, 'number' as type, 'Monthly website visits' as description, 4200 as current_value, 5000 as target_value, 'google_analytics' as source, 1 as display_order
        UNION ALL SELECT 'LinkedIn Followers', 'number', 'Total LinkedIn followers', 1250, 2000, 'linkedin', 2
        UNION ALL SELECT 'Demo Requests', 'number', 'Monthly demo requests', 18, 25, 'hubspot', 3
        UNION ALL SELECT 'Conversion Rate', 'percentage', 'Demo to customer conversion', 12.5, 15, 'hubspot', 4
    ) kpi_data
    WHERE b.slug = 'collab-ai'
    ON CONFLICT DO NOTHING;

    -- Add KPIs for LeadsLift
    INSERT INTO public.brand_kpis (brand_id, name, type, description, current_value, target_value, source, display_order)
    SELECT 
        b.id,
        kpi_data.name,
        kpi_data.type,
        kpi_data.description,
        kpi_data.current_value,
        kpi_data.target_value,
        kpi_data.source,
        kpi_data.display_order
    FROM public.brands b
    CROSS JOIN (
        SELECT 'Leads Generated' as name, 'number' as type, 'Monthly qualified leads' as description, 127 as current_value, 150 as target_value, 'ghl' as source, 1 as display_order
        UNION ALL SELECT 'Cost Per Lead', 'currency', 'Average cost per qualified lead', 45, 40, 'facebook', 2
        UNION ALL SELECT 'Email Open Rate', 'percentage', 'Average email open rate', 28.5, 30, 'ghl', 3
    ) kpi_data
    WHERE b.slug = 'leads-lift'
    ON CONFLICT DO NOTHING;

    -- Add KPIs for other brands (abbreviated for brevity)
    INSERT INTO public.brand_kpis (brand_id, name, type, description, current_value, target_value, source, display_order)
    SELECT 
        b.id,
        kpi_data.name,
        kpi_data.type,
        kpi_data.description,
        kpi_data.current_value,
        kpi_data.target_value,
        kpi_data.source,
        kpi_data.display_order
    FROM public.brands b
    CROSS JOIN (
        SELECT 'Events Organized' as name, 'number' as type, 'Monthly events organized' as description, 3 as current_value, 4 as target_value, 'eventbrite' as source, 1 as display_order
        UNION ALL SELECT 'Event Attendance', 'number', 'Total event attendees', 127, 150, 'eventbrite', 2
    ) kpi_data
    WHERE b.slug = 'community-outreach'
    ON CONFLICT DO NOTHING;

END $$;