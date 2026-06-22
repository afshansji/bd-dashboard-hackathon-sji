import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgentList } from "@/hooks/useAgentList";
import { AgentDetailModal } from "./AgentDetailModal";
import type { AIAgent } from "@/Api/aiAgents";

const AgentGallery = () => {
  const { data: agents, isLoading } = useAgentList();
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const activeAgents = agents?.filter(a => a.is_active) ?? [];

  const handleAgentClick = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setModalOpen(true);
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <Bot className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">AI Agent Gallery</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Meet the intelligent agents powering your business development workflows
      </p>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeAgents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active agents configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAgents.map((agent) => (
            <Card 
              key={agent.id} 
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              onClick={() => handleAgentClick(agent)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {agent.category || "General"}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-2 line-clamp-1">
                  {agent.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {agent.description || "AI-powered automation"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AgentDetailModal 
        agent={selectedAgent}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </section>
  );
};

export default AgentGallery;
