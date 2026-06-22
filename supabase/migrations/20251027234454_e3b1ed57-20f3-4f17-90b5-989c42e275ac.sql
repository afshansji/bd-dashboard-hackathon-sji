-- Create BD Research AI Agent
INSERT INTO ai_agents (
  name,
  description,
  slug,
  category,
  type,
  config,
  system_prompt,
  prompt_template,
  is_active,
  is_enabled
) VALUES (
  'BD Research Analyst',
  'Analyzes lead research data and provides 10 key insights for business development',
  'bd-research-analyst',
  'business_development',
  'research',
  '{
    "provider": {
      "primary": {
        "name": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 1000
      }
    },
    "features": {
      "streaming": false,
      "caching": true
    }
  }'::jsonb,
  'You are a business development research analyst. Your job is to analyze lead research data and extract the most important insights for a BD professional. Always provide exactly 10 concise, actionable bullet points. Focus on: company background, decision makers, pain points, opportunities, competitive landscape, recent news, and engagement signals.',
  'Analyze the following lead research data and provide exactly 10 bullet points that a business development person needs to know:\n\n{research_data}\n\nProvide 10 actionable insights in bullet point format.',
  true,
  true
);