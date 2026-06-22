import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ZEROBOUNCE_API_BASE = 'https://api.zerobounce.net/v2';

async function getClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false },
  });
}

async function requireAuth(client: any): Promise<string | null> {
  const { data: { user } } = await client.auth.getUser();
  return user?.id || null;
}

async function isSuperAdmin(client: any, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle();

  if (error) {
    console.error('[zerobounce-manage] Error checking super admin:', error);
    return false;
  }

  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const client = await getClient(req);
  const userId = await requireAuth(client);

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      // Get current Zerobounce configuration (super admin only)
      const isAdmin = await isSuperAdmin(client, userId);
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Super admin access required' }),
          { status: 403, headers: corsHeaders });
      }

      const { data: config, error } = await client
        .from('zerobounce_config')
        .select('id, is_active, last_tested_at, test_status, credits_remaining, created_at')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify({
        ok: true,
        configured: !!config,
        config: config || null
      }), { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, apiKey, emails } = body;

      if (action === 'test') {
        // Test the API key (super admin only)
        const isAdmin = await isSuperAdmin(client, userId);
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Super admin access required' }),
            { status: 403, headers: corsHeaders });
        }

        if (!apiKey) {
          return new Response(JSON.stringify({ ok: false, error: 'API key required' }),
            { status: 400, headers: corsHeaders });
        }

        try {
          // Test with Zerobounce API - check credits
          const testUrl = `${ZEROBOUNCE_API_BASE}/getcredits?api_key=${apiKey}`;
          console.log('[zerobounce-manage] Testing API key');

          const response = await fetch(testUrl);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[zerobounce-manage] Test failed:', response.status, errorText);
            throw new Error(`API test failed (${response.status})`);
          }

          const data = await response.json();
          console.log('[zerobounce-manage] Test successful, credits:', data.Credits);

          return new Response(JSON.stringify({
            ok: true,
            credits: data.Credits
          }), { headers: corsHeaders });
        } catch (error) {
          console.error('[zerobounce-manage] Test error:', error);
          return new Response(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : 'Connection test failed'
          }), { status: 400, headers: corsHeaders });
        }
      }

      if (action === 'save') {
        // Save the API key (super admin only)
        const isAdmin = await isSuperAdmin(client, userId);
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Super admin access required' }),
            { status: 403, headers: corsHeaders });
        }

        if (!apiKey) {
          return new Response(JSON.stringify({ ok: false, error: 'API key required' }),
            { status: 400, headers: corsHeaders });
        }

        // First test the API key
        try {
          const testUrl = `${ZEROBOUNCE_API_BASE}/getcredits?api_key=${apiKey}`;
          console.log('[zerobounce-manage] Testing API key before save');

          const response = await fetch(testUrl);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[zerobounce-manage] Save test failed:', response.status, errorText);
            throw new Error(`API key validation failed (${response.status})`);
          }

          const data = await response.json();
          const credits = data.Credits;
          console.log('[zerobounce-manage] API key validated, credits:', credits);

          // Deactivate existing configurations
          console.log('[zerobounce-manage] Deactivating existing configurations');
          const { error: deactivateError } = await client
            .from('zerobounce_config')
            .update({ is_active: false })
            .eq('is_active', true);

          if (deactivateError) {
            console.error('[zerobounce-manage] Error deactivating configs:', deactivateError);
            throw deactivateError;
          }

          // Save new configuration
          console.log('[zerobounce-manage] Saving new configuration');
          const { error: saveError } = await client
            .from('zerobounce_config')
            .insert({
              api_key: apiKey,
              is_active: true,
              last_tested_at: new Date().toISOString(),
              test_status: 'success',
              test_response: { credits },
              credits_remaining: credits,
              created_by: userId,
              updated_by: userId
            });

          if (saveError) {
            console.error('[zerobounce-manage] Error saving config:', saveError);
            throw saveError;
          }

          console.log('[zerobounce-manage] Configuration saved successfully');
          return new Response(JSON.stringify({
            ok: true,
            credits
          }), { headers: corsHeaders });
        } catch (error) {
          console.error('[zerobounce-manage] Save error:', error);
          return new Response(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : 'Failed to save configuration'
          }), { status: 400, headers: corsHeaders });
        }
      }

      if (action === 'delete') {
        // Delete the API key (super admin only)
        const isAdmin = await isSuperAdmin(client, userId);
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Super admin access required' }),
            { status: 403, headers: corsHeaders });
        }

        // Deactivate all configurations
        const { error: deleteError } = await client
          .from('zerobounce_config')
          .update({ is_active: false })
          .eq('is_active', true);

        if (deleteError) {
          console.error('[zerobounce-manage] Error deleting config:', deleteError);
          throw deleteError;
        }

        console.log('[zerobounce-manage] Configuration deleted successfully');
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      if (action === 'validate') {
        // Validate email(s)
        if (!emails || (Array.isArray(emails) && emails.length === 0)) {
          return new Response(JSON.stringify({ ok: false, error: 'Email(s) required' }),
            { status: 400, headers: corsHeaders });
        }

        // Get active API key
        const { data: config, error: configError } = await client
          .from('zerobounce_config')
          .select('api_key, credits_remaining')
          .eq('is_active', true)
          .maybeSingle();

        if (configError || !config) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'Zerobounce not configured. Please contact your administrator.'
          }), { status: 400, headers: corsHeaders });
        }

        const emailList = Array.isArray(emails) ? emails : [emails];
        const results = [];

        try {
          for (const email of emailList) {
            const validateUrl = `${ZEROBOUNCE_API_BASE}/validate?api_key=${config.api_key}&email=${encodeURIComponent(email)}`;

            const response = await fetch(validateUrl);

            if (!response.ok) {
              console.error('[zerobounce-manage] Validation failed for:', email);
              results.push({
                email,
                status: 'error',
                error: 'Validation failed'
              });
              continue;
            }

            const data = await response.json();
            console.log('[zerobounce-manage] Validation result for', email, ':', data.status);

            // Handle data type conversions for database compatibility
            const domainAgeDays = data.domain_age_days ? 
              (typeof data.domain_age_days === 'string' ? parseInt(data.domain_age_days, 10) : data.domain_age_days) : 
              null;
            
            const mxFound = data.mx_found !== undefined ? 
              (typeof data.mx_found === 'string' ? data.mx_found.toLowerCase() === 'true' : Boolean(data.mx_found)) : 
              null;

            // Store validation result
            const { error: insertError } = await client
              .from('zerobounce_validations')
              .insert({
                email: email,
                validation_status: data.status ? data.status.toLowerCase() : 'unknown',
                sub_status: data.sub_status || null,
                account: data.account || null,
                domain: data.domain || null,
                did_you_mean: data.did_you_mean || null,
                domain_age_days: domainAgeDays,
                free_email: Boolean(data.free_email),
                mx_found: mxFound,
                mx_record: data.mx_record || null,
                smtp_provider: data.smtp_provider || null,
                firstname: data.firstname || null,
                lastname: data.lastname || null,
                gender: data.gender || null,
                country: data.country || null,
                region: data.region || null,
                city: data.city || null,
                zipcode: data.zipcode || null,
                processed_at: data.processed_at || new Date().toISOString(),
                validation_metadata: data,
                created_by: userId
              });

            if (insertError) {
              console.error('[zerobounce-manage] Error storing validation:', insertError);
            }

            results.push({
              email,
              status: data.status,
              sub_status: data.sub_status,
              free_email: data.free_email,
              did_you_mean: data.did_you_mean
            });
          }

          // Update credits after validation
          const creditsUrl = `${ZEROBOUNCE_API_BASE}/getcredits?api_key=${config.api_key}`;
          const creditsResponse = await fetch(creditsUrl);
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            await client
              .from('zerobounce_config')
              .update({ credits_remaining: creditsData.Credits })
              .eq('is_active', true);
          }

          return new Response(JSON.stringify({
            ok: true,
            results
          }), { headers: corsHeaders });
        } catch (error) {
          console.error('[zerobounce-manage] Validation error:', error);
          return new Response(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : 'Validation failed'
          }), { status: 500, headers: corsHeaders });
        }
      }

      if (action === 'get-credits') {
        // Get current credit balance (super admin only)
        const isAdmin = await isSuperAdmin(client, userId);
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Super admin access required' }),
            { status: 403, headers: corsHeaders });
        }

        const { data: config, error: configError } = await client
          .from('zerobounce_config')
          .select('api_key')
          .eq('is_active', true)
          .maybeSingle();

        if (configError || !config) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'Zerobounce not configured'
          }), { status: 400, headers: corsHeaders });
        }

        try {
          const creditsUrl = `${ZEROBOUNCE_API_BASE}/getcredits?api_key=${config.api_key}`;
          const response = await fetch(creditsUrl);

          if (!response.ok) {
            throw new Error('Failed to fetch credits');
          }

          const data = await response.json();

          // Update credits in database
          await client
            .from('zerobounce_config')
            .update({ credits_remaining: data.Credits })
            .eq('is_active', true);

          return new Response(JSON.stringify({
            ok: true,
            credits: data.Credits
          }), { headers: corsHeaders });
        } catch (error) {
          console.error('[zerobounce-manage] Credits error:', error);
          return new Response(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : 'Failed to fetch credits'
          }), { status: 500, headers: corsHeaders });
        }
      }
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }),
      { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('[zerobounce-manage]', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), { status: 500, headers: corsHeaders });
  }
});
