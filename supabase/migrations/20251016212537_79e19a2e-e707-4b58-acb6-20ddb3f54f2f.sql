-- Insert Sample PODs
INSERT INTO public.pods (id, name, description, lead_user_id, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Enterprise Solutions', 'Focused on large enterprise clients in tech and finance sectors', '06e7b3ed-e627-41e6-b267-4b5abfbead8d', true),
  ('22222222-2222-2222-2222-222222222222', 'SMB Growth', 'Targeting small to medium businesses with high growth potential', '06e7b3ed-e627-41e6-b267-4b5abfbead8d', true),
  ('33333333-3333-3333-3333-333333333333', 'Healthcare & Life Sciences', 'Specialized in healthcare technology and pharmaceutical companies', '06e7b3ed-e627-41e6-b267-4b5abfbead8d', true),
  ('44444444-4444-4444-4444-444444444444', 'E-commerce & Retail', 'Focus on online retailers and e-commerce platforms', '06e7b3ed-e627-41e6-b267-4b5abfbead8d', true);

-- Insert Sample Target Niches
INSERT INTO public.target_niches (
  id, pod_id, name, description, services, industries, target_contacts, 
  target_regions, employee_size_min, employee_size_max, revenue_min, revenue_max,
  business_type, pain_points, dreams, status, priority, target_revenue, 
  target_clients, created_by
) VALUES
  -- Enterprise Solutions POD Niches
  (
    'a1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Financial Services Tech Companies',
    'Mid to large-size fintech companies needing enterprise software solutions',
    ARRAY['Custom Software Development', 'Cloud Migration', 'AI/ML Integration'],
    ARRAY['Financial Services', 'Fintech', 'Banking'],
    ARRAY['CTO', 'VP of Engineering', 'Head of Digital Transformation'],
    ARRAY['North America', 'Europe'],
    200, 5000, 50000000, 500000000,
    'B2B SaaS',
    ARRAY['Legacy system modernization', 'Regulatory compliance challenges', 'Scaling technical infrastructure'],
    ARRAY['Digital transformation leadership', 'Market innovation', 'Operational efficiency'],
    'active', 'high', 2500000, 5,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Fortune 500 Manufacturing',
    'Large manufacturing enterprises seeking digital transformation',
    ARRAY['IoT Solutions', 'Supply Chain Optimization', 'Predictive Maintenance'],
    ARRAY['Manufacturing', 'Industrial', 'Automotive'],
    ARRAY['Chief Digital Officer', 'VP Operations', 'Head of Innovation'],
    ARRAY['North America', 'Asia Pacific'],
    5000, 50000, 1000000000, 10000000000,
    'B2B Enterprise',
    ARRAY['Supply chain visibility', 'Equipment downtime', 'Production optimization'],
    ARRAY['Smart factory implementation', 'Reduced operational costs', 'Competitive advantage'],
    'active', 'high', 5000000, 3,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- SMB Growth POD Niches
  (
    'b1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Fast-Growing SaaS Startups',
    'Series A-B SaaS companies scaling their engineering teams',
    ARRAY['Staff Augmentation', 'Product Development', 'DevOps Services'],
    ARRAY['SaaS', 'Technology', 'Software'],
    ARRAY['CEO', 'CTO', 'VP of Product'],
    ARRAY['North America', 'Europe', 'Middle East'],
    20, 150, 2000000, 20000000,
    'B2B SaaS',
    ARRAY['Scaling development team', 'Time to market pressure', 'Technical debt'],
    ARRAY['Rapid product development', 'Market leadership', 'Successful fundraising'],
    'active', 'medium', 800000, 10,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Digital Marketing Agencies',
    'Growing marketing agencies needing custom tools and automation',
    ARRAY['Marketing Automation', 'Analytics Platforms', 'CRM Integration'],
    ARRAY['Marketing', 'Advertising', 'Digital Services'],
    ARRAY['Agency Owner', 'Head of Operations', 'Technical Director'],
    ARRAY['North America', 'Europe'],
    10, 100, 1000000, 10000000,
    'B2B Services',
    ARRAY['Manual reporting processes', 'Client data management', 'Scaling challenges'],
    ARRAY['Automated workflows', 'Better client retention', 'Increased profitability'],
    'researching', 'medium', 500000, 15,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- Healthcare & Life Sciences POD Niches
  (
    'c1111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Digital Health Platforms',
    'Telemedicine and patient engagement platform providers',
    ARRAY['HIPAA Compliant Development', 'Mobile Health Apps', 'EHR Integration'],
    ARRAY['Healthcare', 'Telemedicine', 'Digital Health'],
    ARRAY['Chief Medical Officer', 'CTO', 'VP of Product'],
    ARRAY['North America', 'Europe'],
    50, 500, 10000000, 100000000,
    'B2B Healthcare',
    ARRAY['HIPAA compliance complexity', 'EHR integration challenges', 'Patient data security'],
    ARRAY['Improved patient outcomes', 'Healthcare accessibility', 'Regulatory confidence'],
    'active', 'high', 1500000, 8,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'Clinical Research Organizations',
    'CROs needing clinical trial management systems',
    ARRAY['Clinical Trial Software', 'Data Analytics', 'Compliance Solutions'],
    ARRAY['Pharmaceuticals', 'Biotechnology', 'Clinical Research'],
    ARRAY['Head of Clinical Operations', 'VP of Technology', 'Chief Compliance Officer'],
    ARRAY['North America', 'Europe'],
    100, 2000, 20000000, 200000000,
    'B2B Enterprise',
    ARRAY['Trial data management', 'Regulatory reporting', 'Multi-site coordination'],
    ARRAY['Faster trial completion', 'Data accuracy', 'Regulatory compliance'],
    'active', 'medium', 2000000, 4,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- E-commerce & Retail POD Niches
  (
    'd1111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'D2C E-commerce Brands',
    'Direct-to-consumer brands with growing online sales',
    ARRAY['E-commerce Platform Development', 'Mobile Commerce', 'Customer Analytics'],
    ARRAY['E-commerce', 'Retail', 'Consumer Goods'],
    ARRAY['CEO', 'Head of E-commerce', 'VP of Technology'],
    ARRAY['North America', 'Europe', 'Asia Pacific'],
    25, 250, 5000000, 50000000,
    'B2C E-commerce',
    ARRAY['Shopping cart abandonment', 'Mobile experience', 'Inventory management'],
    ARRAY['Increased conversion rates', 'Customer lifetime value', 'Market expansion'],
    'active', 'high', 1200000, 12,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'Omnichannel Retailers',
    'Traditional retailers expanding their digital presence',
    ARRAY['Omnichannel Solutions', 'POS Integration', 'Inventory Management'],
    ARRAY['Retail', 'Fashion', 'Home Goods'],
    ARRAY['Chief Digital Officer', 'VP of Retail Operations', 'Head of IT'],
    ARRAY['North America', 'Europe'],
    500, 10000, 100000000, 1000000000,
    'B2C Retail',
    ARRAY['Online-offline integration', 'Inventory visibility', 'Customer experience consistency'],
    ARRAY['Seamless shopping experience', 'Operational efficiency', 'Competitive positioning'],
    'researching', 'low', 800000, 6,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  );

-- Insert Sample BD Campaigns
INSERT INTO public.bd_campaigns (
  id, name, niche_id, brand_id, campaign_type, status, start_date, end_date,
  target_contacts, target_regions, target_contacts_count, actual_contacts_reached,
  responses_received, meetings_booked, deals_generated, owned_by, created_by
) VALUES
  -- Financial Services Campaigns
  (
    'ca111111-1111-1111-1111-111111111111',
    'Fintech CTO Outreach Q1 2025',
    'a1111111-1111-1111-1111-111111111111',
    NULL,
    'linkedin_outbound',
    'active',
    '2025-01-01', '2025-03-31',
    ARRAY['CTO', 'VP of Engineering'],
    ARRAY['North America'],
    150, 89, 23, 8, 2,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'ca222222-2222-2222-2222-222222222222',
    'Banking Digital Transformation Email Series',
    'a1111111-1111-1111-1111-111111111111',
    NULL,
    'email_outbound',
    'active',
    '2025-02-01', '2025-04-30',
    ARRAY['Head of Digital Transformation', 'CIO'],
    ARRAY['North America', 'Europe'],
    200, 145, 31, 12, 1,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- Manufacturing Campaigns
  (
    'ca333333-3333-3333-3333-333333333333',
    'Fortune 500 Manufacturing ABM Campaign',
    'a2222222-2222-2222-2222-222222222222',
    NULL,
    'abm',
    'planning',
    '2025-04-01', '2025-06-30',
    ARRAY['Chief Digital Officer', 'VP Operations'],
    ARRAY['North America'],
    50, 0, 0, 0, 0,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- SaaS Startup Campaigns
  (
    'cb111111-1111-1111-1111-111111111111',
    'Series A SaaS Cold Calling Initiative',
    'b1111111-1111-1111-1111-111111111111',
    NULL,
    'cold_calling',
    'active',
    '2025-01-15', '2025-03-15',
    ARRAY['CEO', 'CTO'],
    ARRAY['North America'],
    100, 67, 18, 9, 3,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'cb222222-2222-2222-2222-222222222222',
    'YC Batch W25 LinkedIn Outreach',
    'b1111111-1111-1111-1111-111111111111',
    NULL,
    'linkedin_outbound',
    'completed',
    '2024-12-01', '2025-01-31',
    ARRAY['CEO', 'VP of Product'],
    ARRAY['North America'],
    80, 80, 25, 15, 5,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- Marketing Agency Campaigns
  (
    'cb333333-3333-3333-3333-333333333333',
    'Digital Agency Partnership Email Campaign',
    'b2222222-2222-2222-2222-222222222222',
    NULL,
    'email_outbound',
    'paused',
    '2025-01-20', '2025-03-20',
    ARRAY['Agency Owner', 'Head of Operations'],
    ARRAY['North America'],
    120, 45, 8, 3, 0,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- Digital Health Campaigns
  (
    'cc111111-1111-1111-1111-111111111111',
    'Telemedicine Platform Outreach',
    'c1111111-1111-1111-1111-111111111111',
    NULL,
    'linkedin_outbound',
    'active',
    '2025-02-01', '2025-04-30',
    ARRAY['Chief Medical Officer', 'CTO'],
    ARRAY['North America'],
    75, 48, 15, 7, 2,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'cc222222-2222-2222-2222-222222222222',
    'Digital Health Conference Follow-up',
    'c1111111-1111-1111-1111-111111111111',
    NULL,
    'email_outbound',
    'completed',
    '2024-11-01', '2024-12-31',
    ARRAY['VP of Product', 'CTO'],
    ARRAY['North America'],
    60, 60, 22, 11, 4,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- Clinical Research Campaigns
  (
    'cc333333-3333-3333-3333-333333333333',
    'CRO Technology Modernization ABM',
    'c2222222-2222-2222-2222-222222222222',
    NULL,
    'abm',
    'planning',
    '2025-03-01', '2025-05-31',
    ARRAY['Head of Clinical Operations', 'VP of Technology'],
    ARRAY['North America', 'Europe'],
    40, 0, 0, 0, 0,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- E-commerce Campaigns
  (
    'cd111111-1111-1111-1111-111111111111',
    'D2C Brand LinkedIn Campaign',
    'd1111111-1111-1111-1111-111111111111',
    NULL,
    'linkedin_outbound',
    'active',
    '2025-01-10', '2025-03-10',
    ARRAY['CEO', 'Head of E-commerce'],
    ARRAY['North America'],
    150, 112, 34, 16, 4,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  (
    'cd222222-2222-2222-2222-222222222222',
    'Black Friday Tech Stack Upgrade Email',
    'd1111111-1111-1111-1111-111111111111',
    NULL,
    'email_outbound',
    'completed',
    '2024-10-01', '2024-11-30',
    ARRAY['VP of Technology', 'Head of E-commerce'],
    ARRAY['North America'],
    100, 100, 28, 14, 6,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  ),
  -- Omnichannel Retail Campaign
  (
    'cd333333-3333-3333-3333-333333333333',
    'Retail Digital Transformation Webinar Series',
    'd2222222-2222-2222-2222-222222222222',
    NULL,
    'other',
    'planning',
    '2025-05-01', '2025-07-31',
    ARRAY['Chief Digital Officer', 'VP of Retail Operations'],
    ARRAY['North America'],
    80, 0, 0, 0, 0,
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d',
    '06e7b3ed-e627-41e6-b267-4b5abfbead8d'
  );