import { buildProviderChain, type AgentConfig } from "../../_shared/providers.ts";

if (typeof Deno !== "undefined") {
  Deno.test("buildProviderChain falls back to defaults", () => {
    const chain = buildProviderChain({}, "gpt-4o-mini");
    if (chain.length !== 3) {
      throw new Error(`expected 3 providers, received ${chain.length}`);
    }
    if (chain[0].provider !== "openai" || chain[1].provider !== "openai") {
      throw new Error("expected primary and fallback to be OpenAI by default");
    }
    if (chain[2].provider !== "openai-mini") {
      throw new Error("expected final fallback to be openai-mini");
    }
  });

  Deno.test("buildProviderChain respects agent configuration", () => {
    const agentConfig: AgentConfig = {
      providers: {
        primary: { provider: "anthropic", model: "claude-3-opus" },
        fallback: { provider: "openai", model: "gpt-4o" },
        research: { provider: "perplexity", model: "sonar-medium" },
      },
      features: { enableResearch: true },
    };
    const chain = buildProviderChain(agentConfig, "gpt-4o-mini");
    if (chain[0].provider !== "anthropic") {
      throw new Error("primary provider should be anthropic");
    }
    if (chain[1].model !== "gpt-4o") {
      throw new Error("fallback should use configured model");
    }
    if (chain[3].provider !== "perplexity") {
      throw new Error("research provider should be included when feature enabled");
    }
  });
}
