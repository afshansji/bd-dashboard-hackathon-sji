export interface AnalyticsMetricInput {
  metric_name: string;
  metric_value: number;
  source?: string;
  recorded_at?: string;
  dimensions?: Record<string, unknown>;
}

interface InsertOptions {
  defaultSource?: string;
}

export async function insertAnalyticsMetrics(
  client: any,
  metrics: AnalyticsMetricInput[],
  options: InsertOptions = {},
): Promise<void> {
  if (!metrics || metrics.length === 0) {
    return;
  }

  const { defaultSource = "bd_campaigns" } = options;

  const rows = metrics.map((metric) => ({
    source: metric.source ?? defaultSource,
    metric_name: metric.metric_name,
    metric_value: metric.metric_value,
    dimensions: metric.dimensions ?? {},
    recorded_at: metric.recorded_at ?? new Date().toISOString(),
  }));

  try {
    const { error } = await client.from("analytics_data").insert(rows);
    if (error) {
      if ((error as { code?: string }).code === "42P01") {
        console.warn("[admin-campaigns] analytics_data table missing, skipping metric insert");
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("[admin-campaigns] Failed to insert analytics metrics", error);
    throw error;
  }
}
