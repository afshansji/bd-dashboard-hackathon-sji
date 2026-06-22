import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { logUserActivity, updateUserPresence } from '@/services/userActivityService';

type UserRole = 'super_admin' | 'admin' | 'manager' | 'project_manager' | 'bd_user' | 'team_member';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  avatar?: string;
  brandAccess?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  hasMinimumRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastTrackedSessionRef = useRef<string | null>(null);

  // Role hierarchy for permission checking (normalized to backend app_role enum)
  const roleHierarchy: Record<UserRole, number> = {
    'team_member': 1,
    'bd_user': 2,
    'project_manager': 3,
    'manager': 4,
    'admin': 5,
    'super_admin': 6
  };

  // Fetch user profile from profiles table and role from user_roles table
  const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      // Fetch user profile data from profiles table
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user profile:', userError);
      }

      // Auto-recovery: If profile missing, try to create it
      if (!userProfile && authUser.id) {
        console.warn('⚠️ Profile missing for authenticated user. Attempting auto-recovery...');
        
        const fullName = authUser.user_metadata?.first_name && authUser.user_metadata?.last_name
          ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}`
          : authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';

        try {
          // Attempt to create missing profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email || '',
              full_name: fullName,
              avatar_url: authUser.user_metadata?.avatar_url || null
            });

          if (!insertError) {
            console.log('✅ Profile auto-created successfully');
            
            // Also ensure role exists
            await supabase
              .from('user_roles' as any)
              .insert({ user_id: authUser.id, role: 'team_member' })
              .select()
              .single();
          } else {
            console.error('Failed to auto-create profile:', insertError);
          }
        } catch (autoRecoveryError) {
          console.error('Profile auto-recovery failed:', autoRecoveryError);
        }
      }

      // Fetch all roles from user_roles table (secure separate table)
      const { data: rolesData, error: roleError } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
      }

      const allRoles: UserRole[] = (rolesData as any[] || []).map((r: any) => r.role as UserRole);
      if (allRoles.length === 0) allRoles.push('team_member');

      // Graceful fallback: construct minimal user if profile still missing
      const profile = userProfile || {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.first_name && authUser.user_metadata?.last_name
          ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}`
          : authUser.email?.split('@')[0] || 'User',
        avatar_url: null
      };

      if (!userProfile) {
        console.warn('⚠️ Profile missing for user - using session fallback. Admin should check backend.');
      }

      const displayName = profile.full_name || profile.email;

      // Determine highest-privilege role for backward compatibility
      const highestRole = allRoles.reduce((highest, current) => {
        return roleHierarchy[current] > roleHierarchy[highest] ? current : highest;
      }, allRoles[0]);

      return {
        id: profile.id,
        name: displayName,
        email: profile.email,
        role: highestRole,
        roles: allRoles,
        avatar: profile.avatar_url || authUser.user_metadata?.avatar_url
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener (sync callback only)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      setSession(session);

      if (session?.user) {
        if (event === 'SIGNED_IN') {
          if (lastTrackedSessionRef.current !== session.access_token) {
            lastTrackedSessionRef.current = session.access_token;
            logUserActivity({ userId: session.user.id, action: 'login' });
            updateUserPresence(session.user.id, { isLogin: true });
          }
        }

        if (event === 'INITIAL_SESSION') {
          if (lastTrackedSessionRef.current !== session.access_token) {
            lastTrackedSessionRef.current = session.access_token;
            logUserActivity({ userId: session.user.id, action: 'session_restore' });
            updateUserPresence(session.user.id);
          }
        }

        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => {
          fetchUserProfile(session.user).then((profile) => {
            if (!mounted) return;
            
            if (profile) {
              setUser(profile);
            } else {
              console.warn('No user profile found for authenticated user');
              setUser(null);
            }
            setLoading(false);
            setIsInitialized(true);
          });
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
        setIsInitialized(true);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);

      if (session?.user) {
        if (lastTrackedSessionRef.current !== session.access_token) {
          lastTrackedSessionRef.current = session.access_token;
          logUserActivity({ userId: session.user.id, action: 'session_restore' });
          updateUserPresence(session.user.id);
        }

        fetchUserProfile(session.user).then((profile) => {
          if (!mounted) return;
          
          if (profile) {
            setUser(profile);
          } else {
            console.warn('No user profile found for authenticated user');
            setUser(null);
          }
          setLoading(false);
          setIsInitialized(true);
        });
      } else {
        setLoading(false);
        setIsInitialized(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      setLoading(false);
      throw new Error(error.message);
    }

    // User profile will be fetched automatically by the auth state change listener
    setLoading(false);
  };

  const logout = async () => {
    if (session?.user) {
      logUserActivity({ userId: session.user.id, action: 'logout' });
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.roles?.includes(role) ?? user?.role === role;
  };

  const hasMinimumRole = (role: UserRole): boolean => {
    if (!user) return false;
    // Use highest role from roles array
    const highestLevel = Math.max(...(user.roles || [user.role]).map(r => roleHierarchy[r]));
    return highestLevel >= roleHierarchy[role];
  };

  // Don't render children until the provider is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      hasRole,
      hasMinimumRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}