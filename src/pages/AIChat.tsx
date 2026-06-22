import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot, Send, ArrowLeft, Plus, MessageSquare, Brain, Loader2, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useAgentConversations, useConversationMessages,
  useCreateConversation, useSendMessage,
  type AIAgentFull, type AgentConversation, type AgentMessage,
} from "@/hooks/useAIAgentsCRUD";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function useAgent(agentId?: string) {
  return useQuery({
    queryKey: ["ai", "agent", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id, name, slug, description, category, system_prompt, memory_enabled, welcome_message, conversation_starters, avatar, usage_count")
        .eq("id", agentId!)
        .single();
      if (error) throw error;
      return data as unknown as AIAgentFull;
    },
  });
}

export default function AIChat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const agentId = searchParams.get("agent") || undefined;

  const { data: agent, isLoading: agentLoading } = useAgent(agentId);
  const { data: conversations } = useAgentConversations(agentId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const { data: messages } = useConversationMessages(activeConvoId || undefined);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select first conversation or create new one
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConvoId) {
      setActiveConvoId(conversations[0].id);
    }
  }, [conversations, activeConvoId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = async () => {
    if (!agentId) return;
    const convo = await createConversation.mutateAsync(agentId);
    setActiveConvoId(convo.id);
  };

  const handleSend = async () => {
    if (!input.trim() || !agentId) return;

    let convoId = activeConvoId;
    if (!convoId) {
      const convo = await createConversation.mutateAsync(agentId);
      convoId = convo.id;
      setActiveConvoId(convoId);
    }

    const msg = input.trim();
    setInput("");

    await sendMessage.mutateAsync({
      conversationId: convoId,
      agentId,
      content: msg,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!agentId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No agent selected</h2>
          <p className="text-muted-foreground mb-4">Select an agent from the AI Agents page</p>
          <Button onClick={() => navigate("/adminpanel/ai/agents")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  if (agentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Sidebar — Conversation list */}
      <div className="w-64 shrink-0 flex flex-col border rounded-lg bg-card">
        <div className="p-3 border-b">
          <Button onClick={() => navigate("/adminpanel/ai/agents")} variant="ghost" size="sm" className="w-full justify-start gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={handleNewConversation} size="sm" className="w-full gap-1" disabled={createConversation.isPending}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations?.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConvoId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                  activeConvoId === c.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <MessageSquare className="h-3 w-3 inline mr-1.5" />
                {c.title || "New conversation"}
              </button>
            ))}
            {(!conversations || conversations.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card">
        {/* Agent Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{agent?.name}</h2>
            <p className="text-xs text-muted-foreground">{agent?.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {agent?.memory_enabled && (
              <Badge variant="outline" className="text-xs gap-1">
                <Brain className="h-3 w-3" /> Memory
              </Badge>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Welcome message */}
            {(!messages || messages.length === 0) && (
              <div className="text-center py-12">
                <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">Chat with {agent?.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {agent?.welcome_message || "Ask me anything! I'm here to help."}
                </p>
                {agent?.conversation_starters && (agent.conversation_starters as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(agent.conversation_starters as string[]).map((s, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <p className="text-[10px] opacity-60 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sendMessage.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending}
              size="icon"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
