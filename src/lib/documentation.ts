import { BookOpen, Database, Workflow, ArchiveRestore, ClipboardCheck, Plug, Sparkles, Rocket, type LucideIcon } from "lucide-react";

export interface DocCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  items: DocItem[];
}

export interface DocItem {
  id: string;
  title: string;
  description: string;
  category: string;
  file: string;
  tags?: string[];
  lastUpdated?: string;
}

export const documentationIndex: DocCategory[] = [
  {
    id: "backlog",
    title: "Product Backlog",
    icon: Rocket,
    description: "AI agent workflows, implementation roadmap, and prioritized feature backlog.",
    items: [
      {
        id: "ai-agent-backlog",
        title: "AI Agent Workflow Backlog",
        description: "Prioritized list of 15+ AI agents for productivity, sales, campaigns, and client success.",
        category: "backlog",
        file: "ai-agent-backlog.md",
        tags: ["ai", "agents", "backlog", "workflow", "automation", "productivity", "roadmap"],
        lastUpdated: "2025-01-12",
      },
    ],
  },
  {
    id: "vision",
    title: "Vision & Strategy",
    icon: Sparkles,
    description: "North Star product vision, agent ecosystem, and roadmap priorities.",
    items: [
      {
        id: "bd-ai-portal-vision-2025",
        title: "BD AI Portal Vision 2025",
        description: "Visual vision plan outlining architecture, agents, and roadmap milestones.",
        category: "vision",
        file: "BD_AI_Visual_Vision.md",
        tags: ["vision", "roadmap", "strategy", "ai agents"],
        lastUpdated: "2025-10-22",
      },
    ],
  },
  {
    id: "overview",
    title: "Overview",
    icon: BookOpen,
    description: "Project mission, stack, folder structure, and operational context.",
    items: [
      {
        id: "project-overview",
        title: "Project Overview",
        description: "High-level description of the SJ Business Development AI Platform and build commands.",
        category: "overview",
        file: "overview.md",
        tags: ["summary", "setup", "environment"],
        lastUpdated: "2025-02-18"
      }
    ]
  },
  {
    id: "database",
    title: "Database Schema",
    icon: Database,
    description: "Postgres tables, fields, and sample payloads for Supabase-managed data.",
    items: [
      {
        id: "schema",
        title: "Database Schema",
        description: "Complete reference of tables powering CRM, AI, and reporting flows.",
        category: "database",
        file: "database-schema.md",
        tags: ["supabase", "tables", "schema"],
        lastUpdated: "2025-02-18"
      }
    ]
  },
  {
    id: "logic",
    title: "Logic & Functions",
    icon: Workflow,
    description: "Edge functions, React service layer, and automation pipelines.",
    items: [
      {
        id: "logic-functions",
        title: "Logic & Functions",
        description: "Details of Supabase edge functions, client hooks, and automation flow.",
        category: "logic",
        file: "logic-and-functions.md",
        tags: ["edge functions", "api", "automation"],
        lastUpdated: "2025-02-18"
      }
    ]
  },
  {
    id: "unused",
    title: "Unused Analysis",
    icon: ArchiveRestore,
    description: "Inventory of dormant code paths and tables with recommended next steps.",
    items: [
      {
        id: "unused-analysis",
        title: "Unused Analysis",
        description: "Highlights modules and database assets currently not surfaced in the UI.",
        category: "unused",
        file: "unused-analysis.md",
        tags: ["cleanup", "audit"],
        lastUpdated: "2025-02-18"
      }
    ]
  },
  {
    id: "checklist",
    title: "Review Checklist",
    icon: ClipboardCheck,
    description: "QA steps for keeping documentation and data consistent.",
    items: [
      {
        id: "review-checklist",
        title: "Review Checklist",
        description: "Markdown checklist for QA/Admin sign-off.",
        category: "checklist",
        file: "review-checklist.md",
        tags: ["qa", "process"],
        lastUpdated: "2025-02-18"
      }
    ]
  },
  {
    id: "accountability",
    title: "Accountability Chart",
    icon: ClipboardCheck,
    description: "Quarterly goal setting, progress tracking, and team accountability module documentation.",
    items: [
      {
        id: "accountability-user-guide",
        title: "User Guide & Workflows",
        description: "Complete guide for team members and reps on setting goals, tracking activities, and submitting progress updates. Includes role-based user flows.",
        category: "accountability",
        file: "accountability-chart-user-guide.md",
        tags: ["accountability", "goals", "progress", "workflow", "user-guide"],
        lastUpdated: "2026-02-12"
      },
      {
        id: "accountability-admin-guide",
        title: "Admin & Configuration Guide",
        description: "Manager and admin documentation for managing quarters, team goals, approval workflows, data auditing, and system configuration.",
        category: "accountability",
        file: "accountability-chart-admin-guide.md",
        tags: ["accountability", "admin", "management", "configuration", "approval"],
        lastUpdated: "2026-02-12"
      },
      {
        id: "accountability-api-reference",
        title: "API & Technical Reference",
        description: "Developer documentation for React hooks, database operations, TypeScript types, error handling, and code examples.",
        category: "accountability",
        file: "accountability-chart-api-reference.md",
        tags: ["accountability", "api", "technical", "hooks", "database"],
        lastUpdated: "2026-02-12"
      }
    ]
  },
  {
    id: "integrations",
    title: "Integrations & Modules",
    icon: Plug,
    description: "Modular features: Bug tracking, product catalog, Control Tower sync, and reusable components.",
    items: [
      {
        id: "bug-tracking",
        title: "Bug & Feature Tracking",
        description: "Lightweight feedback system with admin triage workspace.",
        category: "integrations",
        file: "bug-tracking-integration.md",
        tags: ["feedback", "bugs", "features", "support"],
        lastUpdated: "2025-10-22"
      },
      {
        id: "products-services",
        title: "Products & Services Catalog",
        description: "Manage SJ Innovation's service offerings and product portfolio.",
        category: "integrations",
        file: "products-and-services.md",
        tags: ["products", "services", "catalog", "offerings"],
        lastUpdated: "2025-10-22"
      },
      {
        id: "control-tower-sync",
        title: "Control Tower Synchronization",
        description: "Bi-directional sync between BD Portal and Control Tower CRM.",
        category: "integrations",
        file: "control-tower-sync.md",
        tags: ["sync", "control-tower", "crm", "integration"],
        lastUpdated: "2025-10-22"
      },
      {
        id: "exa-integration",
        title: "Exa Search Integration",
        description: "Connect Exa research, configure secrets, and manage module permissions.",
        category: "integrations",
        file: "exa-integration.md",
        tags: ["exa", "research", "ai", "integration"],
        lastUpdated: "2025-10-22"
      }
      ,
      {
        id: "analytics-api",
        title: "Analytics API (Usage Export)",
        description: "Expose daily/weekly/monthly usage stats to external projects via shared-secret API + optional webhook push.",
        category: "integrations",
        file: "analytics-api.md",
        tags: ["analytics", "api", "usage", "export", "webhook", "supabase", "edge functions"],
        lastUpdated: "2026-02-10"
      }
    ]
  }
];

export function getAllDocItems(): DocItem[] {
  return documentationIndex.flatMap((category) => category.items);
}

export function getDocByFile(file: string): DocItem | undefined {
  return getAllDocItems().find((item) => item.file === file);
}

export function getCategoryById(id: string): DocCategory | undefined {
  return documentationIndex.find((category) => category.id === id);
}
