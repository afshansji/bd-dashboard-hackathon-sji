export const COPILOT_EXAMPLE_PROMPTS = [
  "Have we done something similar?",
  "Show projects using PostgreSQL.",
  "Why is confidence only 72%?",
  "Which projects prove React experience?",
  "Which engineers would likely be needed?",
  "What questions should I ask the client?",
  "Can we reduce delivery risk?",
  "Which services can we upsell?",
  "What should we mention in our proposal?",
] as const;

export const COPILOT_QUICK_ACTIONS = [
  { label: "Explain Score", prompt: "Explain the opportunity score and confidence level. Why this rating?" },
  { label: "Find Similar Projects", prompt: "Which past projects are most similar to this opportunity? Cite repository evidence." },
  { label: "Proposal Ideas", prompt: "What should we highlight in our proposal? Give 5 specific talking points backed by evidence." },
  { label: "Discovery Questions", prompt: "Generate discovery questions we should ask the client before bidding." },
  { label: "Delivery Risks", prompt: "What are the top delivery risks and how can we mitigate them?" },
  { label: "Upsell Opportunities", prompt: "What additional services could we upsell (mobile, AI, cloud migration, etc.)?" },
  { label: "Recommended Team", prompt: "Which engineering roles and seniority levels would this project likely need?" },
  { label: "Architecture Advice", prompt: "What architecture approach fits this scope? Recommend stack choices based on our experience." },
] as const;
