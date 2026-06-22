-- Phase 1: Database Schema Extensions for Code Analysis & Generation

-- Create code repositories table
CREATE TABLE public.code_repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  repository_url TEXT,
  branch TEXT DEFAULT 'main',
  language TEXT,
  framework TEXT,
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'error')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create code analysis results table
CREATE TABLE public.code_analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('architecture', 'quality', 'security', 'performance', 'documentation')),
  file_path TEXT,
  findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  agent_run_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create code generation templates table  
CREATE TABLE public.code_generation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('component', 'hook', 'api', 'test', 'utility', 'page')),
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  framework TEXT,
  language TEXT DEFAULT 'typescript',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.code_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_generation_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for code_repositories
CREATE POLICY "code_repositories_user_access" ON public.code_repositories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role IN ('super_admin', 'manager', 'pm')
  )
  OR created_by::text = auth.uid()::text
);

-- Create RLS policies for code_analysis_results
CREATE POLICY "code_analysis_results_user_access" ON public.code_analysis_results
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role IN ('super_admin', 'manager', 'pm')
  )
  OR EXISTS (
    SELECT 1 FROM code_repositories cr 
    WHERE cr.id = code_analysis_results.repository_id 
    AND cr.created_by::text = auth.uid()::text
  )
);

-- Create RLS policies for code_generation_templates
CREATE POLICY "code_generation_templates_user_access" ON public.code_generation_templates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role IN ('super_admin', 'manager', 'pm')
  )
  OR created_by::text = auth.uid()::text
);

-- Add indexes for performance
CREATE INDEX idx_code_repositories_created_by ON public.code_repositories(created_by);
CREATE INDEX idx_code_repositories_status ON public.code_repositories(analysis_status);
CREATE INDEX idx_code_analysis_results_repository_id ON public.code_analysis_results(repository_id);
CREATE INDEX idx_code_analysis_results_type ON public.code_analysis_results(analysis_type);
CREATE INDEX idx_code_generation_templates_category ON public.code_generation_templates(category);
CREATE INDEX idx_code_generation_templates_framework ON public.code_generation_templates(framework);

-- Insert specialized AI agents for code analysis and generation
INSERT INTO public.ai_agents (
  name, slug, description, category, system_prompt, data_sources, required_role, created_by
) VALUES 
(
  'Code Architecture Analyst',
  'code-architecture-analyst', 
  'Analyzes codebase architecture, identifies patterns, and suggests structural improvements',
  'development',
  'You are a senior software architect specialized in analyzing codebases. Analyze the provided code structure, identify architectural patterns, assess scalability, and suggest improvements. Focus on: 1) Overall architecture quality 2) Design patterns usage 3) Separation of concerns 4) Scalability considerations 5) Technical debt indicators. Provide actionable recommendations.',
  '["repository_files", "dependency_graph", "component_structure"]'::jsonb,
  'manager',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),
(
  'Code Quality Reviewer', 
  'code-quality-reviewer',
  'Reviews code for best practices, potential bugs, and optimization opportunities',
  'development',
  'You are an expert code reviewer with extensive experience across multiple programming languages and frameworks. Review the provided code for: 1) Code quality and best practices 2) Potential bugs and security vulnerabilities 3) Performance optimization opportunities 4) Maintainability issues 5) Testing coverage gaps. Provide specific, actionable feedback with code examples when possible.',
  '["source_code", "test_coverage", "performance_metrics"]'::jsonb,
  'manager',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),
(
  'Code Generator',
  'code-generator',
  'Generates new code components following project patterns and best practices', 
  'development',
  'You are an intelligent code generator that creates high-quality, production-ready code. Generate code that: 1) Follows existing project patterns and conventions 2) Implements proper error handling and validation 3) Includes appropriate TypeScript types 4) Follows the established file structure 5) Includes relevant tests when applicable. Always explain your implementation decisions.',
  '["existing_patterns", "project_structure", "coding_standards"]'::jsonb,
  'manager',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),
(
  'Documentation Generator',
  'documentation-generator', 
  'Creates comprehensive documentation for codebases including API docs and inline comments',
  'development',
  'You are a technical documentation specialist. Generate clear, comprehensive documentation that includes: 1) API documentation with examples 2) Component usage guides 3) Architecture overviews 4) Setup and deployment instructions 5) Inline code comments. Make documentation accessible to developers of all skill levels.',
  '["api_endpoints", "component_interfaces", "system_architecture"]'::jsonb,
  'manager',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
);

-- Insert code-specific AI configurations
INSERT INTO public.ai_configurations (
  configuration_type, configuration_data, created_by
) VALUES 
(
  'code_analysis_prompts',
  '{
    "architecture_analysis": "Analyze the codebase architecture and identify: main patterns, component structure, data flow, scalability concerns, and improvement opportunities.",
    "quality_review": "Review this code for: best practices adherence, potential bugs, security vulnerabilities, performance issues, and maintainability concerns.",
    "documentation_generation": "Generate comprehensive documentation including: API references, component guides, setup instructions, and architectural overview."
  }'::jsonb,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),
(
  'development_context',
  '{
    "frameworks": ["React", "TypeScript", "Tailwind CSS", "Supabase"],
    "patterns": ["Component-based architecture", "Custom hooks", "React Query for state management"],
    "conventions": {
      "naming": "camelCase for variables, PascalCase for components",
      "file_structure": "Feature-based organization with shared components",
      "styling": "Tailwind CSS with semantic tokens from design system"
    }
  }'::jsonb,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),
(
  'code_generation_rules',
  '{
    "component_structure": {
      "imports": ["React hooks first", "External libraries", "Internal components", "Types and interfaces"],
      "exports": "Default export for main component, named exports for utilities",
      "props": "Always define TypeScript interfaces for component props"
    },
    "error_handling": "Use try-catch blocks for async operations, provide user-friendly error messages",
    "testing": "Include unit tests for utility functions, integration tests for components"
  }'::jsonb,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
);

-- Insert default code generation templates
INSERT INTO public.code_generation_templates (
  name, description, category, template_content, variables, framework, created_by
) VALUES 
(
  'React Component',
  'Basic React component with TypeScript and props interface',
  'component',
  'import React from "react";

interface {{componentName}}Props {
  {{props}}
}

export function {{componentName}}({ {{propsList}} }: {{componentName}}Props) {
  return (
    <div className="{{containerClasses}}">
      {{content}}
    </div>
  );
}

export default {{componentName}};',
  '{"componentName": "string", "props": "string", "propsList": "string", "containerClasses": "string", "content": "string"}'::jsonb,
  'React',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),
(
  'Custom Hook',
  'Custom React hook with TypeScript',
  'hook', 
  'import { useState, useEffect } from "react";

export function {{hookName}}({{parameters}}) {
  {{stateDeclarations}}

  useEffect(() => {
    {{effectLogic}}
  }, [{{dependencies}}]);

  return { {{returnValues}} };
}',
  '{"hookName": "string", "parameters": "string", "stateDeclarations": "string", "effectLogic": "string", "dependencies": "string", "returnValues": "string"}'::jsonb,
  'React',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_code_repositories_updated_at
  BEFORE UPDATE ON public.code_repositories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_code_analysis_results_updated_at
  BEFORE UPDATE ON public.code_analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_code_generation_templates_updated_at
  BEFORE UPDATE ON public.code_generation_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();