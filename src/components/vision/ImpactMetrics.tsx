import { TrendingUp, Clock, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  {
    icon: TrendingUp,
    value: "30%",
    label: "Pipeline Velocity",
    description: "Increase in qualified pipeline through intelligent lead scoring and automated research",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Clock,
    value: "20%",
    label: "Deal Acceleration",
    description: "Faster deal cycles via automated follow-ups and real-time status intelligence",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    value: "100%",
    label: "Trust & Compliance",
    description: "Audit-ready transparency with complete activity logs and approval workflows",
    color: "from-violet-500 to-purple-500",
  },
];

const ImpactMetrics = () => {
  return (
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-2">Metrics We're Targeting</h2>
      <p className="text-muted-foreground mb-6">
        Our success criteria for the BD AI Portal
      </p>
      
      <div className="grid md:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.label} className="group overflow-hidden">
            <CardContent className="p-6 relative">
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center mb-4`}>
                  <metric.icon className="h-6 w-6 text-white" />
                </div>
                
                <div className={`text-4xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent mb-1`}>
                  {metric.value}
                </div>
                
                <h3 className="font-semibold text-foreground mb-2">
                  {metric.label}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ImpactMetrics;
