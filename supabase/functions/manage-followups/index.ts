import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { method } = req;
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');

    switch (method) {
      case 'GET':
        let query = supabase
          .from('followups')
          .select('*')
          .order('date', { ascending: false });

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'POST':
        const createData = await req.json();
        const { data: newFollowup, error: createError } = await supabase
          .from('followups')
          .insert(createData)
          .select()
          .single();

        if (createError) throw createError;
        return new Response(JSON.stringify(newFollowup), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });

      case 'PUT':
        if (!id) throw new Error('Follow-up ID required');
        const updateData = await req.json();
        const { data: updatedFollowup, error: updateError } = await supabase
          .from('followups')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;
        return new Response(JSON.stringify(updatedFollowup), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'DELETE':
        if (!id) throw new Error('Follow-up ID required');
        const { error: deleteError } = await supabase
          .from('followups')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        return new Response(null, {
          headers: corsHeaders,
          status: 204,
        });

      default:
        return new Response('Method not allowed', {
          headers: corsHeaders,
          status: 405,
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
