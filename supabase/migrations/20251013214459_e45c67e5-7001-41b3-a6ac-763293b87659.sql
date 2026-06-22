-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'project_manager', 'team_member', 'client');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default role as team_member
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'team_member');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Brands table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC,
  stage TEXT,
  probability NUMERIC,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  close_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- KPIs table
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- EOD Submissions table
CREATE TABLE public.eod_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_completed TEXT,
  challenges TEXT,
  tomorrow_plan TEXT,
  hours_worked NUMERIC,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.eod_submissions ENABLE ROW LEVEL SECURITY;

-- Team Summaries table
CREATE TABLE public.team_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  summary TEXT,
  team_size INTEGER,
  total_hours NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date)
);

ALTER TABLE public.team_summaries ENABLE ROW LEVEL SECURITY;

-- Integrations table
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB,
  is_active BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Analytics Data table
CREATE TABLE public.analytics_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  dimensions JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;

-- Code Repositories table
CREATE TABLE public.code_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  language TEXT,
  framework TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.code_repositories ENABLE ROW LEVEL SECURITY;

-- Code Analyses table
CREATE TABLE public.code_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES public.code_repositories(id) ON DELETE CASCADE,
  analysis_type TEXT,
  results JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.code_analyses ENABLE ROW LEVEL SECURITY;

-- AI Agents table
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- AI Agent Runs table
CREATE TABLE public.ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running',
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

-- Videos table (Sora)
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending',
  duration INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Gemini Videos table (Veo)
CREATE TABLE public.gemini_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending',
  duration INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gemini_videos ENABLE ROW LEVEL SECURITY;

-- Accountability Chart table
CREATE TABLE public.accountability_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  responsibilities JSONB,
  reports_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accountability_chart ENABLE ROW LEVEL SECURITY;

-- RLS Policies using security definer function

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);

-- Brands policies
CREATE POLICY "Everyone can view brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Clients policies
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can manage clients" ON public.clients FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Projects policies
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and PMs can manage projects" ON public.projects FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Tasks policies
CREATE POLICY "Users can view tasks assigned to them or created by them" ON public.tasks FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage all tasks" ON public.tasks FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update tasks assigned to them" ON public.tasks FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() = created_by);

-- Contacts policies
CREATE POLICY "Authenticated users can view contacts" ON public.contacts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage contacts" ON public.contacts FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Deals policies
CREATE POLICY "Authenticated users can view deals" ON public.deals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and deal owners can manage deals" ON public.deals FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR auth.uid() = owner_id);

-- KPIs policies
CREATE POLICY "Authenticated users can view KPIs" ON public.kpis FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage KPIs" ON public.kpis FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- EOD Submissions policies
CREATE POLICY "Users can view own EOD submissions" ON public.eod_submissions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can create own EOD submissions" ON public.eod_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own EOD submissions" ON public.eod_submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own EOD submissions" ON public.eod_submissions FOR DELETE USING (auth.uid() = user_id);

-- Team Summaries policies
CREATE POLICY "Authenticated users can view team summaries" ON public.team_summaries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage team summaries" ON public.team_summaries FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Integrations policies
CREATE POLICY "Admins can manage integrations" ON public.integrations FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view integrations" ON public.integrations FOR SELECT USING (auth.uid() IS NOT NULL);

-- Analytics Data policies
CREATE POLICY "Authenticated users can view analytics" ON public.analytics_data FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage analytics" ON public.analytics_data FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Code Repositories policies
CREATE POLICY "Authenticated users can view repositories" ON public.code_repositories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage repositories" ON public.code_repositories FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Code Analyses policies
CREATE POLICY "Authenticated users can view analyses" ON public.code_analyses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage analyses" ON public.code_analyses FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- AI Agents policies
CREATE POLICY "Users can view own agents" ON public.ai_agents FOR SELECT USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create agents" ON public.ai_agents FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own agents" ON public.ai_agents FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete agents" ON public.ai_agents FOR DELETE USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- AI Agent Runs policies
CREATE POLICY "Authenticated users can view agent runs" ON public.ai_agent_runs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can manage agent runs" ON public.ai_agent_runs FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Videos policies
CREATE POLICY "Users can view own videos" ON public.videos FOR SELECT USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own videos" ON public.videos FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own videos" ON public.videos FOR DELETE USING (auth.uid() = created_by);

-- Gemini Videos policies
CREATE POLICY "Users can view own gemini videos" ON public.gemini_videos FOR SELECT USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create gemini videos" ON public.gemini_videos FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own gemini videos" ON public.gemini_videos FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own gemini videos" ON public.gemini_videos FOR DELETE USING (auth.uid() = created_by);

-- Accountability Chart policies
CREATE POLICY "Users can view all accountability chart" ON public.accountability_chart FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage accountability chart" ON public.accountability_chart FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON public.kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_eod_submissions_updated_at BEFORE UPDATE ON public.eod_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_summaries_updated_at BEFORE UPDATE ON public.team_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_code_repositories_updated_at BEFORE UPDATE ON public.code_repositories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_code_analyses_updated_at BEFORE UPDATE ON public.code_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gemini_videos_updated_at BEFORE UPDATE ON public.gemini_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accountability_chart_updated_at BEFORE UPDATE ON public.accountability_chart FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();