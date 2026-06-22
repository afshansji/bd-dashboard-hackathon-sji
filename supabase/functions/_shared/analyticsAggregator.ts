import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const ACTIVITY_WEIGHTS: Record<string, number> = {
  login: 1,
  session_restore: 0,
  deal_created: 5,
  deal_updated: 2,
  campaign_created: 4,
  campaign_updated: 2,
  task_created: 3,
  task_completed: 4,
  ai_agent_run: 3,
  dhs_submitted: 4,
  dhs_updated: 2,
  accountability_goal_created: 4,
  accountability_goal_updated: 2,
  accountability_activity_created: 3,
  accountability_update_submitted: 4,
};

export type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "all";

export interface AggregateOptions {
  period: AnalyticsPeriod;
  periodStart: Date;
  periodEnd: Date;
  page?: number;
  pageSize?: number;
  emailFilter?: string[] | null;
}

export interface AggregatedUserStats {
  name: string;
  email: string;
  activity_score: number;
  activity_count: number;
  login_count: number;
  last_login_at: string | null;
  last_active_at: string | null;
  inactive_for_seconds: number | null;
  activity_breakdown: Record<string, number>;
}

export interface AggregateResult {
  meta: {
    period: AnalyticsPeriod;
    period_start: string;
    period_end: string;
    total_users: number;
    page: number;
    page_size: number;
    total_pages: number;
    generated_at: string;
  };
  summary: {
    active_users: number;
    total_events: number;
    total_logins: number;
  };
  users: Record<string, AggregatedUserStats>;
}

interface ActivityRow {
  user_id: string;
  action: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

function normalizePage(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function normalizePageSize(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const int = Math.floor(n);
  return Math.min(Math.max(int, 1), 200);
}

export async function aggregateUserAnalytics(
  supabase: SupabaseClient,
  options: AggregateOptions,
): Promise<AggregateResult> {
  const generatedAt = new Date();

  const periodStartIso = options.periodStart.toISOString();
  const periodEndIso = options.periodEnd.toISOString();

  const { data: activityLogs, error: activityError } = await supabase
    .from("user_activity_log")
    .select("user_id, action, created_at")
    .gte("created_at", periodStartIso)
    .lte("created_at", periodEndIso)
    .order("created_at", { ascending: false });

  if (activityError) {
    throw new Error(`Failed to load user activity logs: ${activityError.message}`);
  }

  const logs = (activityLogs || []) as ActivityRow[];

  const activityByUser = new Map<
    string,
    {
      activityCount: number;
      loginCount: number;
      activityScore: number;
      lastActiveAt: string | null;
      lastLoginAt: string | null;
      breakdown: Record<string, number>;
    }
  >();

  for (const log of logs) {
    const current = activityByUser.get(log.user_id) || {
      activityCount: 0,
      loginCount: 0,
      activityScore: 0,
      lastActiveAt: log.created_at ?? null,
      lastLoginAt: null,
      breakdown: {} as Record<string, number>,
    };

    current.activityCount += 1;
    current.activityScore += ACTIVITY_WEIGHTS[log.action] ?? 1;
    current.breakdown[log.action] = (current.breakdown[log.action] || 0) + 1;

    if (log.action === "login") {
      current.loginCount += 1;
      if (!current.lastLoginAt || new Date(log.created_at) > new Date(current.lastLoginAt)) {
        current.lastLoginAt = log.created_at;
      }
    }

    if (!current.lastActiveAt || new Date(log.created_at) > new Date(current.lastActiveAt)) {
      current.lastActiveAt = log.created_at;
    }

    activityByUser.set(log.user_id, current);
  }

  const userIds = Array.from(activityByUser.keys());

  // Resolve userId -> profile (name/email). Fetch only needed profiles by default.
  let profiles: ProfileRow[] = [];
  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(`Failed to load profiles: ${profilesError.message}`);
    }
    profiles = (profilesData || []) as ProfileRow[];
  }

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const periodEndMs = options.periodEnd.getTime();
  const allEntries: Array<{ emailKey: string; stats: AggregatedUserStats }> = [];
  for (const [userId, stats] of activityByUser.entries()) {
    const profile = profileById.get(userId);
    const email = profile?.email?.trim() || "";
    const name = (profile?.full_name || profile?.email || "Unknown User")?.toString();
    const emailKey = email || `unknown-${userId}`;
    const lastActiveMs = stats.lastActiveAt ? new Date(stats.lastActiveAt).getTime() : null;
    const inactiveForSeconds =
      lastActiveMs !== null && Number.isFinite(lastActiveMs)
        ? Math.max(0, Math.floor((periodEndMs - lastActiveMs) / 1000))
        : null;

    allEntries.push({
      emailKey,
      stats: {
        name,
        email: email || emailKey,
        activity_score: stats.activityScore,
        activity_count: stats.activityCount,
        login_count: stats.loginCount,
        last_login_at: stats.lastLoginAt,
        last_active_at: stats.lastActiveAt,
        inactive_for_seconds: inactiveForSeconds,
        activity_breakdown: stats.breakdown,
      },
    });
  }

  let filteredEntries = allEntries;
  if (Array.isArray(options.emailFilter) && options.emailFilter.length > 0) {
    const normalizedSet = new Set(
      options.emailFilter
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0),
    );
    filteredEntries = allEntries.filter((e) => normalizedSet.has(e.emailKey.trim().toLowerCase()));
  }

  filteredEntries.sort((a, b) => {
    if (b.stats.activity_score !== a.stats.activity_score) {
      return b.stats.activity_score - a.stats.activity_score;
    }
    return b.stats.activity_count - a.stats.activity_count;
  });

  const totalUsers = filteredEntries.length;
  const page = normalizePage(options.page, 1);
  const pageSize = options.pageSize === undefined ? totalUsers || 1 : normalizePageSize(options.pageSize, 50);
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  const startIndex = (page - 1) * pageSize;
  const pageEntries = filteredEntries.slice(startIndex, startIndex + pageSize);

  const users: Record<string, AggregatedUserStats> = {};
  for (const entry of pageEntries) {
    users[entry.emailKey] = entry.stats;
  }

  const summaryTotalEvents = filteredEntries.reduce((sum, e) => sum + e.stats.activity_count, 0);
  const summaryTotalLogins = filteredEntries.reduce((sum, e) => sum + e.stats.login_count, 0);

  return {
    meta: {
      period: options.period,
      period_start: periodStartIso,
      period_end: periodEndIso,
      total_users: totalUsers,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      generated_at: generatedAt.toISOString(),
    },
    summary: {
      active_users: totalUsers,
      total_events: summaryTotalEvents,
      total_logins: summaryTotalLogins,
    },
    users,
  };
}

