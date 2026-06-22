import { 
  Target, 
  Megaphone, 
  BarChart3, 
  PenTool, 
  MessageSquare, 
  CheckSquare,
  Zap,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface FeatureSection {
  title: string;
  description: string;
  badgeColor: string;
  features: {
    icon: React.ElementType;
    name: string;
    description: string;
    href: string;
    gradient: string;
    shadowColor: string;
  }[];
}

const featureSections: FeatureSection[] = [
  {
    title: "BD Workflow",
    description: "Core business development process from lead to client",
    badgeColor: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
    features: [
      {
        icon: Target,
        name: "Pipeline Management",
        description: "Lead discovery to client conversion in 5 intelligent stages",
        href: "/prospecting",
        gradient: "from-emerald-500 to-teal-500",
        shadowColor: "shadow-emerald-500/25",
      },
      {
        icon: Megaphone,
        name: "Outreach & Campaigns",
        description: "Multi-channel campaign management with ROI tracking",
        href: "/campaigns",
        gradient: "from-violet-500 to-purple-600",
        shadowColor: "shadow-violet-500/25",
      },
      {
        icon: BarChart3,
        name: "Performance Tracking",
        description: "Personal dashboards, meetings, and EOD reports",
        href: "/bd/performance/personal",
        gradient: "from-blue-500 to-cyan-500",
        shadowColor: "shadow-blue-500/25",
      },
    ],
  },
  {
    title: "Daily Work",
    description: "Day-to-day tasks and team coordination",
    badgeColor: "bg-gradient-to-r from-indigo-500 to-blue-500 text-white",
    features: [
      {
        icon: CheckSquare,
        name: "Task Management",
        description: "Action items, notifications, and daily submissions",
        href: "/bd/actions/my-tasks",
        gradient: "from-indigo-500 to-blue-600",
        shadowColor: "shadow-indigo-500/25",
      },
      {
        icon: MessageSquare,
        name: "Feedback System",
        description: "Bug reports and feature requests with upvoting",
        href: "/feedback",
        gradient: "from-pink-500 to-rose-500",
        shadowColor: "shadow-pink-500/25",
      },
    ],
  },
  {
    title: "Tools",
    description: "Specialized tools for BD operations",
    badgeColor: "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
    features: [
      {
        icon: PenTool,
        name: "Document Signing",
        description: "Proposal signing workflow with PandaDoc integration",
        href: "/signing-documents",
        gradient: "from-orange-500 to-amber-500",
        shadowColor: "shadow-orange-500/25",
      },
      {
        icon: Zap,
        name: "Sequences",
        description: "Automated outreach sequences for consistent follow-ups",
        href: "/sequences",
        gradient: "from-yellow-500 to-orange-500",
        shadowColor: "shadow-yellow-500/25",
      },
    ],
  },
];

const FeatureShowcase = () => {
  return (
    <section className="space-y-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-3">Platform Modules</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Everything you need to manage business development, integrated seamlessly
        </p>
      </div>
      
      {featureSections.map((section) => (
        <div key={section.title} className="space-y-6">
          {/* Section header with badge */}
          <div className="flex items-center gap-4">
            <Badge className={`${section.badgeColor} border-0 px-4 py-1.5 text-sm font-semibold shadow-lg`}>
              {section.title}
            </Badge>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <p className="text-muted-foreground pl-1">
            {section.description}
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {section.features.map((feature) => (
              <Link key={feature.name} to={feature.href} className="group">
                <Card className={`h-full hover:shadow-xl ${feature.shadowColor} transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden border-0 bg-gradient-to-br from-background to-muted/30`}>
                  <CardContent className="p-6 relative">
                    {/* Hover gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <div className="relative">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg ${feature.shadowColor}`}>
                        <feature.icon className="h-7 w-7 text-white" />
                      </div>
                      
                      {/* Content */}
                      <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                        {feature.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {feature.description}
                      </p>
                      
                      {/* Explore link */}
                      <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span>Explore</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
};

export default FeatureShowcase;