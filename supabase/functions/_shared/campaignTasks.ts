export type TaskPriority = "low" | "medium" | "high";

export interface CampaignTaskSeed {
  title: string;
  description?: string | null;
  status?: string;
  priority?: TaskPriority;
  dueInDays?: number | null;
  assigned_to?: string | null;
}

export const DEFAULT_CAMPAIGN_TASK_TEMPLATES: Record<string, CampaignTaskSeed[]> = {
  kickoff: [
    {
      title: "Define campaign messaging",
      description: "Draft outreach messaging and value propositions for the target persona.",
      status: "todo",
      priority: "high",
      dueInDays: 3,
    },
    {
      title: "Build outreach contact list",
      description: "Compile decision makers from the target niche for this campaign.",
      status: "todo",
      priority: "medium",
      dueInDays: 5,
    },
    {
      title: "Launch first sequence",
      description: "Kick off the initial outbound sequence across selected channels.",
      status: "todo",
      priority: "high",
      dueInDays: 7,
    },
  ],
  nurture: [
    {
      title: "Review warm leads",
      description: "Identify prospects that engaged and plan personalized follow ups.",
      status: "todo",
      priority: "high",
      dueInDays: 7,
    },
    {
      title: "Publish nurture content",
      description: "Ship supporting content assets that reinforce campaign messaging.",
      status: "todo",
      priority: "medium",
      dueInDays: 10,
    },
    {
      title: "Schedule status retro",
      description: "Hold a checkpoint with the campaign owner to review performance.",
      status: "todo",
      priority: "medium",
      dueInDays: 14,
    },
  ],
};

interface HydrateOptions {
  templateKey?: string | null;
  customTasks?: CampaignTaskSeed[];
  startDate?: string | null;
}

export function resolveCampaignTaskSeeds(options: HydrateOptions = {}): Record<string, unknown>[] {
  const { templateKey, customTasks, startDate } = options;
  const tasks: CampaignTaskSeed[] = [];

  if (templateKey && DEFAULT_CAMPAIGN_TASK_TEMPLATES[templateKey]) {
    tasks.push(...DEFAULT_CAMPAIGN_TASK_TEMPLATES[templateKey]);
  }

  if (Array.isArray(customTasks) && customTasks.length > 0) {
    tasks.push(...customTasks);
  }

  if (!tasks.length) {
    return [];
  }

  const baseDate = startDate ? new Date(startDate) : new Date();

  return tasks.map((task) => {
    const dueDate = typeof task.dueInDays === "number"
      ? new Date(baseDate.getTime() + task.dueInDays * 24 * 60 * 60 * 1000)
      : null;

    return {
      title: task.title,
      description: task.description ?? null,
      status: task.status ?? "todo",
      priority: task.priority ?? "medium",
      due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
      assigned_to: task.assigned_to ?? null,
    } as Record<string, unknown>;
  });
}
