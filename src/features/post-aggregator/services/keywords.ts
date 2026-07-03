export const LEAD_KEYWORDS = [
  "need developer",
  "looking for developer",
  "need app developer",
  "need website developer",
  "technical cofounder",
  "need CTO",
  "need AWS help",
  "hire react developer",
  "need MVP",
] as const;

export type LeadKeyword = (typeof LEAD_KEYWORDS)[number];
