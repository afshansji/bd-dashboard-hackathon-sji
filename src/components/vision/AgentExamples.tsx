import { useState } from "react";
import { Play, Clock, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const agentExamples = [
  {
    id: "bd-research",
    name: "BD Research Analyst",
    before: {
      task: "Research a new lead company",
      time: "2-3 hours of manual research",
      effort: "Searching LinkedIn, Crunchbase, news articles, company website",
    },
    after: {
      time: "30 seconds",
      output: `**Company Analysis: TechStartup Inc.**

• **Founded:** 2019, San Francisco
• **Funding:** Series B ($25M from Sequoia)
• **Team Size:** 45 employees, growing 40% YoY
• **Tech Stack:** React, Node.js, AWS
• **Key Decision Makers:** CEO Jane Smith (ex-Google)
• **Recent News:** Launched enterprise product Q4 2024
• **Pain Points:** Scaling engineering team, need dev agency
• **Recommendation:** High-priority lead, align with scale-up services`,
    },
  },
  {
    id: "linkedin-message",
    name: "LinkedIn Message Generator",
    before: {
      task: "Craft personalized outreach message",
      time: "15-20 minutes per contact",
      effort: "Review profile, find common ground, write message, edit for tone",
    },
    after: {
      time: "5 seconds",
      output: `**Personalized Message for John Doe, CTO at ScaleUp:**

Hi John,

I noticed you recently spoke at ReactConf about scaling frontend teams—loved your point about component libraries.

At SJ Innovation, we've helped 12 Series B companies like yours build dedicated dev pods that ship 3x faster. Given ScaleUp's growth trajectory (congrats on the funding!), I thought this might resonate.

Would you be open to a 15-min chat next week?

Best,
[Your name]`,
    },
  },
  {
    id: "deal-status",
    name: "Deal Status Intelligence",
    before: {
      task: "Summarize meeting notes and next steps",
      time: "30-45 minutes",
      effort: "Read notes, identify key points, draft summary, share with team",
    },
    after: {
      time: "15 seconds",
      output: `**Meeting Summary: Discovery Call - Acme Corp**

**Status:** Moved to Proposal stage ✅

**Key Takeaways:**
• Budget confirmed: $150K-200K
• Timeline: Q2 launch critical
• Champion: VP Engineering (Sarah)
• Blocker: Need security compliance docs

**Next Steps:**
1. Send SOC2 documentation (Due: Tomorrow)
2. Schedule technical deep-dive (Suggested: Friday)
3. Prepare initial proposal draft

**Risk Level:** Medium - competitor also in talks`,
    },
  },
];

const AgentExamples = () => {
  const [selectedAgent, setSelectedAgent] = useState(agentExamples[0].id);
  const [showOutput, setShowOutput] = useState(false);
  
  const currentExample = agentExamples.find(a => a.id === selectedAgent)!;

  const handleRun = () => {
    setShowOutput(false);
    setTimeout(() => setShowOutput(true), 500);
  };

  return (
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-2">See Agents in Action</h2>
      <p className="text-muted-foreground mb-6">
        Interactive examples showing what each agent can do
      </p>
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedAgent} onValueChange={(v) => { setSelectedAgent(v); setShowOutput(false); }}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agentExamples.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleRun} className="gap-2">
            <Play className="h-4 w-4" />
            Run Example
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Before */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <Clock className="h-5 w-5" />
                Before: Manual Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-foreground">Task:</span>
                <p className="text-sm text-muted-foreground">{currentExample.before.task}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Time Required:</span>
                <p className="text-sm text-muted-foreground">{currentExample.before.time}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Manual Effort:</span>
                <p className="text-sm text-muted-foreground">{currentExample.before.effort}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* After */}
          <Card className={`border-primary/20 transition-all duration-500 ${showOutput ? 'bg-primary/5' : 'bg-muted/50'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Zap className="h-5 w-5" />
                After: AI Agent
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {currentExample.after.time}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showOutput ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-xs bg-card/50 p-4 rounded-lg border overflow-auto max-h-64">
                    {currentExample.after.output}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Click "Run Example" to see output
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AgentExamples;
