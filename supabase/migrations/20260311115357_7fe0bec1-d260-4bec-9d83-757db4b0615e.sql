
-- Add missing columns to ai_agents
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS conversation_starters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Conversation threads
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  summary TEXT,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_user ON public.agent_conversations(agent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON public.agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_last_message ON public.agent_conversations(last_message_at DESC NULLS LAST);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" ON public.agent_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create conversations" ON public.agent_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.agent_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations" ON public.agent_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all conversations" ON public.agent_conversations FOR SELECT TO authenticated USING (public.is_manager_or_admin());

CREATE TRIGGER update_agent_conversations_updated_at BEFORE UPDATE ON public.agent_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Individual messages
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  model_used VARCHAR(100),
  provider_used VARCHAR(50),
  tokens_input INTEGER,
  tokens_output INTEGER,
  latency_ms INTEGER,
  tool_calls JSONB,
  tool_results JSONB,
  citations JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON public.agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON public.agent_messages(conversation_id, created_at);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON public.agent_messages FOR SELECT TO authenticated USING (conversation_id IN (SELECT id FROM public.agent_conversations WHERE user_id = auth.uid()));
CREATE POLICY "Users can create messages in their conversations" ON public.agent_messages FOR INSERT TO authenticated WITH CHECK (conversation_id IN (SELECT id FROM public.agent_conversations WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all messages" ON public.agent_messages FOR SELECT TO authenticated USING (public.is_manager_or_admin());

-- Auto-update conversation stats trigger
CREATE OR REPLACE FUNCTION public.update_conversation_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.agent_conversations
  SET message_count = message_count + 1, last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;

  IF NEW.role = 'user' THEN
    UPDATE public.ai_agents SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE id = (SELECT agent_id FROM public.agent_conversations WHERE id = NEW.conversation_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_stats_on_message AFTER INSERT ON public.agent_messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_stats();

-- Auto-generate conversation title
CREATE OR REPLACE FUNCTION public.generate_conversation_title()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE public.agent_conversations
    SET title = CASE WHEN title IS NULL OR title = '' THEN LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END ELSE title END
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_conversation_title AFTER INSERT ON public.agent_messages FOR EACH ROW EXECUTE FUNCTION public.generate_conversation_title();

-- User agent personalizations
CREATE TABLE IF NOT EXISTS public.user_agent_personalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  additional_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

ALTER TABLE public.user_agent_personalizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own personalizations" ON public.user_agent_personalizations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all personalizations" ON public.user_agent_personalizations FOR ALL TO authenticated USING (public.is_manager_or_admin()) WITH CHECK (public.is_manager_or_admin());

CREATE TRIGGER update_user_agent_personalizations_updated_at BEFORE UPDATE ON public.user_agent_personalizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
