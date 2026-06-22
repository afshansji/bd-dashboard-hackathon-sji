# AI Agent Backlog - Technical Implementation Guide

**Purpose**: Technical reference for implementing the AI agent workflows defined in the product backlog.

**Last Updated**: 2025-01-12

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent Configuration Schema](#agent-configuration-schema)
3. [Edge Function Patterns](#edge-function-patterns)
4. [Database Triggers](#database-triggers)
5. [Scheduling Patterns](#scheduling-patterns)
6. [Testing Requirements](#testing-requirements)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Agent       │  │ Alert       │  │ Dashboard Widgets       │ │
│  │ Config UI   │  │ Display     │  │ (Briefings, Scores)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    run-ai-agent                              ││
│  │  • Agent orchestration                                       ││
│  │  • Data fetching                                             ││
│  │  • Lovable AI integration                                    ││
│  │  • Output routing                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Scheduled   │  │ Webhook     │  │ Agent-specific          │ │
│  │ Triggers    │  │ Handlers    │  │ Functions               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ ai_agents   │  │ ai_agent_   │  │ control_tower_alerts    │ │
│  │ (config)    │  │ runs (logs) │  │ (outputs)               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Source Tables (deals, tasks, etc.)             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LOVABLE AI                                  │
│  • google/gemini-2.5-flash (default - fast, efficient)          │
│  • google/gemini-2.5-pro (complex reasoning)                    │
│  • openai/gpt-5-mini (balanced performance)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Configuration Schema

### ai_agents Table Structure

```typescript
interface AgentConfig {
  id: string;
  name: string;
  slug: string;
  type: 'scheduled' | 'event' | 'manual';
  category: string;
  description: string;
  is_enabled: boolean;
  
  // Core configuration
  config: {
    model: string;           // Lovable AI model identifier
    temperature: number;     // 0-1, lower = more deterministic
    max_tokens: number;      // Response length limit
    timeout_ms: number;      // Execution timeout
  };
  
  // Data sources
  data_source_config: {
    tables: Array<{
      name: string;
      fields: string[];
      filters?: Record<string, any>;
      limit?: number;
    }>;
    external_apis?: string[];  // e.g., ['exa']
  };
  
  // Scheduling (for type = 'scheduled')
  schedule_config: {
    cron: string;            // Cron expression
    timezone: string;        // e.g., 'America/New_York'
    enabled: boolean;
  };
  
  // Output configuration
  output_actions: {
    create_alert: boolean;
    alert_severity: 'info' | 'warn' | 'error';
    send_email: boolean;
    email_recipients?: string[];
    create_task: boolean;
    store_result: boolean;
  };
  
  // Prompts
  system_prompt: string;
  prompt_template: string;
}
```

### Sample Agent Configuration

```json
{
  "id": "agent-m1-daily-briefing",
  "name": "Daily Manager Intelligence Briefing",
  "slug": "daily-manager-briefing",
  "type": "scheduled",
  "category": "manager-productivity",
  "description": "Generates daily intelligence briefing for managers",
  "is_enabled": true,
  "config": {
    "model": "google/gemini-2.5-flash",
    "temperature": 0.3,
    "max_tokens": 2000,
    "timeout_ms": 30000
  },
  "data_source_config": {
    "tables": [
      {
        "name": "eod_reports",
        "fields": ["user_id", "report_date", "accomplishments", "challenges", "blockers"],
        "filters": { "report_date": "today" }
      },
      {
        "name": "tasks",
        "fields": ["assigned_to", "status", "due_date", "priority"],
        "filters": { "status": ["pending", "in_progress", "overdue"] }
      },
      {
        "name": "deals",
        "fields": ["title", "stage", "amount", "owner_id", "last_activity_date"],
        "filters": { "status": "active" }
      }
    ]
  },
  "schedule_config": {
    "cron": "0 6 * * *",
    "timezone": "America/New_York",
    "enabled": true
  },
  "output_actions": {
    "create_alert": true,
    "alert_severity": "info",
    "send_email": false,
    "store_result": true
  },
  "system_prompt": "You are an executive assistant preparing a daily intelligence briefing for a sales manager...",
  "prompt_template": "Based on the following data, create a structured daily briefing:\n\nEOD Reports:\n{{eod_reports}}\n\nTask Status:\n{{tasks}}\n\nDeal Updates:\n{{deals}}"
}
```

---

## Edge Function Patterns

### run-ai-agent Enhancement

```typescript
// supabase/functions/run-ai-agent/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AgentRunRequest {
  agent_id?: string;
  agent_slug?: string;
  user_context?: string;
  override_config?: Partial<AgentConfig>;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { agent_id, agent_slug, user_context, override_config } = await req.json() as AgentRunRequest;

    // 1. Load agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .or(`id.eq.${agent_id},slug.eq.${agent_slug}`)
      .single();

    if (agentError || !agent) {
      throw new Error("Agent not found");
    }

    // 2. Create run record
    const { data: run, error: runError } = await supabase
      .from("ai_agent_runs")
      .insert({
        agent_id: agent.id,
        status: "running",
        started_at: new Date().toISOString(),
        user_context,
        execution_context: { triggered_by: "api" }
      })
      .select()
      .single();

    // 3. Fetch data from configured sources
    const sourceData = await fetchAgentData(supabase, agent.data_source_config);

    // 4. Build prompt from template
    const prompt = buildPrompt(agent.prompt_template, sourceData, user_context);

    // 5. Call Lovable AI
    const aiResponse = await callLovableAI({
      model: agent.config.model,
      system_prompt: agent.system_prompt,
      prompt,
      temperature: agent.config.temperature,
      max_tokens: agent.config.max_tokens
    });

    // 6. Process outputs based on configuration
    await processOutputs(supabase, agent, run.id, aiResponse);

    // 7. Update run record
    await supabase
      .from("ai_agent_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        output: aiResponse.raw,
        structured_output: aiResponse.structured
      })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({ success: true, run_id: run.id, output: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Agent execution error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchAgentData(supabase: any, config: DataSourceConfig) {
  const results: Record<string, any[]> = {};
  
  for (const table of config.tables) {
    let query = supabase
      .from(table.name)
      .select(table.fields.join(","));
    
    if (table.filters) {
      for (const [key, value] of Object.entries(table.filters)) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value === "today") {
          query = query.gte(key, new Date().toISOString().split("T")[0]);
        } else {
          query = query.eq(key, value);
        }
      }
    }
    
    if (table.limit) {
      query = query.limit(table.limit);
    }
    
    const { data, error } = await query;
    if (!error) {
      results[table.name] = data;
    }
  }
  
  return results;
}

function buildPrompt(template: string, data: Record<string, any[]>, userContext?: string) {
  let prompt = template;
  
  for (const [key, value] of Object.entries(data)) {
    prompt = prompt.replace(`{{${key}}}`, JSON.stringify(value, null, 2));
  }
  
  if (userContext) {
    prompt = prompt.replace("{{user_context}}", userContext);
  }
  
  return prompt;
}

async function callLovableAI(config: AIConfig) {
  // Use Lovable AI endpoint (no API key needed)
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/lovable-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: config.system_prompt },
        { role: "user", content: config.prompt }
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens
    })
  });
  
  return response.json();
}

async function processOutputs(supabase: any, agent: AgentConfig, runId: string, aiResponse: any) {
  const outputs = agent.output_actions;
  
  if (outputs.create_alert) {
    await supabase.from("control_tower_alerts").insert({
      alert_type: `agent_${agent.slug}`,
      title: `${agent.name} - New Insights`,
      message: aiResponse.summary || "Agent completed successfully",
      severity: outputs.alert_severity,
      status: "open",
      metadata: { run_id: runId, agent_id: agent.id }
    });
  }
  
  if (outputs.create_task && aiResponse.generated_tasks) {
    for (const task of aiResponse.generated_tasks) {
      await supabase.from("tasks").insert({
        title: task.title,
        description: task.description,
        priority: task.priority || "medium",
        status: "pending",
        source: `agent:${agent.slug}`
      });
    }
  }
}
```

---

## Database Triggers

### Auto-Set created_by Trigger

```sql
-- Master trigger function
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to tables needing the trigger
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'ai_agent_runs',
    'ai_agent_templates', 
    'ai_business_context',
    'analytics_data',
    'brand_kpis',
    'brands',
    'campaign_contact_linkedin_messages',
    'campaign_financial_data',
    'campaign_kpis',
    'campaign_research',
    'campaign_sequences',
    'checklist_templates',
    'contact_sequence_enrollments'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_created_by_trigger ON public.%I;
       CREATE TRIGGER set_created_by_trigger
         BEFORE INSERT ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.set_created_by();',
      t, t
    );
  END LOOP;
END $$;
```

### Agent Run Completion Trigger

```sql
-- Trigger to handle post-agent-run actions
CREATE OR REPLACE FUNCTION public.handle_agent_run_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update agent's last_run_at
  IF NEW.status = 'completed' THEN
    UPDATE public.ai_agents
    SET last_run_at = NEW.completed_at,
        updated_at = NOW()
    WHERE id = NEW.agent_id;
    
    -- Calculate and update success rate
    UPDATE public.ai_agents a
    SET success_rate = (
      SELECT 
        ROUND(
          COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        )
      FROM public.ai_agent_runs
      WHERE agent_id = a.id
      AND started_at > NOW() - INTERVAL '30 days'
    )
    WHERE id = NEW.agent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER agent_run_completion_trigger
  AFTER UPDATE ON public.ai_agent_runs
  FOR EACH ROW
  WHEN (OLD.status = 'running' AND NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION public.handle_agent_run_completion();
```

---

## Scheduling Patterns

### Using pg_cron (if available)

```sql
-- Schedule daily manager briefing at 6 AM EST
SELECT cron.schedule(
  'daily-manager-briefing',
  '0 11 * * *',  -- 6 AM EST = 11 AM UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/run-ai-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'agent_slug', 'daily-manager-briefing'
    )
  );
  $$
);
```

### Using External Scheduler (Alternative)

For projects without pg_cron, use:
- Supabase Database Webhooks
- External cron service (cron-job.org, GitHub Actions)
- Lovable scheduled functions (when available)

---

## Testing Requirements

### Unit Tests

```typescript
// tests/agents/daily-briefing.test.ts

describe("Daily Manager Briefing Agent", () => {
  it("should fetch data from all configured sources", async () => {
    // Test data fetching
  });
  
  it("should generate structured output", async () => {
    // Test output format
  });
  
  it("should create alert on completion", async () => {
    // Test alert creation
  });
  
  it("should handle missing data gracefully", async () => {
    // Test edge cases
  });
});
```

### Integration Tests

```typescript
// tests/integration/agent-flow.test.ts

describe("Agent End-to-End Flow", () => {
  it("should complete full agent lifecycle", async () => {
    // 1. Trigger agent
    // 2. Verify run record created
    // 3. Verify AI called
    // 4. Verify outputs created
    // 5. Verify run completed
  });
});
```

### Manual Testing Checklist

- [ ] Agent can be triggered manually from UI
- [ ] Scheduled execution works correctly
- [ ] Data fetching returns expected results
- [ ] AI response is properly formatted
- [ ] Alerts are created with correct severity
- [ ] Run history is properly logged
- [ ] Errors are handled and logged

---

## Security Considerations

### RLS Policies for Agent Tables

```sql
-- ai_agent_runs: Users can view runs they triggered
CREATE POLICY "Users can view own agent runs"
  ON public.ai_agent_runs FOR SELECT
  USING (executed_by = auth.uid());

-- Admins can view all runs
CREATE POLICY "Admins can view all agent runs"
  ON public.ai_agent_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Service Role Usage

Agent edge functions use `SUPABASE_SERVICE_ROLE_KEY` for:
- Bypassing RLS when fetching aggregate data
- Creating alerts on behalf of the system
- Updating agent run records

**Never expose service role key to frontend.**

---

## Monitoring & Observability

### Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Agent execution time | ai_agent_runs | > 60 seconds |
| Agent failure rate | ai_agent_runs | > 10% in 24h |
| Alert creation rate | control_tower_alerts | Anomaly detection |
| AI API latency | Edge function logs | > 10 seconds |

### Logging Pattern

```typescript
console.log(JSON.stringify({
  level: "info",
  agent: agent.slug,
  run_id: run.id,
  event: "execution_started",
  timestamp: new Date().toISOString()
}));
```

---

*This technical guide accompanies the product backlog. Keep both documents in sync when implementing new agents.*
