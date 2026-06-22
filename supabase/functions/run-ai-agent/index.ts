import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders } from "../_shared/cors.ts";
import {
  AgentConfig,
  ProviderConfig,
  ProviderName,
  buildProviderChain,
  invokeProvider,
  ProviderTelemetry,
} from "../_shared/providers.ts";

const AgentRunRequestSchema = z.object({
  agent_id: z.string().uuid().optional(),
  agent_type: z.string().optional(),
  target: z.enum(["deal", "client", "client_intelligence", "bd_manager_chat"]).optional(),
  client_id: z.string().uuid().optional(),
  question: z.string().optional(),
  mode: z.enum(["quick", "deep"]).optional(),
  execution_context: z.object({
    timeframe: z.string().optional(),
    filters: z.record(z.any()).optional(),
    office_ids: z.array(z.string()).optional(),
    user_id: z.string().uuid().optional(),
    deal_id: z.string().uuid().optional(),
    deal_title: z.string().optional(),
    client_name: z.string().optional(),
    deal_stage: z.string().optional(),
  }).optional(),
  file_ids: z.array(z.string().uuid()).optional(),
  user_context: z.string().optional(),
  conversation_history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  current_question: z.string().optional(),
});

const MetricsSchema = z.object({
  total_items_analyzed: z.number().nonnegative().default(0),
  anomalies_found: z.number().nonnegative().default(0),
  high_priority_issues: z.number().nonnegative().default(0),
});

const ActionItemSchema = z.object({
  type: z.enum(["task", "note"]).default("task"),
  description: z.string(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  assignee: z.string().optional(),
  due_date: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const StructuredOutputBaseSchema = z.object({
  industry: z.string().optional().nullable(),
  employee_count: z.union([z.string(), z.number()]).optional().nullable(),
  revenue: z.union([z.string(), z.number()]).optional().nullable(),
  summary: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const StructuredOutputSchema = StructuredOutputBaseSchema.optional();

type StructuredOutput = z.infer<typeof StructuredOutputBaseSchema>;

const AgentResponseSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  action_items: z.array(ActionItemSchema).default([]),
  metrics: MetricsSchema.default({
    total_items_analyzed: 0,
    anomalies_found: 0,
    high_priority_issues: 0,
  }),
  confidence_score: z.number().min(0).max(1).optional(),
  insights: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  structured_output: z.record(z.any()).optional(),
}).passthrough();

type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Tool calling schema for BD lead analysis
const bdAnalysisToolSchema = {
  type: "function" as const,
  function: {
    name: "provide_lead_analysis",
    description: "Provide comprehensive BD lead analysis with all required fields",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2-3 sentence executive summary of lead value and campaign fit"
        },
        findings: {
          type: "array",
          items: { type: "string" },
          description: "8-12 key insights in bullet format"
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "3-7 strategic recommendations"
        },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["task", "research", "outreach"] },
              description: { type: "string" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              due_date: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 }
            },
            required: ["type", "description", "priority", "confidence"]
          }
        },
        metrics: {
          type: "object",
          properties: {
            total_items_analyzed: { type: "integer" },
            high_priority_issues: { type: "integer" },
            anomalies_found: { type: "integer" }
          },
          required: ["total_items_analyzed", "high_priority_issues", "anomalies_found"]
        },
        confidence_score: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Overall confidence based on data completeness"
        },
        insights: {
          type: "array",
          items: { type: "string" },
          description: "Context-specific insights, industry considerations, market timing"
        },
        risks: {
          type: "array",
          items: { type: "string" },
          description: "Potential challenges, objections, competitive threats"
        },
        structured_output: {
          type: "object",
          properties: {
            lead_quality_score: {
              type: "string",
              enum: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"],
              description: "Lead quality grade"
            },
            engagement_readiness: {
              type: "string",
              enum: ["hot", "warm", "cold"],
              description: "Engagement readiness assessment"
            },
            decision_maker_level: {
              type: "string",
              enum: ["C-suite", "VP", "Director", "Manager", "Individual Contributor"],
              description: "Decision-making authority level"
            },
            best_approach: {
              type: "string",
              enum: ["consultative", "educational", "solution-focused", "relationship-building"],
              description: "Recommended approach strategy"
            },
            estimated_deal_size: {
              type: "string",
              description: "Estimated deal size range or 'Not applicable'"
            },
            sales_cycle_estimate: {
              type: "string",
              description: "Estimated sales cycle duration"
            },
            recommended_next_step: {
              type: "string",
              description: "Specific recommended action"
            },
            recommended_timing: {
              type: "string",
              enum: ["now", "this week", "this month", "next quarter"],
              description: "Recommended timing for next action"
            },
            key_talking_points: {
              type: "array",
              items: { type: "string" },
              description: "3-5 key talking points for outreach"
            }
          },
          required: [
            "lead_quality_score",
            "engagement_readiness",
            "decision_maker_level",
            "best_approach",
            "recommended_next_step",
            "recommended_timing",
            "key_talking_points"
          ]
        }
      },
      required: [
        "summary",
        "findings",
        "recommendations",
        "action_items",
        "metrics",
        "confidence_score",
        "insights",
        "risks",
        "structured_output"
      ]
    }
  }
};

// Tool calling schema for Client Intelligence analysis
const clientIntelligenceToolSchema = {
  type: "function" as const,
  function: {
    name: "provide_client_intelligence",
    description: "Provide comprehensive client intelligence analysis with structured insights",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2-3 sentence executive summary directly answering the user's question. Be specific - reference deal names, dollar amounts, dates."
        },
        key_findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              finding: { type: "string", description: "The insight or finding - be specific with names, dates, amounts" },
              evidence: { type: "string", description: "Exact quote or data point from the provided context that supports this finding" },
              source_type: { type: "string", enum: ["deal", "comment", "followup", "document", "campaign_contact", "client_profile"] },
              source_reference: { type: "string", description: "Specific reference (e.g., deal title, comment date, follow-up title)" },
              confidence: { type: "string", enum: ["high", "medium", "low"] }
            },
            required: ["finding", "evidence", "source_type", "source_reference", "confidence"]
          },
          description: "3-7 key findings with evidence and source attribution"
        },
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk_description: { type: "string", description: "Specific risk with context (which deal, what amount at stake)" },
              severity: { type: "string", enum: ["high", "medium", "low"] },
              affected_entity: { type: "string", description: "Which deal or relationship is affected" },
              recommendation: { type: "string", description: "Specific action to mitigate - who should do what by when" }
            },
            required: ["risk_description", "severity", "affected_entity", "recommendation"]
          },
          description: "Identified risks with severity and mitigation recommendations"
        },
        opportunities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              opportunity: { type: "string", description: "The opportunity with specific context" },
              value_estimate: { type: "string", description: "Estimated value or impact in dollars or business terms" },
              related_entity: { type: "string", description: "Which deal or relationship this relates to" },
              next_steps: { type: "string", description: "Concrete next step with owner and timeline" }
            },
            required: ["opportunity", "value_estimate", "related_entity", "next_steps"]
          },
          description: "Growth opportunities with value estimates"
        },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", description: "Specific action - start with a verb (Call, Email, Schedule, Review)" },
              context: { type: "string", description: "Why this action matters - what will it achieve" },
              related_deal: { type: "string", description: "Related deal title if applicable, or 'General' if client-wide" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              owner: { type: "string", description: "Suggested owner (Account Manager, BD, or specific role from comments)" },
              timeline: { type: "string", description: "Specific timeline (e.g., 'Today', 'By Friday', 'This week')" }
            },
            required: ["action", "context", "priority", "owner", "timeline"]
          },
          description: "Actionable items with priority and timeline - these should be immediately executable"
        },
        sources_cited: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["deal", "comment", "followup", "document", "campaign_contact", "client_profile"] },
              name: { type: "string", description: "Name or title of the source" },
              date: { type: "string", description: "Relevant date (created, updated, or mentioned)" },
              relevance: { type: "string", description: "How this source was used in the analysis" }
            },
            required: ["type", "name", "relevance"]
          },
          description: "List of data sources used in the analysis with details"
        },
        data_quality: {
          type: "object",
          properties: {
            coverage_score: { type: "number", description: "0-100 score of how complete the available data is" },
            missing_data: { type: "array", items: { type: "string" }, description: "What data is missing that would improve analysis" },
            data_freshness: { type: "string", description: "How recent the most relevant data is" },
            recommendation: { type: "string", description: "What the user should do to improve data quality if needed" }
          },
          required: ["coverage_score", "missing_data", "data_freshness"]
        }
      },
      required: ["summary", "key_findings", "risks", "opportunities", "action_items", "sources_cited", "data_quality"]
    }
  }
};

// Tool calling schema for LinkedIn message generation
const linkedInMessageToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_linkedin_messages",
    description: "Generate personalized LinkedIn outreach messages with 3 variants. Connection requests must be under 200 characters each. Follow-up messages can be up to 500 characters.",
    parameters: {
      type: "object",
      properties: {
        message_variants: {
          type: "array",
          description: "Exactly 3 message variants with different tones",
          items: {
            type: "object",
            properties: {
              variant_name: {
                type: "string",
                enum: ["Direct Professional", "Warm Conversational", "Value-Focused"],
                description: "Name of the variant"
              },
              message: {
                type: "string",
                description: "The complete LinkedIn message text. MUST be under 200 characters for connection_request type, under 500 for other types."
              },
              character_count: {
                type: "integer",
                description: "Total character count of the message"
              },
              tone: {
                type: "string",
                enum: ["professional", "friendly", "consultative", "direct"],
                description: "Tone of the message"
              },
              key_hooks: {
                type: "array",
                items: { type: "string" },
                description: "2-3 key hooks used in the message"
              },
              personalization_elements: {
                type: "array",
                items: { type: "string" },
                description: "Specific personalization elements included"
              }
            },
            required: ["variant_name", "message", "character_count", "tone", "key_hooks", "personalization_elements"]
          },
          minItems: 3,
          maxItems: 3
        },
        recommended_variant: {
          type: "string",
          enum: ["Direct Professional", "Warm Conversational", "Value-Focused"],
          description: "Which variant is recommended based on the context"
        },
        reasoning: {
          type: "string",
          description: "Why the recommended variant is best for this contact"
        },
        send_timing_suggestion: {
          type: "string",
          enum: ["morning", "afternoon", "evening", "anytime"],
          description: "Best time to send based on contact's activity patterns"
        },
        follow_up_strategy: {
          type: "string",
          description: "Suggested follow-up approach if no response"
        }
      },
      required: [
        "message_variants",
        "recommended_variant",
        "reasoning",
        "send_timing_suggestion",
        "follow_up_strategy"
      ]
    }
  }
};

// Tool calling schema for BD Manager Chat analysis
const bdManagerChatToolSchema = {
  type: "function" as const,
  function: {
    name: "provide_bd_manager_insights",
    description: "Provide BD team performance insights and coaching recommendations based on weekly data",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2-3 sentence executive summary directly answering the manager's question. Be specific with rep names, percentages, and dates."
        },
        rep_insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rep_name: { type: "string", description: "Full name of the team member" },
              status: { type: "string", enum: ["excelling", "on_track", "at_risk", "off_track"], description: "Current performance status" },
              highlights: { type: "array", items: { type: "string" }, description: "2-4 specific observations about their performance" },
              metrics: {
                type: "object",
                properties: {
                  dhs_rate: { type: "number", description: "DHS submission rate percentage (0-100)" },
                  eod_rate: { type: "number", description: "EOD submission rate percentage (0-100)" },
                  goal_progress: { type: "number", description: "Goal completion percentage (0-100)" }
                }
              }
            },
            required: ["rep_name", "status", "highlights"]
          },
          description: "Individual rep performance insights when relevant to the question"
        },
        metrics_analysis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string", description: "Name of the metric" },
              value: { type: "string", description: "Current value with unit" },
              trend: { type: "string", enum: ["up", "down", "stable"], description: "Trend direction" },
              insight: { type: "string", description: "Brief insight about this metric" },
              change_percent: { type: "number", description: "Percentage change from previous period" }
            },
            required: ["metric", "value", "trend", "insight"]
          },
          description: "Key metrics analysis when relevant"
        },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", description: "Specific action - start with a verb" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              owner: { type: "string", description: "Suggested owner (Manager, specific rep name, or role)" },
              timeline: { type: "string", description: "Specific timeline (Today, This week, Monday, etc.)" },
              context: { type: "string", description: "Why this action is important" }
            },
            required: ["action", "priority", "owner", "timeline"]
          },
          description: "Recommended actions for the manager"
        },
        wig_highlights: {
          type: "array",
          items: { type: "string" },
          description: "Key items for WIG meeting agenda if relevant"
        },
        sources_cited: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["dhs", "eod", "accountability", "tasks", "weekly_report"] },
              name: { type: "string", description: "Name or description of the source" },
              relevance: { type: "string", description: "How this source informed the analysis" }
            },
            required: ["type", "name", "relevance"]
          }
        },
        data_quality: {
          type: "object",
          properties: {
            coverage_score: { type: "number", description: "0-100 score of data completeness" },
            missing_data: { type: "array", items: { type: "string" }, description: "What data is missing" },
            data_freshness: { type: "string", description: "How recent the data is" }
          },
          required: ["coverage_score", "missing_data", "data_freshness"]
        }
      },
      required: ["summary", "action_items", "data_quality"]
    }
  }
};

type SupabaseClient = ReturnType<typeof createClient>;

interface DatabaseAgent {
  id: string;
  name: string;
  category: string;
  system_prompt: string;
  config?: AgentConfig;
  prompt_template?: string;
}

interface SharedResourceRow {
  resource_type: string;
  resource_identifier: string;
  metadata?: Record<string, unknown>;
}

interface ConfigurationRow {
  configuration_type: string;
  configuration_data: Record<string, unknown>;
}

interface ConfigurationPayload {
  businessContext: Record<string, unknown>;
  modelSettings: { default_model?: string };
  prompts: {
    analysis_prompts?: Record<string, string>;
  };
}

interface IntegrationRow {
  type: string;
  config: Record<string, unknown> | null;
}

interface ClientRow {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
  employee_count?: number | null;
  revenue?: number | null;
}

async function getClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    auth: { persistSession: false },
  });
}

async function requireAuth(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function fetchConfigurations(client: SupabaseClient): Promise<ConfigurationPayload> {
  const { data, error } = await client
    .from("ai_configurations")
    .select("configuration_type, configuration_data");

  if (error) throw error;

  const configMap: Record<string, Record<string, unknown>> = {};
  (data as ConfigurationRow[] | null)?.forEach((config) => {
    configMap[config.configuration_type] = config.configuration_data;
  });

  return {
    businessContext: (configMap.business_context as Record<string, unknown>) || {},
    modelSettings: (configMap.model_settings as { default_model?: string }) || { default_model: "gpt-4o-mini" },
    prompts: (configMap.prompts as ConfigurationPayload["prompts"]) || {},
  };
}

async function fetchSharedResources(client: SupabaseClient, agentId: string): Promise<SharedResourceRow[]> {
  // TODO: Implement shared resources when ai_shared_resources table is created
  // For now, return empty array to allow BD agents to work with deal files
  return [];
}

async function fetchFileContents(client: SupabaseClient, fileIds: string[]): Promise<string> {
  if (!fileIds || fileIds.length === 0) return "";

  const { data: files, error } = await client
    .from("deal_files")
    .select("id, drive_file_name, drive_file_type, storage_bucket_path, json_snapshot_path")
    .in("id", fileIds);

  if (error || !files || files.length === 0) return "";

  const fileContents: string[] = [];
  for (const file of files) {
    const fileName = (file as any).drive_file_name || "Untitled Document";
    const fileType = (file as any).drive_file_type || "unknown";
    
    fileContents.push(`\n### Document: ${fileName} (${fileType})\n`);
    
    const jsonPath = (file as any).json_snapshot_path;
    if (jsonPath) {
      try {
        const { data: content } = await client.storage
          .from("deal-files")
          .download(jsonPath);
        
        if (content) {
          const text = await content.text();
          fileContents.push(text.substring(0, 10000)); // Limit to 10k chars per file
        }
      } catch (err) {
        fileContents.push("[Could not retrieve file content]");
      }
    } else {
      fileContents.push("[File preview not available]");
    }
  }

  return fileContents.join("\n\n");
}

function normalizeNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9.]/g, "");
    if (!sanitized) return null;
    const numeric = Number(sanitized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

async function resolvePreferredIntegration(client: SupabaseClient): Promise<IntegrationRow | null> {
  const preferredProviders: ProviderName[] = ["perplexity", "openai"];

  for (const providerType of preferredProviders) {
    const { data, error } = await client
      .from("integrations")
      .select("type, config")
      .eq("type", providerType)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return data as IntegrationRow;
    }
  }

  return null;
}

// Helper function to replace nested placeholders across prompts and outputs
function replacePlaceholders(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value: any = context;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return match; // Keep placeholder if path not found
      }
    }
    
    // Handle array values
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'Not available';
    }
    
    return String(value);
  });
}

// Build comprehensive client context for Client Intelligence analysis
function buildClientIntelligenceContext(executionContext: Record<string, any>): string {
  const sections: string[] = [];
  
  // Client Profile
  const client = executionContext.client || {};
  if (client.name || client.industry) {
    sections.push(`### CLIENT PROFILE
- **Name**: ${client.name || 'Unknown'}
- **Industry**: ${client.industry || 'Not specified'}
- **Status**: ${client.status || 'Active'}
- **Website**: ${client.website || 'Not available'}
- **Last Contact**: ${client.last_contact_date || 'Unknown'}
- **Notes**: ${client.notes || 'None'}`);
  }
  
  // Deals Summary
  const deals = executionContext.deals || [];
  if (deals.length > 0) {
    const totalValue = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const stageGroups = deals.reduce((acc: any, d: any) => {
      const stage = d.stage || 'Unknown';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});
    
    const stagesSummary = Object.entries(stageGroups).map(([s, c]) => `${s}: ${c}`).join(', ');
    const dealsList = deals.slice(0, 10).map((d: any, i: number) => {
      const title = d.title || 'Untitled';
      const stage = d.stage || 'Unknown';
      const value = (d.value || 0).toLocaleString();
      const updated = d.updated_at ? new Date(d.updated_at).toLocaleDateString() : 'Unknown';
      return `${i + 1}. **${title}** - ${stage} - $${value} - Updated: ${updated}`;
    }).join('\n');
    
    sections.push(`### DEALS OVERVIEW
- **Total Deals**: ${deals.length}
- **Total Pipeline Value**: $${totalValue.toLocaleString()}
- **By Stage**: ${stagesSummary}

**Active Deals:**
${dealsList}`);
  } else {
    sections.push(`### DEALS OVERVIEW
No deals found for this client.`);
  }
  
  // Recent Comments
  const comments = executionContext.deal_comments || [];
  if (comments.length > 0) {
    const commentsList = comments.slice(0, 10).map((c: any, i: number) => {
      const dealTitle = c.deal_title || 'Unknown Deal';
      const userName = c.user_name || c.user_email || 'Unknown User';
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Unknown';
      const text = (c.comment || '').substring(0, 200);
      return `${i + 1}. [${date}] **${dealTitle}** - ${userName}: "${text}..."`;
    }).join('\n');
    
    sections.push(`### RECENT DEAL COMMENTS (Last 10)
${commentsList}`);
  }
  
  // Follow-ups
  const followups = executionContext.followups || [];
  if (followups.length > 0) {
    const now = new Date();
    const overdue = followups.filter((f: any) => f.status !== 'completed' && new Date(f.due_date) < now);
    const upcoming = followups.filter((f: any) => f.status !== 'completed' && new Date(f.due_date) >= now);
    const completed = followups.filter((f: any) => f.status === 'completed');
    
    let followupText = `### FOLLOW-UPS
- **Overdue**: ${overdue.length}
- **Upcoming**: ${upcoming.length}
- **Completed**: ${completed.length}`;

    if (overdue.length > 0) {
      const overdueList = overdue.slice(0, 5).map((f: any) => {
        const title = f.title || 'Untitled';
        const due = new Date(f.due_date).toLocaleDateString();
        return `- ${title} (Due: ${due})`;
      }).join('\n');
      followupText += `\n\n**Overdue:**\n${overdueList}`;
    }

    if (upcoming.length > 0) {
      const upcomingList = upcoming.slice(0, 5).map((f: any) => {
        const title = f.title || 'Untitled';
        const due = new Date(f.due_date).toLocaleDateString();
        return `- ${title} (Due: ${due})`;
      }).join('\n');
      followupText += `\n\n**Upcoming:**\n${upcomingList}`;
    }
    
    sections.push(followupText);
  }
  
  // Documents
  const documents = executionContext.documents || [];
  if (documents.length > 0) {
    const docsList = documents.slice(0, 5).map((d: any) => {
      const name = d.file_name || 'Unnamed';
      const type = d.file_type || 'Unknown type';
      return `- ${name} (${type})`;
    }).join('\n');
    sections.push(`### DOCUMENTS
${docsList}`);
  }
  
  // Campaign Contacts (if any)
  const contacts = executionContext.campaign_contacts || [];
  if (contacts.length > 0) {
    const contactsList = contacts.slice(0, 5).map((c: any) => {
      const name = c.contact_name || 'Unknown';
      const title = c.contact_title || 'Unknown title';
      const company = c.contact_company || 'Unknown company';
      const status = c.status || 'Unknown';
      return `- ${name} - ${title} at ${company} - Status: ${status}`;
    }).join('\n');
    sections.push(`### CAMPAIGN CONTACTS
${contactsList}`);
  }
  
  // Data Quality Assessment
  const hasDeals = deals.length > 0;
  const hasComments = comments.length > 0;
  const hasFollowups = followups.length > 0;
  const hasDocs = documents.length > 0;
  const dataPoints = [hasDeals, hasComments, hasFollowups, hasDocs].filter(Boolean).length;
  const coverageScore = Math.round((dataPoints / 4) * 100);
  
  sections.push(`### DATA QUALITY
- **Coverage Score**: ${coverageScore}%
- **Deals**: ${hasDeals ? '✓' : '✗ Missing'}
- **Comments**: ${hasComments ? '✓' : '✗ Missing'}
- **Follow-ups**: ${hasFollowups ? '✓' : '✗ Missing'}
- **Documents**: ${hasDocs ? '✓' : '✗ Missing'}`);
  
  return sections.join('\n\n');
}

function assemblePrompt(
  agent: DatabaseAgent,
  businessContext: Record<string, unknown>,
  prompts: ConfigurationPayload["prompts"],
  executionContext: Record<string, unknown>,
  sharedResources: SharedResourceRow[],
  fileContents?: string,
  userContext?: string,
  agentType?: string,
  currentQuestion?: string,
) {
  let systemPrompt: string = agent.system_prompt;

  // Handle document_qa type with conversational prompt
  if (agentType === 'document_qa' && fileContents) {
    const userPrompt = `# Deal Documents

${fileContents}

---

# User Question

${currentQuestion || userContext || 'Summarize the key points from these documents.'}

**Instructions:**
- Answer based ONLY on the documents above
- Cite specific document names when referencing information using format [Document: filename.ext]
- If unsure or information not present, clearly state that
- Be concise but thorough`;

    return { systemPrompt, userPrompt };
  }

  const companyName = typeof businessContext["company_name"] === "string"
    ? businessContext["company_name"] as string
    : undefined;
  const industry = typeof businessContext["industry"] === "string"
    ? businessContext["industry"] as string
    : undefined;
  const companyPolicies = typeof businessContext["company_policies"] === "string"
    ? businessContext["company_policies"] as string
    : undefined;
  const seasonalRules = businessContext["seasonal_rules"] as Record<string, string> | undefined;

  if (companyName) {
    systemPrompt = systemPrompt.replace(/\{company_name\}/g, companyName);
  }
  if (industry) {
    systemPrompt = systemPrompt.replace(/\{industry\}/g, industry);
  }

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const seasonalRule = seasonalRules?.[`Q${currentQuarter}`];
  if (seasonalRule) {
    systemPrompt += `\n\nSeasonal Context: ${seasonalRule}`;
  }

  if (companyPolicies) {
    systemPrompt += `\n\nCompany Policies: ${companyPolicies}`;
  }

  if (sharedResources.length) {
    systemPrompt += `\n\nShared Knowledge Bases:`;
    sharedResources.forEach((resource) => {
      const metadata = resource.metadata as Record<string, unknown> | undefined;
      const description = typeof metadata?.description === "string" ? metadata.description : undefined;
      const label = description ?? resource.resource_identifier;
      systemPrompt += `\n- ${resource.resource_type}: ${label}`;
    });
  }

  const defaultPrompt = prompts.analysis_prompts?.[agent.category] || "Provide an actionable analysis.";
  const serializedContext = JSON.stringify(executionContext ?? {});
  const responseTemplate = JSON.stringify({
    summary: "Brief summary of findings",
    findings: ["Finding 1"],
    recommendations: ["Recommendation 1"],
    action_items: [{
      type: "task",
      description: "Action description",
      priority: "high|medium|low",
      assignee: "Optional assignee",
      due_date: "Optional ISO string",
      confidence: 0.8
    }],
    metrics: {
      total_items_analyzed: 0,
      anomalies_found: 0,
      high_priority_issues: 0
    },
    confidence_score: 0.8,
    insights: ["Additional insight 1"],
    risks: ["Risk factor 1"],
    structured_output: {
      lead_quality_score: "A+",
      engagement_readiness: "hot|warm|cold",
      decision_maker_level: "C-suite|VP|Director|Manager",
      best_approach: "consultative|educational|solution-focused",
      recommended_next_step: "specific action",
      recommended_timing: "now|this week|this month",
      key_talking_points: ["point 1", "point 2", "point 3"]
    }
  }, null, 2);

  // Placeholder replacement handled by global helper


  let userPrompt: string;
  
  // Check if this is LinkedIn message generation
  if (agent.category === 'linkedin_outreach' || (agent as any).slug === 'linkedin-message-generator') {
    if (agent.prompt_template) {
      // Replace all LinkedIn placeholders with actual values
      userPrompt = replacePlaceholders(agent.prompt_template, executionContext);
    } else {
      userPrompt = 'Generate personalized LinkedIn messages based on the provided context.';
    }
  }
  // Check if this is a BD contact analysis
  else if ((executionContext.filters as any)?.contact_data && agent.category === 'research') {
    const contactData = (executionContext.filters as any)?.contact_data;
    // Build comprehensive BD analysis prompt
    userPrompt = `# LEAD INTELLIGENCE ANALYSIS

## CAMPAIGN CONTEXT
Campaign: ${contactData.campaign_name || 'N/A'}
Type: ${contactData.campaign_type || 'N/A'}
Status: ${contactData.campaign_status || 'N/A'}
Target Regions: ${Array.isArray(contactData.campaign_target_regions) ? contactData.campaign_target_regions.join(", ") : 'N/A'}
Campaign Goals:
- Target Contacts: ${contactData.campaign_goals?.target_contacts_count || 0}
- Reached: ${contactData.campaign_goals?.actual_contacts_reached || 0}
- Responses: ${contactData.campaign_goals?.responses_received || 0}
- Meetings: ${contactData.campaign_goals?.meetings_booked || 0}
- Deals: ${contactData.campaign_goals?.deals_generated || 0}

## LEAD PROFILE

### Basic Information
Name: ${contactData.contact_name || 'N/A'}
Email: ${contactData.contact_email || 'Not available'}
Phone: ${contactData.contact_phone || 'Not available'}
LinkedIn: ${contactData.contact_linkedin_url || 'Not available'}

### Current Role
Title: ${contactData.current_position_title || 'Not available'}
Company: ${contactData.current_employer || 'Not available'}
Started: ${contactData.current_position_start_date || 'Unknown'}
Years in Role: ${contactData.years_in_current_role || 'Unknown'}

### Professional Background
Headline: ${contactData.linkedin_headline || 'N/A'}
Location: ${contactData.linkedin_location || 'N/A'}
Total Experience: ${contactData.total_years_experience || 'Unknown'} years
Industry Focus: ${contactData.industry_focus || 'Not specified'}
Previous Employers: ${Array.isArray(contactData.previous_employers) ? contactData.previous_employers.join(", ") : 'N/A'}

### Education
${contactData.education_summary || 'No education info'}
Highest Degree: ${contactData.highest_degree || 'Not specified'}

### Skills & Languages
Skills (${Array.isArray(contactData.linkedin_skills) ? contactData.linkedin_skills.length : 0}): ${Array.isArray(contactData.linkedin_skills) ? contactData.linkedin_skills.slice(0, 10).join(", ") : 'N/A'}
Languages: ${Array.isArray(contactData.languages) ? contactData.languages.join(", ") : 'N/A'}

### LinkedIn Profile Metrics
Followers: ${contactData.linkedin_follower_count ? contactData.linkedin_follower_count.toLocaleString() : 'N/A'}
Connections: ${contactData.linkedin_connection_count || 'N/A'}+
Profile Completeness: ${contactData.profile_completeness_score || 'Unknown'}%
Last Activity: ${contactData.last_linkedin_activity_date || 'Unknown'}

### About Section
${contactData.linkedin_about || 'No about section available'}

## EXISTING RESEARCH INSIGHTS
${contactData.research_summary || 'No research summary available - recommend running "Run Research" first'}
${contactData.research_generated_at ? `Generated: ${new Date(contactData.research_generated_at).toLocaleString()}` : ''}

## ENGAGEMENT HISTORY
Current Status: ${contactData.current_status || 'N/A'}
Last Enrichment: ${contactData.last_enriched_at ? new Date(contactData.last_enriched_at).toLocaleString() : 'N/A'}

---

# YOUR TASK

As a BD Research Analyst, analyze this lead comprehensively and provide actionable intelligence for outreach.

## Output Requirements (JSON format):

Provide the result as JSON matching this enhanced schema:
${responseTemplate}

**CRITICAL**: 
- Base analysis on ACTUAL DATA PROVIDED, not assumptions
- Highlight data gaps that need filling
- Prioritize campaign-specific relevance
- Provide BD-ready intelligence, not generic advice
- Reference specific details from the profile
- If research_summary is missing, note that running "Run Research" first would enhance analysis
- Include structured_output with lead_quality_score (A+ to F), engagement_readiness (hot/warm/cold), decision_maker_level, best_approach, key_talking_points, recommended_next_step, and recommended_timing
`;
  } 
  // Check if this is Client Intelligence - build a specialized prompt
  else if ((agent as any).slug === 'client-intelligence' || agent.category === 'client_intelligence') {
    // Build comprehensive client context for the AI
    const clientContext = buildClientIntelligenceContext(executionContext);
    const userQuestion = currentQuestion || userContext || defaultPrompt || "Analyze this client and provide actionable intelligence.";
    
    userPrompt = `# CLIENT INTELLIGENCE ANALYSIS REQUEST

## USER'S QUESTION
${userQuestion}

## CLIENT CONTEXT
${clientContext}

## YOUR TASK
As a senior business intelligence analyst, provide a comprehensive, data-driven response to the user's question.

**CRITICAL REQUIREMENTS:**
1. **Be Specific**: Reference actual deal names, dollar amounts, dates, and people mentioned in the data
2. **Cite Sources**: For every finding, quote or reference the specific data point it came from
3. **Be Actionable**: Every recommendation must specify WHO should do WHAT by WHEN
4. **Quantify Impact**: Where possible, estimate business impact in dollars or risk level
5. **Acknowledge Gaps**: If data is missing, say so and recommend how to fill the gap

**DO NOT:**
- Make generic statements that could apply to any client
- Provide advice without evidence from the provided data
- Use vague timelines like "soon" - be specific: "by Friday", "this week"
- Assume data that isn't provided`;
  }
  else if (agent.prompt_template && agent.category !== 'linkedin_outreach' && (agent as any).slug !== 'linkedin-message-generator') {
    userPrompt = agent.prompt_template
      .replace(/\{\{deal_title\}\}/g, executionContext.deal_title as string || "N/A")
      .replace(/\{\{deal_stage\}\}/g, executionContext.deal_stage as string || "N/A")
      .replace(/\{\{client_name\}\}/g, executionContext.client_name as string || "N/A")
      .replace(/\{\{file_contents\}\}/g, fileContents || "[No documents provided]")
      .replace(/\{\{user_context\}\}/g, userContext || "[No additional context]")
      .replace(/\{\{context\}\}/g, serializedContext)
      .replace(/\{\{question\}\}/g, currentQuestion || userContext || defaultPrompt || "");
  } else {
    userPrompt = `You are executing the ${agent.name} agent.\n\n` +
      `Contextual Filters: ${serializedContext}\n` +
      `Primary Objective: ${defaultPrompt}\n\n` +
      `Provide the result as JSON matching this schema:\n${responseTemplate}\n` +
      `Only return valid JSON.`;
  }

  return {
    systemPrompt,
    userPrompt,
  };
}

function tryParseJson(content: string): AgentResponse {
  try {
    const parsed = JSON.parse(content);
    return AgentResponseSchema.parse(parsed);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return AgentResponseSchema.parse(parsed);
      } catch (_error) {
        // continue to fallback
      }
    }
    const bracesMatch = content.match(/\{[\s\S]*\}/);
    if (bracesMatch) {
      try {
        const parsed = JSON.parse(bracesMatch[0]);
        return AgentResponseSchema.parse(parsed);
      } catch (_error) {
        // continue to fallback
      }
    }

    return AgentResponseSchema.parse({
      summary: content.substring(0, 280),
      findings: ["Unable to parse provider response as JSON."],
      recommendations: ["Review provider output formatting."],
      action_items: [],
      metrics: { total_items_analyzed: 0, anomalies_found: 0, high_priority_issues: 0 },
      confidence_score: 0.2,
    });
  }
}

function buildProviderTelemetry(result: any): any {
  return result.telemetry;
}

async function persistRun(
  client: any,
  payload: {
    agentId: string;
    userId: string;
    agentCategory: string | null;
    executionContext: Record<string, unknown>;
    response: AgentResponse;
    providerTelemetry: ProviderTelemetry[];
    providerRawOutputs: unknown[];
    selectedFileIds?: string[];
    userContext?: string;
    structuredOutput?: any;
    clientId?: string;
  },
) {
  const { data, error } = await (client as any)
    .from("ai_agent_runs")
    .insert({
      agent_id: payload.agentId,
      executed_by: payload.userId,
      execution_context: payload.executionContext,
      ai_summary: payload.response,
      generated_tasks: payload.response.action_items,
      status: "completed",
      title: `${new Date().toISOString()} - ${payload.response.summary.substring(0, 60)}`,
      category: payload.agentCategory,
      output: {
        response: payload.response,
        telemetry: payload.providerTelemetry,
        rawOutputs: payload.providerRawOutputs,
      },
      provider_chain: payload.providerTelemetry,
      selected_file_ids: payload.selectedFileIds || [],
      user_context: payload.userContext,
      structured_output: payload.structuredOutput || payload.response,
      client_id: payload.clientId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 run-ai-agent invoked');

  let client: any = null;

  try {
    client = await getClient(req);
    const userId = await requireAuth(client);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await req.json();
    const payload = AgentRunRequestSchema.parse(json);

    const {
      agent_id: payloadAgentId,
      agent_type: agentType,
      target: payloadTarget,
      client_id: clientId,
      execution_context: incomingExecutionContext,
      file_ids: fileIds,
      user_context: userContext,
    } = payload;

    const target = payloadTarget ?? "deal";
    let executionContext: Record<string, unknown> = { ...(incomingExecutionContext ?? {}) };
    executionContext.target = target;

    let agentId = payloadAgentId ?? null;
    let agent: DatabaseAgent | null = null;
    let clientProfile: ClientRow | null = null;
    let integrationOverride: IntegrationRow | null = null;
    let inputContext: Record<string, unknown> | null = null;

    if (target === "client_intelligence") {
      // Client Intelligence Agent - gather comprehensive context
      if (!clientId) {
        throw new Error("client_id is required for intelligence analysis");
      }
      
      const question = payload.question || "Provide general client intelligence analysis";
      const mode = payload.mode || "quick";
      
      // Fetch Intelligence Agent
      const { data: intelligenceAgent, error: agentError } = await client
        .from("ai_agents")
        .select("*, config, prompt_template")
        .eq("slug", "client-intelligence")
        .eq("is_active", true)
        .single();
        
      if (agentError || !intelligenceAgent) {
        throw new Error("Client Intelligence Agent not configured");
      }
      
      agent = intelligenceAgent as unknown as DatabaseAgent;
      agentId = intelligenceAgent.id;
      
      // Gather multi-source context with expanded data
      const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const [
        clientData,
        dealsData,
        filesData,
      ] = await Promise.all([
        client.from("clients").select("*").eq("id", clientId).single(),
        client.from("deals").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
        client.from("deal_files").select("drive_file_name, drive_file_type, drive_folder_url, created_at").eq("client_id", clientId).limit(20),
      ]);
      
      if (clientData.error) throw clientData.error;
      if (!clientData.data) throw new Error("Client not found");
      
      clientProfile = clientData.data as ClientRow;
      const dealIds = (dealsData.data || []).map((d: any) => d.id);
      
      // Fetch additional context: comments, followups, reminders
      const [commentsData, followupsData, remindersData] = await Promise.all([
        dealIds.length > 0 
          ? client.from("deal_comments").select("comment, created_at, deal_id, user_id").in("deal_id", dealIds).order("created_at", { ascending: false }).limit(50)
          : Promise.resolve({ data: [], error: null }),
        dealIds.length > 0
          ? client.from("followups").select("*").in("deal_id", dealIds).order("date", { ascending: false }).limit(30)
          : Promise.resolve({ data: [], error: null }),
        dealIds.length > 0
          ? client.from("deal_reminders").select("*").in("deal_id", dealIds).order("reminder_date", { ascending: true }).limit(20)
          : Promise.resolve({ data: [], error: null }),
      ]);
      
      // Fetch campaign contacts matching company name for relationship insights
      const { data: campaignContacts } = await client
        .from("campaign_contacts")
        .select("contact_name, contact_title, contact_linkedin_url, linkedin_headline, linkedin_about, status, lead_quality_score, research_summary")
        .ilike("contact_company", `%${clientProfile.name}%`)
        .limit(20);
      
      // Build enriched intelligence context
      inputContext = {
        client: clientProfile,
        deals: dealsData.data || [],
        documents: filesData.data || [],
        deal_comments: commentsData.data || [],
        followups: followupsData.data || [],
        reminders: remindersData.data || [],
        campaign_contacts: campaignContacts || [],
        question,
        mode,
        timeframe: "Last 90 days",
        analysis_hints: mode === "deep" ? [
          "Analyze deal comments for sentiment and blockers",
          "Identify overdue or pending followups",
          "Cross-reference campaign contacts for relationship mapping",
          "Look for patterns in deal progression",
          "Assess risk signals from stalled deals"
        ] : [
          "Provide quick summary focusing on the question",
          "Highlight top 3 most relevant insights"
        ],
      };
      
      executionContext = {
        ...executionContext,
        client_id: clientId,
        client_name: clientProfile.name,
        question,
        mode,
        input_context: inputContext,
      };
    } else if (target === "bd_manager_chat") {
      // BD Manager Chat - gather team performance context
      const question = payload.question || "Provide a general overview of team performance";
      const mode = payload.mode || "quick";
      const weekStartDate = (incomingExecutionContext as any)?.week_start_date;
      
      console.log('🔄 BD Manager Chat - gathering team performance context');
      
      // Fetch or create a default BD Manager agent config
      const { data: bdAgent, error: agentError } = await client
        .from("ai_agents")
        .select("*, config, prompt_template")
        .eq("slug", "bd-manager-weekly-review")
        .single();
      
      if (agentError || !bdAgent) {
        // Create a fallback agent configuration
        agent = {
          id: "bd-manager-chat-fallback",
          name: "BD Manager Chat",
          category: "bd_management",
          system_prompt: `You are a BD Team Performance Analyst. You help managers understand team performance, identify coaching opportunities, and prepare for WIG meetings.

Your role is to:
- Analyze DHS (Daily Health Score) and EOD (End of Day) submission patterns
- Track individual rep performance against quarterly goals
- Identify at-risk team members who need support
- Provide actionable coaching recommendations
- Summarize key metrics and trends

Be specific with names, numbers, and dates. Focus on actionable insights.`,
          config: { providers: { primary: { provider: "lovable", model: "google/gemini-2.5-flash" } } },
        };
        agentId = "bd-manager-chat-fallback";
      } else {
        agent = bdAgent as unknown as DatabaseAgent;
        agentId = bdAgent.id;
      }
      
      // Calculate date ranges
      const now = new Date();
      const weekStart = weekStartDate ? new Date(weekStartDate) : new Date(now.setDate(now.getDate() - now.getDay() + 1));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      // Fetch team performance data in parallel
      const [
        dhsData,
        eodData,
        activeQuarter,
        tasksData,
        latestReport,
        profilesData,
      ] = await Promise.all([
        client.from("dhs_submissions")
          .select("*, profiles:user_id (id, full_name, email)")
          .gte("date", weekStartStr)
          .lte("date", weekEndStr),
        client.from("eod_submissions")
          .select("*, profiles:user_id (id, full_name, email)")
          .gte("date", weekStartStr)
          .lte("date", weekEndStr),
        client.from("accountability_quarters")
          .select("*")
          .eq("status", "active")
          .single(),
        client.from("project_tasks")
          .select("*, profiles:assigned_to (id, full_name)")
          .eq("status", "completed")
          .gte("completed_at", weekStartStr)
          .lte("completed_at", weekEndStr),
        client.from("bd_weekly_reports")
          .select("*")
          .eq("week_start_date", weekStartStr)
          .maybeSingle(),
        client.from("profiles")
          .select("id, full_name, email")
          .limit(50),
      ]);
      
      // Fetch accountability goals if we have an active quarter
      let repGoals: any[] = [];
      let weeklyUpdates: any[] = [];
      if (activeQuarter.data) {
        const [goalsResult, updatesResult] = await Promise.all([
          client.from("accountability_rep_goals")
            .select("*, profiles:rep_id (id, full_name, email)")
            .eq("quarter_id", activeQuarter.data.id)
            .eq("approval_status", "approved"),
          client.from("accountability_weekly_updates")
            .select("*, accountability_activities (title)")
            .gte("week_start_date", weekStartStr)
            .lte("week_end_date", weekEndStr),
        ]);
        repGoals = goalsResult.data || [];
        weeklyUpdates = updatesResult.data || [];
      }
      
      // Calculate team metrics
      const profiles = profilesData.data || [];
      const teamSize = profiles.length || 1;
      const dhsCount = dhsData.data?.length || 0;
      const eodCount = eodData.data?.length || 0;
      const dhsSubmissionRate = Math.round((dhsCount / (5 * teamSize)) * 100);
      const eodSubmissionRate = Math.round((eodCount / (5 * teamSize)) * 100);
      
      // Group data by rep for individual analysis
      const dhsByRep: Record<string, any[]> = {};
      const eodByRep: Record<string, any[]> = {};
      
      (dhsData.data || []).forEach((d: any) => {
        const repName = d.profiles?.full_name || 'Unknown';
        if (!dhsByRep[repName]) dhsByRep[repName] = [];
        dhsByRep[repName].push(d);
      });
      
      (eodData.data || []).forEach((e: any) => {
        const repName = e.profiles?.full_name || 'Unknown';
        if (!eodByRep[repName]) eodByRep[repName] = [];
        eodByRep[repName].push(e);
      });
      
      // Build context for the AI
      inputContext = {
        question,
        mode,
        week_context: {
          week_start: weekStartStr,
          week_end: weekEndStr,
          quarter: activeQuarter.data?.name || "N/A",
        },
        team_metrics: {
          team_size: teamSize,
          dhs_submissions: dhsCount,
          dhs_submission_rate: dhsSubmissionRate,
          eod_submissions: eodCount,
          eod_submission_rate: eodSubmissionRate,
          total_hours_logged: (eodData.data || []).reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0),
          tasks_completed: tasksData.data?.length || 0,
        },
        rep_breakdown: Object.entries(dhsByRep).map(([name, dhs]) => ({
          name,
          dhs_count: dhs.length,
          eod_count: eodByRep[name]?.length || 0,
          avg_score: dhs.reduce((sum: number, d: any) => sum + (d.overall_score || 0), 0) / (dhs.length || 1),
        })),
        accountability_goals: repGoals.map(g => ({
          rep_name: g.profiles?.full_name || 'Unknown',
          goal_title: g.title,
          target: g.target_value,
          current: g.current_value,
          progress_percent: Math.round((g.current_value / g.target_value) * 100),
          status: g.status,
        })),
        weekly_updates: weeklyUpdates,
        latest_report: latestReport.data ? {
          summary: latestReport.data.summary,
          team_health_score: latestReport.data.team_health_score,
          risk_alerts: latestReport.data.risk_alerts,
        } : null,
        analysis_hints: mode === "deep" ? [
          "Analyze individual rep trends over time",
          "Identify coaching opportunities",
          "Compare against quarterly pacing",
          "Look for patterns in low performers",
          "Suggest specific 1-on-1 talking points"
        ] : [
          "Focus on the specific question asked",
          "Highlight top concerns",
          "Keep recommendations actionable"
        ],
      };
      
      executionContext = {
        ...executionContext,
        question,
        mode,
        week_start_date: weekStartStr,
        input_context: inputContext,
      };
      
      console.log('✅ BD Manager Chat context gathered:', {
        team_size: teamSize,
        dhs_count: dhsCount,
        eod_count: eodCount,
        goals_count: repGoals.length,
      });
    } else if (target === "client") {
      if (!clientId) {
        throw new Error("client_id is required when target is 'client'");
      }

      const resolvedAgentType = agentType ?? "research";
      const { data: resolvedAgent, error: resolvedAgentError } = await client
        .from("ai_agents")
        .select("*, config, prompt_template")
        .eq("type", resolvedAgentType)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (resolvedAgentError) throw resolvedAgentError;
      if (!resolvedAgent) {
        throw new Error(`No active ${resolvedAgentType} agent configured for client enrichment`);
      }

      agent = resolvedAgent as unknown as DatabaseAgent;
      agentId = resolvedAgent.id;

      const { data: clientData, error: clientError } = await client
        .from("clients")
        .select("id, name, website, industry, notes, employee_count, revenue")
        .eq("id", clientId)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        throw new Error("Client not found");
      }

      clientProfile = clientData as ClientRow;
      integrationOverride = await resolvePreferredIntegration(client);

      inputContext = {
        client: {
          id: clientProfile.id,
          name: clientProfile.name,
          website: clientProfile.website ?? "",
          industry: clientProfile.industry ?? "",
          notes: clientProfile.notes ?? "",
        },
        enrichment_task:
          "Research and enrich the client's profile with updated industry, estimated employee count, revenue, and a concise summary for the business development team.",
      };

      executionContext = {
        ...executionContext,
        client_id: clientProfile.id,
        client_name: clientProfile.name,
        input_context: inputContext,
      };
    }

    console.log('📍 Before agent resolution - agent:', !!agent, 'agentType:', agentType, 'agentId:', agentId);

    if (!agent) {
      // If agent_type is provided but no agent_id, resolve by type
      if (agentType && !agentId) {
        console.log('🔍 Resolving agent by type:', agentType);
        const { data: resolvedAgent, error: resolvedAgentError } = await client
          .from("ai_agents")
          .select("*, config, prompt_template")
          .eq("type", agentType)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (resolvedAgentError) {
          console.error('❌ Error resolving agent by type:', resolvedAgentError);
          throw resolvedAgentError;
        }
        if (!resolvedAgent) {
          console.error('❌ No agent found for type:', agentType);
          throw new Error(`No active ${agentType} agent found`);
        }

        console.log('✅ Agent resolved by type:', resolvedAgent.name);
        agent = resolvedAgent as unknown as DatabaseAgent;
        agentId = resolvedAgent.id;
      } else if (agentId) {
        // Resolve by agent_id
        console.log('🔍 Resolving agent by ID:', agentId);
        const { data: fetchedAgent, error: agentError } = await client
          .from("ai_agents")
          .select("*, config, prompt_template")
          .eq("id", agentId)
          .single();

        if (agentError || !fetchedAgent) {
          console.error('❌ Error resolving agent by ID:', agentError);
          throw new Error("Agent not found or access denied");
        }

        console.log('✅ Agent resolved by ID:', fetchedAgent.name);
        agent = fetchedAgent as unknown as DatabaseAgent;
      } else {
        console.error('❌ Neither agent_id nor agent_type provided');
        throw new Error("Either agent_id or agent_type is required");
      }
    }

    if (!agent || !agentId) {
      throw new Error("Agent resolution failed");
    }

    const configs = await fetchConfigurations(client);
    const sharedResources = await fetchSharedResources(client, agentId as string);

    const fileContents = fileIds ? await fetchFileContents(client, fileIds) : "";

    const agentConfig = ((agent as any).config ?? {}) as AgentConfig;
    const resolvedAgentConfig: AgentConfig = {
      ...agentConfig,
      providers: agentConfig.providers ? { ...agentConfig.providers } : undefined,
      features: agentConfig.features ? { ...agentConfig.features } : agentConfig.features,
    };

    const defaultModelFallback = configs.modelSettings?.default_model || "google/gemini-2.5-flash";
    let defaultModel = defaultModelFallback;

    if (integrationOverride) {
      const providerName = integrationOverride.type as ProviderName;
      if (providerName === "perplexity" || providerName === "openai") {
        const integrationModel = typeof integrationOverride.config?.model === "string"
          ? integrationOverride.config.model
          : undefined;

        const primaryProvider: ProviderConfig = {
          provider: providerName,
          model: integrationModel
            ?? (providerName === "perplexity" ? "pplx-70b-online" : defaultModelFallback),
        };

        resolvedAgentConfig.providers = {
          ...(resolvedAgentConfig.providers ?? {}),
          primary: primaryProvider,
        };

        if (providerName === "openai" && integrationModel) {
          defaultModel = integrationModel;
        }
      }
    }

    const { systemPrompt, userPrompt } = assemblePrompt(
      agent,
      configs.businessContext,
      configs.prompts,
      executionContext || {},
      sharedResources,
      fileContents,
      userContext,
      agentType,
      payload.current_question,
    );

    const userPromptContent = inputContext
      ? `${userPrompt}\n\nInput Context:\n${JSON.stringify(inputContext, null, 2)}`
      : userPrompt;

    const providerChain = buildProviderChain(resolvedAgentConfig, defaultModel);

    // Build messages array with conversation history for document_qa
    const messages = [];
    messages.push({ role: "system" as const, content: systemPrompt });
    
    if (agentType === 'document_qa' && payload.conversation_history) {
      // Add conversation history
      for (const msg of payload.conversation_history) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }
    
    messages.push({ role: "user" as const, content: userPromptContent });

    const telemetry: ProviderTelemetry[] = [];
    const rawOutputs: unknown[] = [];
    let parsedResponse: AgentResponse | null = null;

    // Handle document_qa type with direct OpenAI call (no structured output needed)
    if (agentType === 'document_qa') {
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (openaiKey) {
        const startTime = Date.now();
        try {
          const qaResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages,
              temperature: 0.3,
              max_tokens: 2000,
            }),
          });

          const qaResult = await qaResponse.json();
          const latencyMs = Date.now() - startTime;
          
          telemetry.push({
            provider: 'openai',
            model: 'gpt-4o',
            latencyMs,
            tokenUsage: {
              promptTokens: qaResult.usage?.prompt_tokens,
              completionTokens: qaResult.usage?.completion_tokens,
              totalTokens: qaResult.usage?.total_tokens,
            },
          });
          rawOutputs.push(qaResult);

          const answer = qaResult.choices?.[0]?.message?.content;
          if (answer) {
            // For Q&A, return answer directly without persisting as run
            return new Response(
              JSON.stringify({
                success: true,
                answer,
                telemetry,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (qaError) {
          console.error('Document Q&A failed:', qaError);
          throw new Error('Failed to process document Q&A request');
        }
      }
    }

    // Check if this is BD contact analysis - use tool calling for structured output
    const contactData = (executionContext.filters as any)?.contact_data;
    const isBDAnalysis = contactData && agent.category === 'research';

    if (isBDAnalysis) {
      // Use OpenAI with tool calling for BD analysis
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (openaiKey) {
        const startTime = Date.now();
        try {
          const toolCallResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages,
              tools: [bdAnalysisToolSchema],
              tool_choice: { type: "function", function: { name: "provide_lead_analysis" } },
              temperature: 0.3,
            }),
          });

          const toolCallResult = await toolCallResponse.json();
          const latencyMs = Date.now() - startTime;
          
          telemetry.push({
            provider: 'openai',
            model: 'gpt-4o-mini',
            latencyMs,
            tokenUsage: {
              promptTokens: toolCallResult.usage?.prompt_tokens,
              completionTokens: toolCallResult.usage?.completion_tokens,
              totalTokens: toolCallResult.usage?.total_tokens,
            },
          });
          rawOutputs.push(toolCallResult);

          const toolCall = toolCallResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall && toolCall.function.name === "provide_lead_analysis") {
            const analysisData = JSON.parse(toolCall.function.arguments);
            
            // Ensure all required fields with defaults
            parsedResponse = {
              summary: analysisData.summary || "Analysis completed",
              findings: Array.isArray(analysisData.findings) ? analysisData.findings : [],
              recommendations: Array.isArray(analysisData.recommendations) ? analysisData.recommendations : [],
              action_items: Array.isArray(analysisData.action_items) ? analysisData.action_items : [],
              metrics: analysisData.metrics || {
                total_items_analyzed: 0,
                high_priority_issues: 0,
                anomalies_found: 0
              },
              confidence_score: analysisData.confidence_score ?? 0.5,
              insights: Array.isArray(analysisData.insights) ? analysisData.insights : ["No additional insights"],
              risks: Array.isArray(analysisData.risks) ? analysisData.risks : ["No risks identified"],
              structured_output: analysisData.structured_output || {
                lead_quality_score: "C",
                engagement_readiness: "warm",
                decision_maker_level: "Manager",
                best_approach: "consultative",
                estimated_deal_size: "Unknown",
                sales_cycle_estimate: "Unknown",
                recommended_next_step: "Conduct additional research",
                recommended_timing: "this week",
                key_talking_points: ["Initial contact recommended"]
              }
            };
            
            console.log('✅ BD Analysis completed with tool calling');
          } else {
            console.warn('⚠️ Tool call did not return expected format, falling back to standard flow');
          }
        } catch (toolError) {
          console.error('Tool calling failed, falling back to standard provider chain:', toolError);
          const latencyMs = Date.now() - startTime;
          telemetry.push({
            provider: 'openai',
            model: 'gpt-4o-mini',
            latencyMs,
            error: { message: toolError instanceof Error ? toolError.message : 'Tool calling failed' },
          });
        }
      }
    }

    // Check if this is Client Intelligence - use tool calling with Lovable AI Gateway
    const isClientIntelligence = target === "client_intelligence";

    if (isClientIntelligence && !parsedResponse) {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      
      if (lovableKey) {
        const startTime = Date.now();
        try {
          console.log('🔄 Using Lovable AI Gateway for Client Intelligence analysis');
          
          // Build enhanced messages with conversation history if provided
          const intelligenceMessages = [...messages];
          
          // Include conversation history for multi-turn support
          if (payload.conversation_history && payload.conversation_history.length > 0) {
            // Insert conversation history before the current question
            const systemMsg = intelligenceMessages.shift()!;
            const currentUserMsg = intelligenceMessages.pop()!;
            
            intelligenceMessages.push(systemMsg);
            for (const historyMsg of payload.conversation_history) {
              intelligenceMessages.push({
                role: historyMsg.role as 'user' | 'assistant',
                content: typeof historyMsg.content === 'string' 
                  ? historyMsg.content 
                  : JSON.stringify(historyMsg.content)
              });
            }
            intelligenceMessages.push(currentUserMsg);
          }
          
          const toolCallResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: intelligenceMessages,
              tools: [clientIntelligenceToolSchema],
              tool_choice: { type: "function", function: { name: "provide_client_intelligence" } },
            }),
          });

          const toolCallResult = await toolCallResponse.json();
          const latencyMs = Date.now() - startTime;
          
          if (!toolCallResponse.ok) {
            console.error('Lovable AI Gateway error:', toolCallResult);
            throw new Error(toolCallResult.error?.message || 'Lovable AI Gateway request failed');
          }
          
          telemetry.push({
            provider: 'lovable' as any,
            model: 'google/gemini-2.5-flash',
            latencyMs,
            tokenUsage: {
              promptTokens: toolCallResult.usage?.prompt_tokens,
              completionTokens: toolCallResult.usage?.completion_tokens,
              totalTokens: toolCallResult.usage?.total_tokens,
            },
          });
          rawOutputs.push(toolCallResult);

          const toolCall = toolCallResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall && toolCall.function.name === "provide_client_intelligence") {
            const intelligenceData = JSON.parse(toolCall.function.arguments);
            
            // Quality gate: check if the response is meaningful
            const hasFindings = intelligenceData.key_findings && intelligenceData.key_findings.length > 0;
            const hasActions = intelligenceData.action_items && intelligenceData.action_items.length > 0;
            const dataQuality = intelligenceData.data_quality || { coverage_score: 0, missing_data: [] };
            
            // If coverage is too low and no meaningful insights, add helpful guidance
            if (!hasFindings && dataQuality.coverage_score < 25) {
              intelligenceData.summary = "Limited data available for comprehensive analysis. See recommendations below to improve data quality.";
              intelligenceData.key_findings = [{
                finding: "Insufficient data for meaningful analysis",
                evidence: `Only ${dataQuality.coverage_score}% of expected data sources are available`,
                source_type: "client_profile",
                source_reference: "Data quality assessment",
                confidence: "high"
              }];
              intelligenceData.action_items = [
                { action: "Add deal comments to track conversation progress", context: "Comments provide context for relationship analysis", priority: "high", owner: "Account Manager", timeline: "This week" },
                { action: "Log follow-up tasks for upcoming client interactions", context: "Follow-ups enable proactive relationship management", priority: "high", owner: "BD Team", timeline: "Today" },
                { action: "Create deals to track revenue opportunities", context: "Deals allow pipeline value tracking", priority: "medium", owner: "BD Team", timeline: "This week" }
              ];
            }
            
            // Return the structured intelligence output directly as the response
            parsedResponse = {
              summary: intelligenceData.summary || "Analysis completed",
              findings: intelligenceData.key_findings?.map((f: any) => typeof f === 'string' ? f : f.finding) || [],
              recommendations: intelligenceData.action_items?.map((a: any) => typeof a === 'string' ? a : a.action) || [],
              action_items: intelligenceData.action_items || [],
              metrics: {
                total_items_analyzed: (inputContext as any)?.deals?.length || 0,
                high_priority_issues: intelligenceData.risks?.filter((r: any) => r.severity === 'high').length || 0,
                anomalies_found: intelligenceData.risks?.length || 0
              },
              confidence_score: dataQuality.coverage_score >= 50 ? 0.9 : 0.6,
              structured_output: intelligenceData
            };
            
            console.log('✅ Client Intelligence analysis completed with tool calling');
          } else {
            console.warn('⚠️ Client Intelligence tool call did not return expected format, falling back to standard flow');
          }
        } catch (toolError) {
          console.error('Client Intelligence tool calling failed, falling back to standard provider chain:', toolError);
          telemetry.push({
            provider: 'lovable' as any,
            model: 'google/gemini-2.5-flash',
            latencyMs: Date.now() - startTime,
            error: { message: toolError instanceof Error ? toolError.message : 'Tool calling failed' },
          });
        }
      } else {
        console.warn('⚠️ LOVABLE_API_KEY not found for Client Intelligence, falling back to provider chain');
      }
    }

    // Check if this is BD Manager Chat - use tool calling with Lovable AI Gateway
    const isBDManagerChat = target === "bd_manager_chat";

    if (isBDManagerChat && !parsedResponse) {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      
      if (lovableKey) {
        const startTime = Date.now();
        try {
          console.log('🔄 Using Lovable AI Gateway for BD Manager Chat analysis');
          
          // Build enhanced messages with conversation history if provided
          const bdMessages = [...messages];
          
          // Include conversation history for multi-turn support
          if (payload.conversation_history && payload.conversation_history.length > 0) {
            const systemMsg = bdMessages.shift()!;
            const currentUserMsg = bdMessages.pop()!;
            
            bdMessages.push(systemMsg);
            for (const historyMsg of payload.conversation_history) {
              bdMessages.push({
                role: historyMsg.role as 'user' | 'assistant',
                content: typeof historyMsg.content === 'string' 
                  ? historyMsg.content 
                  : JSON.stringify(historyMsg.content)
              });
            }
            bdMessages.push(currentUserMsg);
          }
          
          const toolCallResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: bdMessages,
              tools: [bdManagerChatToolSchema],
              tool_choice: { type: "function", function: { name: "provide_bd_manager_insights" } },
            }),
          });

          const toolCallResult = await toolCallResponse.json();
          const latencyMs = Date.now() - startTime;
          
          if (!toolCallResponse.ok) {
            console.error('Lovable AI Gateway error:', toolCallResult);
            throw new Error(toolCallResult.error?.message || 'Lovable AI Gateway request failed');
          }
          
          telemetry.push({
            provider: 'lovable' as any,
            model: 'google/gemini-2.5-flash',
            latencyMs,
            tokenUsage: {
              promptTokens: toolCallResult.usage?.prompt_tokens,
              completionTokens: toolCallResult.usage?.completion_tokens,
              totalTokens: toolCallResult.usage?.total_tokens,
            },
          });
          rawOutputs.push(toolCallResult);

          const toolCall = toolCallResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall && toolCall.function.name === "provide_bd_manager_insights") {
            const bdData = JSON.parse(toolCall.function.arguments);
            
            // Handle empty data gracefully
            const dataQuality = bdData.data_quality || { coverage_score: 0, missing_data: ["No data available"], data_freshness: "Unknown" };
            
            if (dataQuality.coverage_score < 20) {
              bdData.summary = bdData.summary || "Limited data available for this week. Consider generating a weekly report first to populate the data.";
              bdData.action_items = bdData.action_items || [
                { action: "Generate weekly BD report", priority: "high", owner: "Manager", timeline: "Today", context: "Reports populate the data needed for analysis" },
                { action: "Ensure team submits DHS entries daily", priority: "high", owner: "Manager", timeline: "This week", context: "DHS data drives performance insights" }
              ];
            }
            
            // Return structured BD Manager response
            parsedResponse = {
              summary: bdData.summary || "Analysis completed",
              findings: bdData.rep_insights?.map((r: any) => `${r.rep_name}: ${r.status}`) || [],
              recommendations: bdData.action_items?.map((a: any) => a.action) || [],
              action_items: bdData.action_items || [],
              metrics: {
                total_items_analyzed: (inputContext as any)?.team_metrics?.team_size || 0,
                high_priority_issues: bdData.action_items?.filter((a: any) => a.priority === 'high').length || 0,
                anomalies_found: bdData.rep_insights?.filter((r: any) => r.status === 'at_risk' || r.status === 'off_track').length || 0
              },
              confidence_score: dataQuality.coverage_score >= 50 ? 0.9 : 0.6,
              structured_output: bdData
            };
            
            console.log('✅ BD Manager Chat analysis completed with tool calling');
          } else {
            console.warn('⚠️ BD Manager Chat tool call did not return expected format, falling back to standard flow');
          }
        } catch (toolError) {
          console.error('BD Manager Chat tool calling failed, falling back to standard provider chain:', toolError);
          telemetry.push({
            provider: 'lovable' as any,
            model: 'google/gemini-2.5-flash',
            latencyMs: Date.now() - startTime,
            error: { message: toolError instanceof Error ? toolError.message : 'Tool calling failed' },
          });
        }
      } else {
        console.warn('⚠️ LOVABLE_API_KEY not found for BD Manager Chat, falling back to provider chain');
      }
    }

    // Check if this is LinkedIn message generation - use tool calling for structured output
    const isLinkedInMessage = (agent as any).slug === 'linkedin-message-generator' || agent.category === 'linkedin_outreach';

    if (isLinkedInMessage && !parsedResponse) {
      // Extract message type from execution context for character limit enforcement
      const messageType = (executionContext as any)?.message_type || 'connection_request';
      const charLimit = messageType === 'connection_request' ? 200 : 500;
      
      // Add character limit reminder to the system prompt
      const enhancedMessages = [...messages];
      enhancedMessages[0] = {
        ...enhancedMessages[0],
        content: `${enhancedMessages[0].content}\n\nIMPORTANT: For ${messageType} messages, STRICTLY limit each message variant to ${charLimit} characters or less. This is a hard LinkedIn platform constraint.`
      };
      
      // Use Lovable AI Gateway with tool calling for LinkedIn messages
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      
      if (lovableKey) {
        const startTime = Date.now();
        try {
          console.log('🔄 Using Lovable AI Gateway for LinkedIn message generation');
          const toolCallResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: enhancedMessages,
              tools: [linkedInMessageToolSchema],
              tool_choice: { type: "function", function: { name: "generate_linkedin_messages" } },
            }),
          });

          const toolCallResult = await toolCallResponse.json();
          const latencyMs = Date.now() - startTime;
          
          if (!toolCallResponse.ok) {
            console.error('Lovable AI Gateway error:', toolCallResult);
            throw new Error(toolCallResult.error?.message || 'Lovable AI Gateway request failed');
          }
          
          telemetry.push({
            provider: 'lovable' as any,
            model: 'google/gemini-2.5-flash',
            latencyMs,
            tokenUsage: {
              promptTokens: toolCallResult.usage?.prompt_tokens,
              completionTokens: toolCallResult.usage?.completion_tokens,
              totalTokens: toolCallResult.usage?.total_tokens,
            },
          });
          rawOutputs.push(toolCallResult);

          const toolCall = toolCallResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall && toolCall.function.name === "generate_linkedin_messages") {
            const linkedInData = JSON.parse(toolCall.function.arguments);
            
            // Replace placeholders in message variants with actual execution context values
            if (linkedInData.message_variants && Array.isArray(linkedInData.message_variants)) {
              linkedInData.message_variants = linkedInData.message_variants.map((variant: any) => {
                const originalMessage = variant.message ?? "";
                const filledMessage = replacePlaceholders(originalMessage, executionContext as any);
                return {
                  ...variant,
                  message: filledMessage,
                  character_count: filledMessage.length,
                };
              });
            }
            
            // Return the structured LinkedIn message output
            parsedResponse = {
              summary: `Generated ${linkedInData.message_variants?.length || 0} LinkedIn message variants`,
              findings: [],
              recommendations: [],
              action_items: [],
              metrics: {
                total_items_analyzed: linkedInData.message_variants?.length || 0,
                high_priority_issues: 0,
                anomalies_found: 0
              },
              confidence_score: 0.9,
              structured_output: linkedInData
            };
            
            console.log('✅ LinkedIn message generation completed with tool calling');
          } else {
            console.warn('⚠️ LinkedIn tool call did not return expected format, falling back to standard flow');
          }
        } catch (toolError) {
          console.error('LinkedIn tool calling failed, falling back to standard provider chain:', toolError);
          const latencyMs = Date.now() - startTime;
          telemetry.push({
            provider: 'lovable' as any,
            model: 'google/gemini-2.5-flash',
            latencyMs,
            error: { message: toolError instanceof Error ? toolError.message : 'Tool calling failed' },
          });
        }
      } else {
        console.warn('⚠️ LOVABLE_API_KEY not found, falling back to provider chain');
      }
    }

    // Fallback to standard provider chain if tool calling wasn't used or failed
    if (!parsedResponse) {
      for (const providerConfig of providerChain) {
        const result = await invokeProvider(providerConfig, messages);
        const telemetryEntry = buildProviderTelemetry(result);
        telemetry.push(telemetryEntry);
        rawOutputs.push(result.rawResponse);

        if (!result.content) {
          console.error(`Provider ${providerConfig.provider}/${providerConfig.model} failed:`, {
            error: telemetryEntry.error,
            rawResponse: result.rawResponse,
          });
          continue;
        }

        try {
          parsedResponse = tryParseJson(result.content);
          break;
        } catch (error) {
          telemetry[telemetry.length - 1] = {
            ...telemetry[telemetry.length - 1],
            error: {
              message: error instanceof Error ? error.message : "Unable to parse provider output",
            },
          };
        }
      }
    }

    if (!parsedResponse) {
      throw new Error("All providers failed to produce a valid response");
    }

    // Final validation: ensure all expected fields exist for BD analysis
    if (isBDAnalysis) {
      parsedResponse = {
        ...parsedResponse,
        insights: parsedResponse.insights || ["No additional insights available"],
        risks: parsedResponse.risks || ["No risks identified"],
        structured_output: parsedResponse.structured_output || {
          lead_quality_score: "C",
          engagement_readiness: "warm",
          decision_maker_level: "Manager",
          best_approach: "consultative",
          estimated_deal_size: "Unknown",
          sales_cycle_estimate: "Unknown",
          recommended_next_step: "Conduct additional research",
          recommended_timing: "this week",
          key_talking_points: ["Initial contact recommended"]
        }
      };
    }

    const structuredOutput = (parsedResponse as any).structured_output ?? parsedResponse;
    let enrichedClient: ClientRow | null = clientProfile;

    if (target === "client" && clientProfile) {
      const structuredData = typeof structuredOutput === "object" && structuredOutput
        ? structuredOutput as Record<string, unknown>
        : {};

      const updates: Record<string, unknown> = {};
      const nextIndustry = typeof structuredData.industry === "string" ? structuredData.industry.trim() : "";
      if (nextIndustry) {
        updates.industry = nextIndustry;
      }

      const nextEmployeeCount = normalizeNumericValue(structuredData.employee_count);
      if (nextEmployeeCount !== null) {
        updates.employee_count = nextEmployeeCount;
      }

      const nextRevenue = normalizeNumericValue(structuredData.revenue);
      if (nextRevenue !== null) {
        updates.revenue = nextRevenue;
      }

      const summaryNote = typeof structuredData.summary === "string"
        ? structuredData.summary.trim()
        : "";
      if (summaryNote) {
        updates.notes = summaryNote;
      }

      if (Object.keys(updates).length > 0) {
        try {
          const { data: updatedClient, error: updateError } = await client
            .from("clients")
            .update(updates)
            .eq("id", clientProfile.id)
            .select("id, name, website, industry, notes, employee_count, revenue")
            .maybeSingle();

          if (updateError) {
            throw updateError;
          }

          enrichedClient = (updatedClient as ClientRow | null) ?? { ...clientProfile, ...updates } as ClientRow;
        } catch (updateError) {
          console.error("Failed to update client with enriched data", updateError);
        }
      }
    }

    const runRecord = await persistRun(client, {
      agentId: agentId as string,
      userId,
      agentCategory: (agent as any).category ?? null,
      executionContext: executionContext,
      response: parsedResponse,
      providerTelemetry: telemetry,
      providerRawOutputs: rawOutputs,
      selectedFileIds: fileIds,
      userContext,
      structuredOutput,
    });

    const responsePayload: Record<string, unknown> = {
      success: true,
      run_id: (runRecord as any).id,
      summary: parsedResponse.summary,
      findings: parsedResponse.findings,
      recommendations: parsedResponse.recommendations,
      action_items: parsedResponse.action_items,
      structured_output: structuredOutput,
      telemetry,
    };

    if (target === "client" && enrichedClient) {
      responsePayload.enriched_client = {
        id: enrichedClient.id,
        name: enrichedClient.name,
        website: enrichedClient.website ?? null,
        industry: enrichedClient.industry ?? null,
        notes: enrichedClient.notes ?? null,
        employee_count: enrichedClient.employee_count ?? null,
        revenue: enrichedClient.revenue ?? null,
      };
      responsePayload.client_id = enrichedClient.id;
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in run-ai-agent function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
