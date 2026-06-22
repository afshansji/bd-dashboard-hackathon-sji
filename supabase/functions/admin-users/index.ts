import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type SupabaseServiceClient = ReturnType<typeof createClient>

console.log("Admin Users function up and running!")

interface UserWithDetails {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  title: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
  user_brands?: Array<{
    brand_id: string;
    brand_name: string;
    access_level: string;
    can_view_analytics: boolean;
    can_manage_content: boolean;
    can_manage_team: boolean;
    can_manage_settings: boolean;
  }>;
  permissions?: Array<{
    module_name: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>;
}

interface BrandAssignmentInput {
  brand_id: string;
  access_level?: string;
}

interface RawUserBrand {
  brand_id: string;
  access_level: string;
  can_view_analytics: boolean;
  can_manage_content: boolean;
  can_manage_team: boolean;
  can_manage_settings: boolean;
  brands?: {
    name?: string | null;
  };
}

interface RawUserPermission {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface RawUserRecord {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  title: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
  user_brands?: RawUserBrand[] | null;
  user_permissions?: RawUserPermission[] | null;
}

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  status?: string;
  title?: string | null;
  department?: string | null;
  brandAssignments?: BrandAssignmentInput[];
}

interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  title?: string | null;
  department?: string | null;
  brandAssignments?: BrandAssignmentInput[];
}

// Build select query for users table (without role field and brand assignments)
const buildUserSelect = () => `
  id,
  email,
  first_name,
  last_name,
  status,
  title,
  department,
  created_at,
  updated_at
`;

const transformUser = (userData: RawUserRecord, role: string = 'user'): UserWithDetails => ({
  ...userData,
  role,
  title: userData.title ?? null,
  department: userData.department ?? null,
  user_brands: [],
  permissions: [],
});

const syncUserBrands = async (
  client: any,
  userId: string,
  brandAssignments: BrandAssignmentInput[] = [],
) => {
  // Brand assignments feature is not implemented in this system
  // This function is kept for backward compatibility but does nothing
  console.log('Note: Brand assignments feature is not available in this system');
  return;
};

// Fetch user with details including role from user_roles table
const fetchUserWithDetails = async (client: any, userId: string): Promise<UserWithDetails> => {
  // Fetch user data
  const { data: userData, error: userError } = await client
    .from('users')
    .select(buildUserSelect())
    .eq('id', userId)
    .single();

  if (userError) {
    throw userError;
  }

  // Fetch role from user_roles table
  const { data: roleData, error: roleError } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    console.error('Error fetching user role:', roleError);
  }

  const role = roleData?.role || 'user';
  
  return transformUser(userData as RawUserRecord, role);
};

// Get user's role from user_roles table
const getUserRole = async (client: any, userId: string): Promise<string | null> => {
  const { data, error } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role || null;
};

// Update user role in user_roles table
const updateUserRole = async (client: any, userId: string, role: string): Promise<void> => {
  // First, delete all existing roles for this user
  const { error: deleteError } = await client
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error removing old roles:', deleteError);
    throw deleteError;
  }

  // Then insert the new role
  const { error: insertError } = await client
    .from('user_roles')
    .insert({ user_id: userId, role });

  if (insertError) {
    throw insertError;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Verify the requesting user is authenticated and has admin privileges
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Check if user has admin privileges from user_roles table
    const userRole = await getUserRole(supabaseClient, user.id);
    
    if (!userRole || !['super_admin', 'admin'].includes(userRole)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient privileges' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      )
    }

    const { method } = req
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    // Get userId from query params for PUT/DELETE, from path for GET single user
    const userIdFromQuery = url.searchParams.get('userId')
    const userIdFromPath = pathSegments[pathSegments.length - 1]
    const userId = userIdFromQuery || (userIdFromPath !== 'admin-users' ? userIdFromPath : null)

    if (method === 'GET') {
      if (userId && userId !== 'admin-users') {
        try {
          const userWithDetails = await fetchUserWithDetails(supabaseClient, userId)

          return new Response(
            JSON.stringify({ user: userWithDetails }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        } catch (userError: unknown) {
          const message = userError instanceof Error ? userError.message : 'Failed to load user'
          return new Response(
            JSON.stringify({ error: message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }
      } else {
        // Get all users with pagination and filtering
        const searchParams = url.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const roleFilter = searchParams.get('role') || ''
        const statusFilter = searchParams.get('status') || ''

        const offset = (page - 1) * limit

        console.log('[admin-users] Fetching user statistics...');

        // Calculate stats from database
        const { count: totalCount, error: totalError } = await supabaseClient
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (totalError) {
          console.error('[admin-users] Error fetching total count:', totalError);
          return new Response(
            JSON.stringify({ error: `Failed to fetch total count: ${totalError.message}` }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          );
        }

        const { count: activeCount, error: activeError } = await supabaseClient
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (activeError) {
          console.error('[admin-users] Error fetching active count:', activeError);
          return new Response(
            JSON.stringify({ error: `Failed to fetch active count: ${activeError.message}` }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          );
        }

        const { data: managersData, error: managersError } = await supabaseClient
          .from('user_roles')
          .select('user_id', { count: 'exact', head: false })
          .eq('role', 'manager');

        if (managersError) {
          console.error('[admin-users] Error fetching managers:', managersError);
          // Don't throw - just log and continue with 0 managers
        }

        const stats = {
          total: totalCount || 0,
          active: activeCount || 0,
          managers: managersData?.length || 0,
        };

        console.log('[admin-users] Statistics:', stats);

        let query = supabaseClient
          .from('users')
          .select(buildUserSelect(), { count: 'exact' })

        // Apply filters
        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
        }
        if (statusFilter) {
          query = query.eq('status', statusFilter)
        }

        console.log('[admin-users] Executing main users query...');

        const { data: users, error: usersError, count } = await query
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false })

        if (usersError) {
          console.error('[admin-users] Error fetching users:', usersError);
          return new Response(
            JSON.stringify({ error: `Database error: ${usersError.message}` }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        console.log('[admin-users] Fetched', users?.length || 0, 'users');

        // Fetch roles for all users
        const userIds = (users && Array.isArray(users)) ? users.map((u: any) => u.id) : [];
        
        console.log('[admin-users] Fetching roles for', userIds.length, 'users');
        
        const { data: rolesData, error: rolesError } = await supabaseClient
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        if (rolesError) {
          console.error('[admin-users] Error fetching user roles:', rolesError);
          // Continue without roles rather than failing completely
        }

        console.log('[admin-users] Fetched', rolesData?.length || 0, 'roles');

        // Create role map
        const roleMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));

        // Transform the data with roles
        let usersWithDetails: UserWithDetails[] = (users || []).map((user: any) => {
          const role = roleMap.get(user.id) || 'user';
          return transformUser(user as RawUserRecord, role);
        });

        // Apply role filter if specified
        if (roleFilter) {
          usersWithDetails = usersWithDetails.filter(u => u.role === roleFilter);
        }

        return new Response(
          JSON.stringify({ 
            users: usersWithDetails,
            total: roleFilter ? usersWithDetails.length : (count || 0),
            page,
            limit,
            stats
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    if (method === 'POST') {
      // Parse body once for all POST actions
      const body = await req.json();

      // PASSWORD RESET ACTION (must be checked before user-creation logic)
      if (body.action === 'resetPassword') {
        const { userId: targetUserId, newPassword } = body;

        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for password reset' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        if (!newPassword || newPassword.length < 8) {
          return new Response(
            JSON.stringify({ error: 'Password must be at least 8 characters long' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        try {
          // Verify target user exists
          const { data: authUser, error: authCheckError } =
            await supabaseClient.auth.admin.getUserById(targetUserId)

          if (authCheckError || !authUser?.user) {
            return new Response(
              JSON.stringify({ error: 'User not found in authentication system' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
          }

          // Update password
          const { error: updateError } =
            await supabaseClient.auth.admin.updateUserById(targetUserId, { password: newPassword })

          if (updateError) {
            console.error('Supabase Auth password update failed:', { userId: targetUserId, error: updateError.message })
            return new Response(
              JSON.stringify({ error: `Password reset failed: ${updateError.message}` }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
          }

          // Audit log
          try {
            await supabaseClient.from('user_activity_log').insert({
              user_id: user.id,
              action: 'admin_password_reset',
              resource_type: 'user',
              resource_id: targetUserId,
              metadata: { admin_id: user.id, target_user_id: targetUserId, action_type: 'password_reset' }
            })
          } catch (logError) {
            console.warn('Failed to log password reset action:', logError)
          }

          console.log(`[admin-users] Password reset for user ${targetUserId} by admin ${user.id}`)

          return new Response(
            JSON.stringify({ success: true, message: 'Password reset successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (resetError: any) {
          const message = resetError instanceof Error ? resetError.message : 'Password reset failed'
          console.error('[admin-users] Password reset error:', { userId: targetUserId, error: message })
          return new Response(
            JSON.stringify({ error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }

      // Create new user
      const {
        email,
        password,
        firstName,
        lastName,
        role = 'user',
        status = 'active',
        title = null,
        department = null,
        brandAssignments = [],
      } = body as CreateUserRequest

      console.log('Creating user:', email, 'with role:', role)

      // Validate role - align with actual app_role enum
      const validRoles = ['super_admin', 'admin', 'manager', 'project_manager', 'team_member', 'client', 'bd_user'];
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // PRE-CHECK: Check both auth.users and users table for this email
      const emailLower = email.toLowerCase();
      
      // Check auth.users
      const { data: authUsers, error: authListError } = await supabaseClient.auth.admin.listUsers()
      const existingAuthUser = authListError ? null : authUsers?.users.find(u => u.email?.toLowerCase() === emailLower)
      
      // Check users table
      const { data: existingUser, error: userCheckError } = await supabaseClient
        .from('users')
        .select('id, email')
        .eq('email', emailLower)
        .maybeSingle()
      
      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error('Database error checking email:', userCheckError)
        return new Response(
          JSON.stringify({ error: 'Database error checking email. Please try again.' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }
      
      // AUTO-REPAIR: If user exists in auth but not in users table
      if (existingAuthUser && !existingUser) {
        console.log(`Auto-repairing orphaned auth user: ${email}`)
        
        try {
          // Create the missing users table entry
          const { error: repairError } = await supabaseClient
            .from('users')
            .insert({
              id: existingAuthUser.id,
              email: emailLower,
              first_name: firstName,
              last_name: lastName,
              status,
              title,
              department,
            })
          
          if (repairError) {
            console.error('Failed to repair user profile:', repairError)
            return new Response(
              JSON.stringify({ 
                error: `User exists in authentication but profile repair failed. Please contact administrator.`
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500 
              }
            )
          }
          
          // Update the role
          await updateUserRole(supabaseClient, existingAuthUser.id, role)
          
          // Fetch and return the repaired user
          const repairedUser = await fetchUserWithDetails(supabaseClient, existingAuthUser.id)
          
          return new Response(
            JSON.stringify({ 
              user: repairedUser,
              message: 'User profile was repaired. Please send a password reset email to allow the user to set their password.'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        } catch (repairError) {
          console.error('Repair operation failed:', repairError)
          return new Response(
            JSON.stringify({ error: 'Failed to repair orphaned user record' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          )
        }
      }
      
      // If user exists in both systems, block creation
      if (existingUser || existingAuthUser) {
        return new Response(
          JSON.stringify({ 
            error: `A user with email ${email} already exists in the system`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // NORMAL PATH: Create user in auth
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          title,
          department,
        }
      })

      if (authError) {
        console.error('Auth user creation error:', authError)
        
        // Handle specific error cases with clearer messaging
        let errorMessage = authError.message;
        
        if (errorMessage.includes('duplicate') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('User already registered')) {
          errorMessage = `Email ${email} is already registered. Please use a different email or contact administrator if this is an error.`;
        } else if (errorMessage.includes('recovery_token') || 
                   errorMessage.includes('Scan error') || 
                   errorMessage.includes('converting NULL to string')) {
          errorMessage = `System error during user creation. This email may already exist. Please refresh and try again.`;
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const newUserId = authData.user?.id;
      if (!newUserId) {
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      // Create or update user record in users table (trigger may have already created it)
      // Note: We do NOT include role here - it goes in user_roles table
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .upsert({
          id: newUserId,
          email,
          first_name: firstName,
          last_name: lastName,
          status,
          title,
          department,
        }, {
          onConflict: 'id'
        })
        .select()
        .single()

      if (userError) {
        console.error('User table creation error:', userError)
        
        // TRANSACTIONAL CLEANUP: Roll back auth user creation
        try {
          await supabaseClient.auth.admin.deleteUser(newUserId)
          console.log('Cleaned up auth user after users table failure')
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError)
        }
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to create user profile: ${userError.message}. Authentication record has been rolled back.`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Insert role into user_roles table (replacing any default role from trigger)
      try {
        await updateUserRole(supabaseClient, newUserId, role);
      } catch (roleError: unknown) {
        console.error('Role assignment error:', roleError);
        
        // TRANSACTIONAL CLEANUP: Roll back both auth and users table
        try {
          await supabaseClient.from('users').delete().eq('id', newUserId)
          await supabaseClient.auth.admin.deleteUser(newUserId)
          console.log('Cleaned up auth and users records after role assignment failure')
        } catch (cleanupError) {
          console.error('Failed to cleanup after role error:', cleanupError)
        }
        
        const message = roleError instanceof Error ? roleError.message : 'Failed to assign role';
        return new Response(
          JSON.stringify({ 
            error: `Role assignment failed: ${message}. User creation has been rolled back.`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Assign brands
      try {
        await syncUserBrands(supabaseClient, newUserId, brandAssignments)
      } catch (brandError: unknown) {
        const message = brandError instanceof Error ? brandError.message : 'Failed to assign brands'
        console.error('Brand assignment error:', brandError)
        return new Response(
          JSON.stringify({ error: message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      const createdUser = await fetchUserWithDetails(supabaseClient, userData.id)

      console.log('User created successfully:', email)
      return new Response(
        JSON.stringify({ user: createdUser }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201
        }
      )
    }

    if (method === 'PUT') {
      // Special action: validate user health
      const action = url.searchParams.get('action')
      if (action === 'validate' && userId) {
        try {
          const validationResult = {
            userId,
            users_table: false,
            user_roles_table: false,
            auth_users: false,
            auth_loadable: false,
            issues: [] as string[]
          }

          // Check users table
          const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id, email')
            .eq('id', userId)
            .maybeSingle()
          
          validationResult.users_table = !!userData
          if (!userData) validationResult.issues.push('Missing entry in users table')

          // Check user_roles table
          const { data: roleData, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle()
          
          validationResult.user_roles_table = !!roleData
          if (!roleData) validationResult.issues.push('Missing role assignment')

          // Check auth.users
          try {
            const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId)
            validationResult.auth_users = !!authUser?.user
            validationResult.auth_loadable = !!authUser?.user && !authError
            
            if (!authUser?.user) {
              validationResult.issues.push('Missing auth.users record')
            } else if (authError) {
              validationResult.issues.push(`Auth user exists but not loadable: ${authError.message}`)
            }
          } catch (authCheckError: any) {
            validationResult.issues.push(`Cannot access auth user: ${authCheckError.message}`)
          }

          return new Response(
            JSON.stringify({ 
              valid: validationResult.issues.length === 0,
              validation: validationResult
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        } catch (validationError: any) {
          return new Response(
            JSON.stringify({ error: `Validation failed: ${validationError.message}` }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }
      }

      // PASSWORD RESET ACTION removed from PUT — now handled in POST handler above

      if (!userId || userId === 'admin-users') {
        return new Response(
          JSON.stringify({ error: 'User ID required for update' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      const { brandAssignments, ...rawUpdates } = await req.json() as UpdateUserRequest
      const warnings: string[] = []

      const updatePayload: Record<string, unknown> = {}

      if (typeof rawUpdates.email !== 'undefined') {
        updatePayload.email = rawUpdates.email
      }
      if (typeof rawUpdates.firstName !== 'undefined') {
        updatePayload.first_name = rawUpdates.firstName
      }
      if (typeof rawUpdates.lastName !== 'undefined') {
        updatePayload.last_name = rawUpdates.lastName
      }
      // Note: role is NOT included in updatePayload - it's handled separately
      if (typeof rawUpdates.status !== 'undefined') {
        updatePayload.status = rawUpdates.status
      }
      if (typeof rawUpdates.title !== 'undefined') {
        updatePayload.title = rawUpdates.title
      }
      if (typeof rawUpdates.department !== 'undefined') {
        updatePayload.department = rawUpdates.department
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: userError } = await supabaseClient
          .from('users')
          .update(updatePayload)
          .eq('id', userId)

        if (userError) {
          return new Response(
            JSON.stringify({ error: userError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }
      }

      // Update role in user_roles table if provided
      if (typeof rawUpdates.role !== 'undefined') {
        const validRoles = ['super_admin', 'admin', 'manager', 'project_manager', 'team_member', 'client', 'bd_user'];
        if (!validRoles.includes(rawUpdates.role)) {
          return new Response(
            JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        try {
          await updateUserRole(supabaseClient, userId, rawUpdates.role);
        } catch (roleError: unknown) {
          const message = roleError instanceof Error ? roleError.message : 'Failed to update role';
          return new Response(
            JSON.stringify({ error: message }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
      }

      // Update email in auth.users if provided (with pre-check and graceful error handling)
      if (typeof rawUpdates.email !== 'undefined') {
        try {
          // Pre-check: verify auth user exists and is loadable
          const { data: authCheckData, error: authCheckError } = await supabaseClient.auth.admin.getUserById(userId)
          
          if (authCheckError || !authCheckData?.user) {
            console.warn(`Auth user ${userId} not loadable, skipping email update:`, authCheckError?.message)
            warnings.push('Email could not be synced to authentication system (auth record missing or corrupted). User profile was still updated.')
          } else {
            // Auth user is loadable, proceed with update
            const { error: emailError } = await supabaseClient.auth.admin.updateUserById(userId, {
              email: rawUpdates.email
            })

            if (emailError) {
              console.error('Failed to update auth email:', emailError)
              // Treat as non-fatal - allow profile update to proceed
              warnings.push(`Email updated in profile but could not sync to authentication: ${emailError.message}`)
            }
          }
        } catch (authUpdateError: any) {
          console.error('Unexpected error updating auth email:', authUpdateError)
          warnings.push('Email updated in profile but authentication sync failed. Please contact administrator.')
        }
      }

      if (Array.isArray(brandAssignments)) {
        try {
          await syncUserBrands(supabaseClient, userId, brandAssignments)
        } catch (brandError: unknown) {
          const message = brandError instanceof Error ? brandError.message : 'Failed to update brand assignments'
          return new Response(
            JSON.stringify({ error: message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }
      }

      const metadataUpdates: Record<string, unknown> = {}
      if (typeof rawUpdates.firstName !== 'undefined') {
        metadataUpdates.first_name = rawUpdates.firstName
      }
      if (typeof rawUpdates.lastName !== 'undefined') {
        metadataUpdates.last_name = rawUpdates.lastName
      }
      // Note: role is NOT stored in user_metadata anymore
      if (typeof rawUpdates.title !== 'undefined') {
        metadataUpdates.title = rawUpdates.title
      }
      if (typeof rawUpdates.department !== 'undefined') {
        metadataUpdates.department = rawUpdates.department
      }

      if (Object.keys(metadataUpdates).length > 0) {
        try {
          await supabaseClient.auth.admin.updateUserById(userId, {
            user_metadata: metadataUpdates
          })
        } catch (metadataError: any) {
          console.warn('Failed to update auth metadata:', metadataError)
          warnings.push('User profile updated but some metadata could not sync to authentication.')
        }
      }

      const updatedUser = await fetchUserWithDetails(supabaseClient, userId)

      const response: any = { user: updatedUser }
      if (warnings.length > 0) {
        response.warnings = warnings
        response.message = warnings.join(' ')
      }

      return new Response(
        JSON.stringify(response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    if (method === 'DELETE') {
      if (!userId || userId === 'admin-users') {
        return new Response(
          JSON.stringify({ error: 'User ID required for deletion' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Delete from auth (this will cascade to users and user_roles tables via ON DELETE CASCADE)
      const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId)

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      return new Response(
        JSON.stringify({ message: 'User deleted successfully' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
