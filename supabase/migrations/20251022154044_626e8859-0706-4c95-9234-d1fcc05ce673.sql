-- Create sample AI agents for the agentic framework

-- Insert LinkedIn Lead Analyzer Agent
INSERT INTO ai_agents (
  name,
  description,
  type,
  config,
  is_active
) VALUES (
  'LinkedIn Lead Analyzer',
  'Analyzes LinkedIn lead engagement and recommends next actions for follow-up',
  'linkedin',
  '{
    "system_prompt": "You are an expert business development analyst. Analyze LinkedIn lead engagement data and provide actionable recommendations for next steps. Consider factors like response time, engagement level, and conversation context. Provide clear, prioritized action items.",
    "features": {
      "telemetry": true,
      "research_mode": false,
      "multi_provider": false
    },
    "providers": {
      "primary": {
        "name": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "max_tokens": 1000
      },
      "fallback": {
        "name": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "max_tokens": 1000
      }
    }
  }'::jsonb,
  true
);

-- Insert Deal Pipeline Analyzer Agent
INSERT INTO ai_agents (
  name,
  description,
  type,
  config,
  is_active
) VALUES (
  'Deal Pipeline Analyzer',
  'Analyzes deal pipeline health and identifies bottlenecks and opportunities',
  'pipeline',
  '{
    "system_prompt": "You are a sales operations expert. Analyze deal pipeline data to identify bottlenecks, stalled deals, and opportunities for acceleration. Provide specific recommendations for improving conversion rates and deal velocity. Focus on actionable insights backed by data.",
    "features": {
      "telemetry": true,
      "research_mode": true,
      "multi_provider": false
    },
    "providers": {
      "primary": {
        "name": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.5,
        "max_tokens": 1500
      },
      "fallback": {
        "name": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.5,
        "max_tokens": 1500
      },
      "research": {
        "name": "perplexity",
        "model": "llama-3.1-sonar-small-128k-online",
        "temperature": 0.3,
        "max_tokens": 1000
      }
    }
  }'::jsonb,
  true
);

-- Insert Business Development Insights Agent
INSERT INTO ai_agents (
  name,
  description,
  type,
  config,
  is_active
) VALUES (
  'BD Weekly Insights',
  'Generates weekly business development insights and action items from activity data',
  'business_development',
  '{
    "system_prompt": "You are a strategic business development advisor. Analyze weekly BD activity data including meetings, proposals, and deal progress. Generate comprehensive insights about trends, team performance, and strategic opportunities. Provide prioritized action items for the upcoming week.",
    "features": {
      "telemetry": true,
      "research_mode": false,
      "multi_provider": true
    },
    "providers": {
      "primary": {
        "name": "openai",
        "model": "gpt-4o",
        "temperature": 0.6,
        "max_tokens": 2000
      },
      "fallback": {
        "name": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.6,
        "max_tokens": 2000
      }
    }
  }'::jsonb,
  true
);