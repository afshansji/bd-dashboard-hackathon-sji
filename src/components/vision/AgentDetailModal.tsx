import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, MapPin, Shield, Lightbulb, BarChart3, Lock, Check, ExternalLink, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { AIAgent, AppRole, recordAgentView, getAgentViewStats } from "@/Api/aiAgents";
import { format } from "date-fns";

interface AgentDetailModalProps {
  agent: AIAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleHierarchy: Record<AppRole, number> = {
  'client': 0,
  'team_member': 1,
  'bd_user': 2,
  'project_manager': 3,
  'manager': 4,
  'admin': 5,
  'super_admin': 6,
};

const roleLabels: Record<AppRole, string> = {
  'client': 'Client',
  'team_member': 'Team Member',
  'bd_user': 'BD User',
  'project_manager': 'Project Manager',
  'manager': 'Manager',
  'admin': 'Admin',
  'super_admin': 'Super Admin',
};

export function AgentDetailModal({ agent, open, onOpenChange }: AgentDetailModalProps) {
  const { user, hasMinimumRole } = useAuth();
  const navigate = useNavigate();
  const [viewStats, setViewStats] = useState<{ viewCount: number; lastViewedAt: string | null }>({
    viewCount: 0,
    lastViewedAt: null,
  });

  const minRole = (agent?.min_role_required as AppRole) || 'team_member';
  const userHasAccess = hasMinimumRole(minRole as any);
  const userIsManager = hasMinimumRole('manager');

  useEffect(() => {
    if (open && agent && user) {
      // Record view
      recordAgentView(agent.id, user.id);
      
      // Fetch view stats for managers
      if (userIsManager) {
        getAgentViewStats(agent.id).then(setViewStats);
      }
    }
  }, [open, agent, user, userIsManager]);

  if (!agent) return null;

  const benefits = agent.benefits || [];
  const useCases = agent.use_cases || [];

  const handleNavigate = () => {
    if (agent.usage_route) {
      onOpenChange(false);
      navigate(agent.usage_route);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold text-foreground line-clamp-2">
                {agent.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {agent.category || "General"}
                </Badge>
                <Badge 
                  variant={agent.is_active ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {agent.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Description */}
          <div>
            <p className="text-muted-foreground leading-relaxed">
              {agent.description || "AI-powered automation agent"}
            </p>
          </div>

          <Separator />

          {/* Where to Find It */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Where to Find It</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-foreground">
                {agent.usage_location || "Available across the platform"}
              </p>
              {agent.usage_route && (
                userHasAccess ? (
                  <Button 
                    size="sm" 
                    onClick={handleNavigate}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Go There
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Requires {roleLabels[minRole]} access or higher</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Who Can Use It */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Shield className="h-4 w-4 text-primary" />
              <span>Who Can Use It</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Minimum Role: {roleLabels[minRole]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {userHasAccess 
                      ? "You have access to this agent" 
                      : "Contact your manager for access"}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  userHasAccess 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {userHasAccess ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Why Use This Agent */}
          {(benefits.length > 0 || useCases.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span>Why Use This Agent</span>
              </div>
              
              {benefits.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Benefits
                  </p>
                  <ul className="space-y-2">
                    {benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {useCases.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    When to Use
                  </p>
                  <ul className="space-y-2">
                    {useCases.map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Analytics (Managers Only) */}
          {userIsManager && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Usage Analytics</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-foreground">
                      {viewStats.viewCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground">
                      {viewStats.lastViewedAt 
                        ? format(new Date(viewStats.lastViewedAt), "MMM d, yyyy")
                        : "Never"}
                    </p>
                    <p className="text-xs text-muted-foreground">Last Viewed</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
