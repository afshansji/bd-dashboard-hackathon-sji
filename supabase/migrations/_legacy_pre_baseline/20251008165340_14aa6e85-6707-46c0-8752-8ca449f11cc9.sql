-- Add sample tasks across all projects with realistic data
INSERT INTO project_tasks (project_id, title, description, status, priority, assigned_to, estimated_hours, due_date)
VALUES
  -- Brand Identity Development tasks
  ('51525999-41cc-4117-8c25-67bb636a3925', 'Create Brand Guidelines Document', 'Develop comprehensive brand guidelines including logo usage, color palette, typography, and tone of voice', 'completed', 'high', '13b84c51-1b18-4270-aaeb-d09b0f1fb7ed', 16, '2024-01-15'),
  ('51525999-41cc-4117-8c25-67bb636a3925', 'Design Logo Variations', 'Create primary logo and alternative versions for different use cases', 'completed', 'urgent', 'f8317ff8-56d3-429d-aff0-380ceb222a1b', 24, '2024-01-10'),
  ('51525999-41cc-4117-8c25-67bb636a3925', 'Social Media Brand Assets', 'Design profile pictures, cover photos, and post templates for all social platforms', 'in_progress', 'medium', '1bf016b3-c0b1-4a4b-aed4-7b2bcef32dcc', 12, '2024-02-01'),
  
  -- Digital Marketing Campaign tasks
  ('93c9e778-ba12-4b40-8ac5-4de253e13abc', 'Campaign Strategy Document', 'Research target audience and create comprehensive marketing strategy', 'completed', 'urgent', 'a74fba85-226d-4c28-8f3c-de88f00d0bed', 20, '2024-01-20'),
  ('93c9e778-ba12-4b40-8ac5-4de253e13abc', 'Design Ad Creatives', 'Create banner ads, social media ads, and email templates', 'in_progress', 'high', 'f8317ff8-56d3-429d-aff0-380ceb222a1b', 16, '2024-02-05'),
  ('93c9e778-ba12-4b40-8ac5-4de253e13abc', 'Set Up Google Ads Campaign', 'Configure Google Ads account, keywords, and tracking', 'todo', 'high', 'c1579d9d-f7d9-4f60-b83a-c61f6209f64e', 8, '2024-02-10'),
  ('93c9e778-ba12-4b40-8ac5-4de253e13abc', 'Create Landing Pages', 'Design and develop 3 conversion-optimized landing pages', 'in_progress', 'high', '13b84c51-1b18-4270-aaeb-d09b0f1fb7ed', 24, '2024-02-08'),
  
  -- E-commerce Platform tasks
  ('7829b68c-7563-4dbe-ae87-8d7d5a9ef6ff', 'Database Schema Design', 'Design database structure for products, orders, users, and inventory', 'completed', 'urgent', 'c4525209-ebd4-4541-a805-5c7d2fc70422', 16, '2024-01-25'),
  ('7829b68c-7563-4dbe-ae87-8d7d5a9ef6ff', 'Implement Shopping Cart', 'Build shopping cart functionality with session management', 'in_progress', 'high', '13b84c51-1b18-4270-aaeb-d09b0f1fb7ed', 20, '2024-02-15'),
  ('7829b68c-7563-4dbe-ae87-8d7d5a9ef6ff', 'Payment Gateway Integration', 'Integrate Stripe payment processing and webhooks', 'todo', 'urgent', 'e8e40d1a-26ae-4aa0-91a5-61e1df7c27d8', 12, '2024-02-20'),
  ('7829b68c-7563-4dbe-ae87-8d7d5a9ef6ff', 'Product Search & Filtering', 'Implement advanced search with filters and sorting', 'in_progress', 'medium', 'c1579d9d-f7d9-4f60-b83a-c61f6209f64e', 16, '2024-02-18'),
  ('7829b68c-7563-4dbe-ae87-8d7d5a9ef6ff', 'Admin Dashboard', 'Create admin panel for inventory and order management', 'todo', 'high', 'c4525209-ebd4-4541-a805-5c7d2fc70422', 32, '2024-03-01'),
  
  -- Learning Management System tasks
  ('412b7154-c6a9-4847-b9bb-83c61982c52c', 'User Authentication System', 'Implement login, registration, and role-based access control', 'completed', 'urgent', 'e8e40d1a-26ae-4aa0-91a5-61e1df7c27d8', 24, '2024-01-18'),
  ('412b7154-c6a9-4847-b9bb-83c61982c52c', 'Course Management Module', 'Build interface for creating and managing courses', 'in_progress', 'high', '13b84c51-1b18-4270-aaeb-d09b0f1fb7ed', 28, '2024-02-12'),
  ('412b7154-c6a9-4847-b9bb-83c61982c52c', 'Video Player Integration', 'Integrate video streaming with progress tracking', 'todo', 'high', 'c1579d9d-f7d9-4f60-b83a-c61f6209f64e', 16, '2024-02-25'),
  ('412b7154-c6a9-4847-b9bb-83c61982c52c', 'Quiz & Assessment System', 'Create quiz builder and automatic grading system', 'blocked', 'medium', 'a74fba85-226d-4c28-8f3c-de88f00d0bed', 20, '2024-03-05'),
  
  -- Patient Portal System tasks
  ('e3223992-7262-4546-b0f7-a18d83bed7f7', 'HIPAA Compliance Audit', 'Conduct security audit and implement HIPAA compliance measures', 'in_progress', 'urgent', '605515ce-e6e7-402d-8dca-b2340452f63d', 32, '2024-02-10'),
  ('e3223992-7262-4546-b0f7-a18d83bed7f7', 'Appointment Booking System', 'Create appointment scheduling with calendar integration', 'in_progress', 'high', 'c4525209-ebd4-4541-a805-5c7d2fc70422', 24, '2024-02-15'),
  ('e3223992-7262-4546-b0f7-a18d83bed7f7', 'Medical Records Upload', 'Implement secure document upload and storage', 'todo', 'high', 'e8e40d1a-26ae-4aa0-91a5-61e1df7c27d8', 20, '2024-02-28'),
  ('e3223992-7262-4546-b0f7-a18d83bed7f7', 'Patient Messaging System', 'Build secure messaging between patients and providers', 'todo', 'medium', '13b84c51-1b18-4270-aaeb-d09b0f1fb7ed', 18, '2024-03-10'),
  
  -- Website Redesign tasks
  ('2b1ae0c2-ed52-4534-8851-8580239da286', 'User Research & Wireframes', 'Conduct user interviews and create wireframes', 'completed', 'high', '1bf016b3-c0b1-4a4b-aed4-7b2bcef32dcc', 16, '2024-01-22'),
  ('2b1ae0c2-ed52-4534-8851-8580239da286', 'UI Design System', 'Create reusable component library and design tokens', 'in_progress', 'high', 'f8317ff8-56d3-429d-aff0-380ceb222a1b', 20, '2024-02-08'),
  ('2b1ae0c2-ed52-4534-8851-8580239da286', 'Homepage Development', 'Build responsive homepage with animations', 'review', 'high', '13b84c51-1b18-4270-aaeb-d09b0f1fb7ed', 24, '2024-02-12'),
  ('2b1ae0c2-ed52-4534-8851-8580239da286', 'Mobile Optimization', 'Optimize all pages for mobile devices and tablets', 'todo', 'medium', 'c1579d9d-f7d9-4f60-b83a-c61f6209f64e', 16, '2024-02-20'),
  ('2b1ae0c2-ed52-4534-8851-8580239da286', 'SEO Implementation', 'Implement meta tags, structured data, and performance optimization', 'todo', 'low', 'a74fba85-226d-4c28-8f3c-de88f00d0bed', 12, '2024-02-25');