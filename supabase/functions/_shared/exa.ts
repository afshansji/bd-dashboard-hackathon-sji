export function requireExaApiKey(context: string): string {
  const apiKey = Deno.env.get("EXA_API_KEY");
  if (!apiKey) {
    const message = `[${context}] Missing EXA_API_KEY environment variable. Set it locally in .env.local and via \`supabase functions secrets set EXA_API_KEY=<value>\`.`;
    console.error(message);
    throw new Error(message);
  }
  return apiKey;
}
