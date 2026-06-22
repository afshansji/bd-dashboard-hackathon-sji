-- Update the bd-research-analyst agent prompt template to produce valid JSON output
UPDATE ai_agents
SET prompt_template = 'Analyze the following contact research data and provide actionable insights for business development outreach.

Contact Data:
{{contact_data}}

Provide your analysis in the following JSON format:
{
  "summary": "A clear 2-3 sentence overview of the contact and opportunity",
  "findings": [
    "Key finding 1 about their background",
    "Key finding 2 about their role",
    "Key finding 3 about pain points or opportunities",
    "Key finding 4 about relevant experience"
  ],
  "recommendations": [
    "Specific outreach recommendation 1",
    "Specific outreach recommendation 2",
    "Specific outreach recommendation 3"
  ],
  "action_items": [],
  "metrics": {
    "total_items_analyzed": 1,
    "anomalies_found": 0,
    "high_priority_issues": 0
  },
  "confidence_score": 0.85
}

Focus on:
1. Their current role and company
2. Relevant experience and expertise
3. Potential pain points based on their industry
4. Specific angles for personalized outreach
5. Best engagement strategy'
WHERE slug = 'bd-research-analyst';