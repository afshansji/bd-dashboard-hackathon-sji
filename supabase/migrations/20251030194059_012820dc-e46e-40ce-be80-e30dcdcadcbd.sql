-- Create Document Q&A Agent
INSERT INTO ai_agents (
  name,
  description,
  slug,
  category,
  type,
  config,
  is_active,
  system_prompt
) VALUES (
  'Document Q&A Assistant',
  'Ask questions about deal documents and get instant answers with citations',
  'deal-document-qa',
  'Deal Intelligence',
  'document_qa',
  '{
    "providers": {
      "primary": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.3,
        "maxTokens": 2000
      }
    },
    "features": {
      "enableResearch": false,
      "enableTelemetry": true
    }
  }'::jsonb,
  true,
  'You are a document analysis assistant. Answer user questions based ONLY on the provided deal documents. Always cite which document your answer comes from using the format [Document: filename.ext]. If the information is not in the documents, clearly state "I don''t have that information in the provided documents." Be concise but thorough in your answers.'
) ON CONFLICT (slug) DO NOTHING;