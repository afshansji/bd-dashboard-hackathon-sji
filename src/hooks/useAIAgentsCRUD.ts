import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Types
export interface AIAgentFull {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  system_prompt: string | null;
  provider_config: Record<string, unknown>;
  is_enabled: boolean | null;
  is_active: boolean | null;
  memory_enabled: boolean;
  avatar: string | null;
  welcome_message: string | null;
  conversation_starters: string[];
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface AgentFormData {
  name: string;
  slug?: string;
  description?: string;
  category: string;
  system_prompt: string;
  is_enabled: boolean;
  memory_enabled: boolean;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  status: string | null;
  input: string | null;
  output: string | null;
  token_metrics: Record<string, unknown> | null;
  latency_ms: number | null;
  provider_used: string | null;
  model_used: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AgentConversation {
  id: string;
  agent_id: string;
  user_id: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model_used: string | null;
  provider_used: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  created_at: string;
}

const AI_AGENTS_KEY = ["ai", "agents-crud"];
const AI_RUNS_KEY = ["ai", "runs"];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ─── Agents CRUD ────────────────────────────────────────────

export function useAIAgentsList() {
  return useQuery({
    queryKey: AI_AGENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id, name, slug, description, category, system_prompt, provider_config, is_enabled, is_active, memory_enabled, avatar, welcome_message, conversation_starters, is_default, usage_count, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AIAgentFull[];
    },
  });
}

export function useCreateAgentCRUD() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: AgentFormData) => {
      const { data, error } = await supabase
        .from("ai_agents")
        .insert({
          name: form.name,
          slug: form.slug || generateSlug(form.name),
          description: form.description || null,
          category: form.category,
          system_prompt: form.system_prompt,
          type: "custom",
          is_enabled: form.is_enabled,
          is_active: true,
          memory_enabled: form.memory_enabled,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_AGENTS_KEY });
      toast.success("Agent created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAgentCRUD() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...form }: AgentFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("ai_agents")
        .update({
          name: form.name,
          slug: form.slug || generateSlug(form.name),
          description: form.description || null,
          category: form.category,
          system_prompt: form.system_prompt,
          is_enabled: form.is_enabled,
          memory_enabled: form.memory_enabled,
        } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_AGENTS_KEY });
      toast.success("Agent updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleAgentCRUD() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("ai_agents")
        .update({ is_enabled } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_AGENTS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAgentCRUD() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_AGENTS_KEY });
      toast.success("Agent deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Run Agent (ad-hoc) ─────────────────────────────────────

export function useRunAgentAdHoc() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ agentId, input }: { agentId: string; input: string }) => {
      // Insert pending run
      const { data: run, error: insertErr } = await supabase
        .from("ai_agent_runs")
        .insert({
          agent_id: agentId,
          executed_by: user?.id,
          status: "running",
          input: { text: input } as any,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Call edge function
      const { data, error } = await supabase.functions.invoke("ai-agent-chat", {
        body: { agent_id: agentId, input, user_id: user?.id },
      });
      if (error) throw error;

      // Update run record
      await supabase
        .from("ai_agent_runs")
        .update({
          status: "completed",
          output: data.output,
          completed_at: new Date().toISOString(),
        } as any)
        .eq("id", run.id);

      return { ...data, run_id: run.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_RUNS_KEY });
      toast.success("Agent executed successfully");
    },
    onError: (e: Error) => {
      toast.error(`Agent failed: ${e.message}`);
    },
  });
}

// ─── Execution History ──────────────────────────────────────

export function useAgentRunsCRUD() {
  const { user } = useAuth();
  return useQuery({
    queryKey: AI_RUNS_KEY,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agent_runs")
        .select("*")
        .eq("executed_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as AgentRun[];
    },
  });
}

// ─── Conversations & Messages ───────────────────────────────

export function useAgentConversations(agentId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai", "conversations", agentId],
    enabled: !!user?.id && !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_conversations")
        .select("*")
        .eq("agent_id", agentId!)
        .eq("user_id", user!.id)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AgentConversation[];
    },
  });
}

export function useConversationMessages(conversationId?: string) {
  return useQuery({
    queryKey: ["ai", "messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AgentMessage[];
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await supabase
        .from("agent_conversations")
        .insert({ agent_id: agentId, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as AgentConversation;
    },
    onSuccess: (_, agentId) => {
      qc.invalidateQueries({ queryKey: ["ai", "conversations", agentId] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      agentId,
      content,
    }: {
      conversationId: string;
      agentId: string;
      content: string;
    }) => {
      // Insert user message
      const { error: msgErr } = await supabase
        .from("agent_messages")
        .insert({ conversation_id: conversationId, role: "user", content });
      if (msgErr) throw msgErr;

      const { data, error } = await supabase.functions.invoke("agent-conversation-chat", {
        body: {
          agent_id: agentId,
          conversation_id: conversationId,
          message: content,
          user_id: user?.id,
        },
      });

      if (error) {
        const msg = (data as { error?: string } | null)?.error || error.message;
        throw new Error(msg);
      }
      if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }

      // Insert assistant message
      const { error: asstErr } = await supabase.from("agent_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: data.output,
        model_used: data.model_used || null,
        provider_used: data.provider_used || null,
        tokens_input: data.token_usage?.prompt_tokens || null,
        tokens_output: data.token_usage?.completion_tokens || null,
        latency_ms: data.latency_ms || null,
      });
      if (asstErr) throw asstErr;

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ai", "messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["ai", "conversations", vars.agentId] });
    },
    onError: (e: Error) => {
      toast.error(`Failed: ${e.message}`);
    },
  });
}
