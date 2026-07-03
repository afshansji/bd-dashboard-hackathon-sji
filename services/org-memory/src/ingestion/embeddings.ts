export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openaiKey = process.env.OPENAI_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  const apiKey = openaiKey || lovableKey;

  if (!apiKey) {
    console.warn("No LOVABLE_API_KEY or OPENAI_API_KEY — skipping embeddings");
    return texts.map(() => []);
  }

  const url = openaiKey
    ? "https://api.openai.com/v1/embeddings"
    : "https://ai.gateway.lovable.dev/v1/embeddings";

  const batchSize = 20;
  const all: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: batch,
        model: "text-embedding-3-small",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Embeddings API failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    all.push(...data.data.map((d) => d.embedding));
  }

  return all;
}

export async function embedText(text: string): Promise<number[] | null> {
  const [embedding] = await embedTexts([text]);
  return embedding?.length ? embedding : null;
}
