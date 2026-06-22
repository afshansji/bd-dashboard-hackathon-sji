-- Delete all existing target niches
DELETE FROM target_niches;

-- Insert 5 new strategic target niches for SJ Innovation 2025

-- 1. Finance & Banking (Priority 1)
INSERT INTO target_niches (
  name, description, industries, services, target_contacts, target_regions,
  employee_size_min, employee_size_max, business_type, pain_points, dreams,
  status, priority, target_revenue, target_clients
) VALUES (
  'Finance & Banking',
  'Regional banks, mortgage firms, and financial service providers needing AI agent integration for compliance, customer service, and data security with private, locally hosted AI deployments.',
  ARRAY['Banking', 'Financial Services', 'Mortgage', 'Regional Banks'],
  ARRAY['AI Agent Integration', 'Compliance Automation', 'Customer Service AI', 'Private AI Deployments', 'Predictive Analytics', 'Workflow Automation'],
  ARRAY['CTO', 'Chief Information Officer', 'VP of Technology', 'Head of Compliance', 'Chief Risk Officer'],
  ARRAY['United States', 'North America'],
  100,
  500,
  'B2B Enterprise',
  ARRAY['Complex compliance requirements', 'Data security and privacy concerns', 'Legacy system modernization', 'Manual workflow bottlenecks', 'Customer service scalability'],
  ARRAY['AI-powered compliance automation', 'Secure private AI infrastructure', 'Streamlined customer service operations', 'Real-time fraud detection', 'Predictive analytics for risk management'],
  'active',
  'high',
  500000,
  5
);

-- 2. Healthcare & Medical Offices (Priority 2)
INSERT INTO target_niches (
  name, description, industries, services, target_contacts, target_regions,
  employee_size_min, employee_size_max, business_type, pain_points, dreams,
  status, priority, target_revenue, target_clients
) VALUES (
  'Healthcare & Medical Offices',
  'Medical practices and healthcare providers seeking AI Scribe Assistants, EMR data extraction, pharmacy workflow automation, and clinical reporting solutions.',
  ARRAY['Healthcare', 'Medical Offices', 'Telemedicine', 'Pharmacy'],
  ARRAY['AI Scribe Assistants', 'EMR Data Extraction', 'Pharmacy Workflow Automation', 'Clinical Reporting Dashboards', 'Patient Data Management', 'Healthcare Analytics'],
  ARRAY['Chief Medical Officer', 'Practice Manager', 'IT Director', 'Clinical Director', 'Healthcare Administrator'],
  ARRAY['United States', 'North America'],
  50,
  300,
  'B2B Healthcare',
  ARRAY['Administrative burden on physicians', 'Manual EMR data entry', 'Inefficient pharmacy workflows', 'Patient data accessibility issues', 'Compliance with HIPAA regulations'],
  ARRAY['Automated clinical documentation', 'Seamless EMR integration', 'Real-time patient insights', 'Reduced physician burnout', 'Streamlined pharmacy operations'],
  'active',
  'high',
  250000,
  5
);

-- 3. Software & Marketing Agencies (Priority 3)
INSERT INTO target_niches (
  name, description, industries, services, target_contacts, target_regions,
  employee_size_min, employee_size_max, business_type, pain_points, dreams,
  status, priority, target_revenue, target_clients
) VALUES (
  'Software & Marketing Agencies',
  'Digital agencies, software consultancies, and marketing firms needing CollabAI-based automation for project management, content creation, and white-label SaaS solutions.',
  ARRAY['Digital Agency', 'Software Development', 'Marketing Agency', 'Consulting'],
  ARRAY['CollabAI Automation', 'Project Management Tools', 'Content Creation AI', 'White-Label SaaS', 'GoHighLevel Integration', 'Workflow Automation'],
  ARRAY['Agency Owner', 'CEO', 'Head of Operations', 'Technical Director', 'VP of Client Services'],
  ARRAY['United States', 'Canada', 'Global'],
  25,
  200,
  'B2B Agency',
  ARRAY['Manual project management overhead', 'Content creation bottlenecks', 'Client communication delays', 'Lack of scalable automation', 'Limited recurring revenue streams'],
  ARRAY['Automated client workflows', 'AI-powered content generation', 'White-label product offerings', 'Scalable SaaS revenue', 'Seamless tool integrations'],
  'active',
  'high',
  150000,
  10
);

-- 4. E-Commerce & Retail (Priority 4)
INSERT INTO target_niches (
  name, description, industries, services, target_contacts, target_regions,
  employee_size_min, employee_size_max, business_type, pain_points, dreams,
  status, priority, target_revenue, target_clients
) VALUES (
  'E-Commerce & Retail',
  'Online stores and retailers seeking AI-driven customer engagement, personalized product recommendations, inventory forecasting, and smart support chatbots.',
  ARRAY['E-Commerce', 'Online Retail', 'Consumer Goods', 'Shopify', 'WooCommerce'],
  ARRAY['Product Recommendation Engines', 'AI Customer Engagement', 'Inventory Forecasting', 'Smart Support Chatbots', 'Shopify/WooCommerce Integration', 'Predictive Sales Analytics'],
  ARRAY['CEO', 'Head of E-Commerce', 'VP of Technology', 'Chief Marketing Officer', 'Operations Manager'],
  ARRAY['United States', 'Canada', 'Global'],
  10,
  150,
  'B2C / D2C',
  ARRAY['Low customer engagement rates', 'Poor product discovery', 'Inventory management challenges', 'High customer support costs', 'Cart abandonment issues'],
  ARRAY['Personalized shopping experiences', 'AI-powered product recommendations', 'Automated customer support', 'Optimized inventory levels', 'Increased conversion rates'],
  'active',
  'medium',
  100000,
  8
);

-- 5. Education & Nonprofit (Priority 5)
INSERT INTO target_niches (
  name, description, industries, services, target_contacts, target_regions,
  employee_size_min, employee_size_max, business_type, pain_points, dreams,
  status, priority, target_revenue, target_clients
) VALUES (
  'Education & Nonprofit',
  'Educational institutions and nonprofit organizations seeking AI tutoring assistants, knowledge management bots, donor engagement automation, and learning content creation tools.',
  ARRAY['Education', 'Nonprofit', 'Higher Education', 'K-12', 'Mission-Driven Organizations'],
  ARRAY['AI Tutoring Assistants', 'Knowledge Management Bots', 'Donor Engagement Automation', 'Learning Content Creation', 'Chatbot Enrollment Systems', 'Mission-Aligned AI Solutions'],
  ARRAY['Executive Director', 'CTO', 'Head of Development', 'Director of IT', 'Chief Academic Officer'],
  ARRAY['United States', 'North America'],
  20,
  300,
  'B2B Nonprofit / Education',
  ARRAY['Limited technical resources', 'Manual donor outreach processes', 'Student engagement challenges', 'Content creation bottlenecks', 'Difficulty measuring impact'],
  ARRAY['AI-powered tutoring at scale', 'Automated donor engagement', 'Personalized learning experiences', 'Efficient knowledge sharing', 'Mission-driven technology impact'],
  'active',
  'medium',
  75000,
  3
);