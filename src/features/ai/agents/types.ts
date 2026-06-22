import type {
  AIAgent,
  AgentConfigurationEnvelope,
  AgentDataSourceConfig,
  AgentDetailsPayload,
  AgentOutputActions,
  AgentScheduleConfig,
  AgentProviderConfig,
} from "@/Api/aiAgents";

export interface AgentFormState extends AgentDetailsPayload {
  id?: string;
}

export const DEFAULT_PROVIDER: AgentProviderConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
};

export const DEFAULT_FORM_STATE: AgentFormState = {
  name: "",
  description: "",
  slug: "",
  category: "linkedin",
  type: "linkedin",
  config: {
    providers: {
      primary: { ...DEFAULT_PROVIDER },
      fallback: { ...DEFAULT_PROVIDER },
      research: { provider: "perplexity", model: "sonar-small" },
    },
    features: {
      enableResearch: false,
      enableTelemetry: true,
    },
  },
  is_active: true,
  is_enabled: true,
  memory_enabled: false,
  system_prompt: "",
  prompt_template: "",
  data_source_config: {
    tables: [],
    documents: [],
  } satisfies AgentDataSourceConfig,
  output_actions: {
    create_tasks: false,
    send_alerts: false,
  } satisfies AgentOutputActions,
  schedule_config: {
    schedule: "manual",
    frequency: "weekly",
    run_at: "09:00",
    timezone: "UTC",
  } satisfies AgentScheduleConfig,
};

export function createEmptyAgentFormState(): AgentFormState {
  return {
    ...DEFAULT_FORM_STATE,
    config: {
      providers: {
        primary: { ...DEFAULT_PROVIDER },
        fallback: { ...DEFAULT_PROVIDER },
        research: { provider: "perplexity", model: "sonar-small" },
      },
      features: {
        enableResearch: false,
        enableTelemetry: true,
      },
    },
    data_source_config: {
      tables: [],
      documents: [],
    },
    output_actions: {
      create_tasks: false,
      send_alerts: false,
    },
    schedule_config: {
      schedule: "manual",
      frequency: "weekly",
      run_at: "09:00",
      timezone: "UTC",
    },
  };
}

export function buildAgentFormState(agent?: AIAgent | null): AgentFormState {
  if (!agent) {
    return createEmptyAgentFormState();
  }

  const config: AgentConfigurationEnvelope = {
    providers: {
      primary: {
        ...DEFAULT_PROVIDER,
        ...(agent.config?.providers?.primary || {}),
      },
      fallback: {
        ...DEFAULT_PROVIDER,
        ...(agent.config?.providers?.fallback || {}),
      },
      research: {
        provider: "perplexity",
        model: "sonar-small",
        ...(agent.config?.providers?.research || {}),
      },
    },
    features: {
      enableResearch: agent.config?.features?.enableResearch ?? false,
      enableTelemetry: agent.config?.features?.enableTelemetry ?? true,
    },
  };

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? "",
    slug: agent.slug ?? "",
    category: agent.category ?? "linkedin",
    type: agent.type || agent.category || "linkedin",
    config,
    is_active: agent.is_active ?? agent.is_enabled ?? false,
    is_enabled: agent.is_enabled ?? agent.is_active ?? false,
    memory_enabled: agent.memory_enabled ?? false,
    system_prompt: agent.system_prompt ?? agent.prompt_template ?? "",
    prompt_template: agent.prompt_template ?? agent.system_prompt ?? "",
    data_source_config: {
      tables: agent.data_source_config?.tables || [],
      documents: agent.data_source_config?.documents || [],
    },
    output_actions: {
      create_tasks: Boolean(agent.output_actions?.create_tasks),
      send_alerts: Boolean(agent.output_actions?.send_alerts),
    },
    schedule_config: {
      schedule: agent.schedule_config?.schedule || "manual",
      frequency: agent.schedule_config?.frequency || "weekly",
      run_at: agent.schedule_config?.run_at || "09:00",
      timezone: agent.schedule_config?.timezone || "UTC",
    },
  };
}
