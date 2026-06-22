export type ProviderName = "openai" | "openai-mini" | "gemini" | "perplexity" | "anthropic" | "lovable";

export interface ProviderConfig {
  provider: ProviderName;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentConfig {
  providers?: {
    primary?: ProviderConfig;
    fallback?: ProviderConfig;
    research?: ProviderConfig;
  };
  features?: {
    enableResearch?: boolean;
    enableTelemetry?: boolean;
  };
}

export interface ProviderTelemetry {
  provider: ProviderName;
  model: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: {
    message: string;
    status?: number;
  };
}

export interface ProviderResult {
  content: string;
  telemetry: ProviderTelemetry;
  rawResponse: unknown;
}

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | undefined;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type AnthropicResponse = {
  content?: Array<{ text?: string }>;
};

function ensureApiKey(provider: ProviderName): string {
  switch (provider) {
    case "openai":
    case "openai-mini": {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) throw new Error("Missing OPENAI_API_KEY environment variable");
      return key;
    }
    case "lovable": {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("Missing LOVABLE_API_KEY environment variable");
      return key;
    }
    case "gemini": {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) throw new Error("Missing GEMINI_API_KEY environment variable");
      return key;
    }
    case "perplexity": {
      const key = Deno.env.get("PERPLEXITY_API_KEY");
      if (!key) throw new Error("Missing PERPLEXITY_API_KEY environment variable");
      return key;
    }
    case "anthropic": {
      const key = Deno.env.get("ANTHROPIC_API_KEY");
      if (!key) throw new Error("Missing ANTHROPIC_API_KEY environment variable");
      return key;
    }
    default:
      throw new Error(`Unsupported provider ${provider}`);
  }
}

function withDefault(config: ProviderConfig | undefined, fallback: ProviderConfig): ProviderConfig {
  if (!config) return fallback;
  return {
    provider: config.provider ?? fallback.provider,
    model: config.model ?? fallback.model,
    temperature: config.temperature ?? fallback.temperature,
    maxTokens: config.maxTokens ?? fallback.maxTokens,
  };
}

export function buildProviderChain(agentConfig: AgentConfig, defaultModel: string): ProviderConfig[] {
  // Default to Lovable AI Gateway for reliability
  const defaultProvider: ProviderConfig = { provider: "lovable", model: defaultModel || "google/gemini-2.5-flash" };
  const primary = withDefault(agentConfig.providers?.primary, defaultProvider);
  const fallback = withDefault(
    agentConfig.providers?.fallback,
    { provider: "lovable", model: "google/gemini-2.5-flash" },
  );
  const research = agentConfig.features?.enableResearch
    ? withDefault(
      agentConfig.providers?.research,
      { provider: "perplexity", model: "sonar-small" },
    )
    : undefined;

  const chain: ProviderConfig[] = [primary];
  if (fallback && (fallback.provider !== primary.provider || fallback.model !== primary.model)) {
    chain.push(fallback);
  }
  // Add Lovable as final fallback
  chain.push({ provider: "lovable", model: "google/gemini-2.5-flash" });
  if (research) {
    chain.push(research);
  }
  return chain;
}

export async function invokeProvider(
  providerConfig: ProviderConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<ProviderResult> {
  const startedAt = performance.now();
  try {
    switch (providerConfig.provider) {
      case "openai":
      case "openai-mini": {
        const apiKey = ensureApiKey("openai");
        
        // GPT-5 and newer models use max_completion_tokens instead of max_tokens
        const isGPT5Model = providerConfig.model.includes('gpt-5') || 
                           providerConfig.model.includes('o3') || 
                           providerConfig.model.includes('o4') || 
                           providerConfig.model.includes('gpt-4.1');
        
        const body: any = {
          model: providerConfig.model,
          response_format: { type: "json_object" },
          messages,
        };
        
        // GPT-5+ models don't support temperature and use max_completion_tokens
        if (isGPT5Model) {
          body.max_completion_tokens = providerConfig.maxTokens ?? 2000;
        } else {
          body.temperature = providerConfig.temperature ?? 0.7;
          body.max_tokens = providerConfig.maxTokens ?? 2000;
        }
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });
        const latency = performance.now() - startedAt;
        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: "",
            rawResponse: errorText,
            telemetry: {
              provider: providerConfig.provider,
              model: providerConfig.model,
              latencyMs: Math.round(latency),
              error: { message: errorText, status: response.status },
            },
          };
        }
        const payload = await response.json() as OpenAIChatResponse;
        const usage = payload.usage ?? {};
        const messageContent = payload.choices?.[0]?.message?.content ?? "";
        return {
          content: messageContent,
          rawResponse: payload,
          telemetry: {
            provider: providerConfig.provider,
            model: providerConfig.model,
            latencyMs: Math.round(latency),
            tokenUsage: {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            },
          },
        };
      }
      case "perplexity": {
        const apiKey = ensureApiKey("perplexity");
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: providerConfig.model,
            messages,
          }),
        });
        const latency = performance.now() - startedAt;
        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: "",
            rawResponse: errorText,
            telemetry: {
              provider: providerConfig.provider,
              model: providerConfig.model,
              latencyMs: Math.round(latency),
              error: { message: errorText, status: response.status },
            },
          };
        }
        const payload = await response.json() as PerplexityResponse;
        const completion = payload.choices?.[0]?.message?.content ?? "";
        return {
          content: completion,
          rawResponse: payload,
          telemetry: {
            provider: providerConfig.provider,
            model: providerConfig.model,
            latencyMs: Math.round(latency),
            tokenUsage: payload.usage ? {
              promptTokens: payload.usage.prompt_tokens,
              completionTokens: payload.usage.completion_tokens,
              totalTokens: payload.usage.total_tokens,
            } : undefined,
          },
        };
      }
      case "gemini": {
        const apiKey = ensureApiKey("gemini");
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${providerConfig.model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: messages.map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.content }],
              })),
            }),
          },
        );
        const latency = performance.now() - startedAt;
        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: "",
            rawResponse: errorText,
            telemetry: {
              provider: providerConfig.provider,
              model: providerConfig.model,
              latencyMs: Math.round(latency),
              error: { message: errorText, status: response.status },
            },
          };
        }
        const payload = await response.json() as GeminiResponse;
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return {
          content: text,
          rawResponse: payload,
          telemetry: {
            provider: providerConfig.provider,
            model: providerConfig.model,
            latencyMs: Math.round(latency),
          },
        };
      }
      case "anthropic": {
        const apiKey = ensureApiKey("anthropic");
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: providerConfig.model,
            max_tokens: providerConfig.maxTokens ?? 1024,
            messages: messages.map((msg) => ({ role: msg.role, content: [{ type: "text", text: msg.content }] })),
          }),
        });
        const latency = performance.now() - startedAt;
        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: "",
            rawResponse: errorText,
            telemetry: {
              provider: providerConfig.provider,
              model: providerConfig.model,
              latencyMs: Math.round(latency),
              error: { message: errorText, status: response.status },
            },
          };
        }
        const payload = await response.json() as AnthropicResponse;
        const text = payload.content?.[0]?.text ?? "";
        return {
          content: text,
          rawResponse: payload,
          telemetry: {
            provider: providerConfig.provider,
            model: providerConfig.model,
            latencyMs: Math.round(latency),
          },
        };
      }
      case "lovable": {
        const apiKey = ensureApiKey("lovable");
        const body: any = {
          model: providerConfig.model || "google/gemini-2.5-flash",
          messages,
        };
        
        // Add response format for JSON if needed (null-safe check)
        if (messages.some(m => m.content && typeof m.content === 'string' && m.content.includes('JSON'))) {
          body.response_format = { type: "json_object" };
        }
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });
        const latency = performance.now() - startedAt;
        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: "",
            rawResponse: errorText,
            telemetry: {
              provider: providerConfig.provider,
              model: providerConfig.model,
              latencyMs: Math.round(latency),
              error: { message: errorText, status: response.status },
            },
          };
        }
        const payload = await response.json() as OpenAIChatResponse;
        const usage = payload.usage ?? {};
        const messageContent = payload.choices?.[0]?.message?.content ?? "";
        return {
          content: messageContent,
          rawResponse: payload,
          telemetry: {
            provider: providerConfig.provider,
            model: providerConfig.model,
            latencyMs: Math.round(latency),
            tokenUsage: {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            },
          },
        };
      }
      default:
        throw new Error(`Unsupported provider ${providerConfig.provider}`);
    }
  } catch (error) {
    const latency = performance.now() - startedAt;
    const message = error instanceof Error ? error.message : "Unknown provider error";
    return {
      content: "",
      rawResponse: message,
      telemetry: {
        provider: providerConfig.provider,
        model: providerConfig.model,
        latencyMs: Math.round(latency),
        error: { message },
      },
    };
  }
}

