import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/utils/supabaseErrors';

export type UserActivityAction =
  | 'login'
  | 'logout'
  | 'session_restore'
  | 'deal_created'
  | 'deal_updated'
  | 'campaign_created'
  | 'campaign_updated'
  | 'task_created'
  | 'task_completed'
  | 'ai_agent_run'
  | 'dhs_submitted'
  | 'dhs_updated'
  | 'accountability_goal_created'
  | 'accountability_goal_updated'
  | 'accountability_activity_created'
  | 'accountability_update_submitted';

export interface UserActivityPayload {
  userId: string;
  action: UserActivityAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

function getDefaultUserAgent(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.navigator?.userAgent;
}

export async function logUserActivity(payload: UserActivityPayload): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('user_activity_log')
      .insert({
        user_id: payload.userId,
        action: payload.action,
        resource_type: payload.resourceType,
        resource_id: payload.resourceId,
        metadata: payload.metadata || {},
        ip_address: payload.ipAddress,
        user_agent: payload.userAgent || getDefaultUserAgent(),
      });

    if (error) {
      handleSupabaseError(error, 'user_activity_log');
    }
  } catch (error) {
    console.warn('Failed to log user activity:', error);
  }
}

export async function updateUserPresence(userId: string, options?: { isLogin?: boolean }): Promise<void> {
  try {
    const updates = {
      last_seen: new Date().toISOString(),
    } as Record<string, unknown>;

    if (options?.isLogin) {
      updates.last_login = new Date().toISOString();

      const { data: profileData, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('login_count')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        handleSupabaseError(profileError, 'profiles');
      }

      const currentCount = Number(profileData?.login_count || 0);
      updates.login_count = currentCount + 1;
    }

    const { error } = await (supabase as any)
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      handleSupabaseError(error, 'profiles');
    }
  } catch (error) {
    console.warn('Failed to update user presence:', error);
  }
}
