import { Brain, Workflow, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pillars = [
  {
    icon: Brain,
    title: "Always-On Intelligence",
    description:
      "Agents anticipate opportunities across verticals and surface actionable briefs without human prompts. The system learns from every interaction.",
    gradient: "from-violet-500 to-purple-600",
    bgGradient: "from-violet-500/10 to-purple-600/10",
    iconColor: "text-violet-600",
  },
  {
    icon: Workflow,
    title: "Composable Workflows",
    description:
      "Business teams orchestrate complex BD sequences—research → outreach → follow-up—without writing code. Mix and match agents like building blocks.",
    gradient: "from-cyan-500 to-blue-600",
    bgGradient: "from-cyan-500/10 to-blue-600/10",
    iconColor: "text-cyan-600",
  },
  {
    icon: UserCheck,
    title: "Human-in-the-Loop",
    description:
      "Clear checkpoints for approvals, ensuring compliance and relationship nuance. AI suggests, humans decide. Full audit trail for every action.",
    gradient: "from-emerald-500 to-teal-600",
    bgGradient: "from-emerald-500/10 to-teal-600/10",
    iconColor: "text-emerald-600",
  },
];

const VisionPillars = () => {
  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-3">
          Why We Built This
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Three core principles that guide everything we create
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {pillars.map((pillar, index) => (
          <Card 
            key={pillar.title} 
            className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden relative border-0`}
          >
            {/* Gradient border effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${pillar.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="absolute inset-[2px] bg-background rounded-lg" />
            
            <CardContent className="relative p-8">
              {/* Icon with gradient background */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                <pillar.icon className="h-8 w-8 text-white" />
              </div>
              
              {/* Number indicator */}
              <div className={`absolute top-6 right-6 w-8 h-8 rounded-full bg-gradient-to-br ${pillar.bgGradient} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${pillar.iconColor}`}>{index + 1}</span>
              </div>
              
              <h3 className="font-bold text-xl text-foreground mb-3">
                {pillar.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default VisionPillars;