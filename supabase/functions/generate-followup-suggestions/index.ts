import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

async function generateSuggestionsForEntity(
  supabase: any,
  lovableApiKey: string,
  userId: string,
  entityType: 'deal' | 'contact',
  entityId: string
) {
  let contextData: any = {};

  if (entityType === 'deal') {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        client:clients(name, industry, website),
        deal_comments(comment, created_at, user_id),
        deal_checklist_items(title, is_completed)
      `)
      .eq('id', entityId)
      .single();

    if (dealError) throw dealError;
    contextData = deal;

    const { data: lastComment } = await supabase
      .from('deal_comments')
      .select('created_at')
      .eq('deal_id', entityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    contextData.lastActivity = lastComment?.created_at;
  } else {
    const { data: contact, error: contactError } = await supabase
      .from('campaign_contacts')
      .select(`
        *,
        campaign:bd_campaigns(name, status, campaign_type),
        campaign_contact_comments(comment, created_at)
      `)
      .eq('id', entityId)
      .single();

    if (contactError) throw contactError;
    contextData = contact;

    const { data: lastComment } = await supabase
      .from('campaign_contact_comments')
      .select('created_at')
      .eq('contact_id', entityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    contextData.lastActivity = lastComment?.created_at;
  }

  const systemPrompt = `You are a business development assistant helping sales teams with intelligent follow-up strategies. 
Based on the context provided, suggest 2-3 follow-up actions with:
1. Recommended timing (calculate days from now)
2. Type of follow-up (email, call, linkedin, meeting)
3. Priority level (low, medium, high, urgent)
4. Clear reasoning for each suggestion
5. A personalized message draft for each follow-up`;

  const userPrompt = entityType === 'deal'
    ? `Deal Context:
- Title: ${contextData.title}
- Stage: ${contextData.stage}
- Status: ${contextData.status}
- Client: ${contextData.client?.name}
- Industry: ${contextData.client?.industry}
- Amount: $${contextData.amount || 'Not specified'}
- Last Activity: ${contextData.lastActivity ? new Date(contextData.lastActivity).toLocaleDateString() : 'No recent activity'}

Generate 2-3 follow-up suggestions to move this deal forward.`
    : `Contact Context:
- Name: ${contextData.contact_name}
- Company: ${contextData.contact_company}
- Title: ${contextData.current_position_title}
- Status: ${contextData.status}
- Campaign: ${contextData.campaign?.name}
- Last Activity: ${contextData.lastActivity ? new Date(contextData.lastActivity).toLocaleDateString() : 'No recent activity'}

Generate 2-3 follow-up suggestions to engage this contact effectively.`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'create_followup_suggestions',
          description: 'Create intelligent follow-up suggestions',
          parameters: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    days_from_now: { type: 'number', description: 'Days from today to schedule follow-up' },
                    type: { type: 'string', enum: ['email', 'call', 'linkedin', 'meeting', 'other'] },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                    reasoning: { type: 'string', description: 'Why this follow-up is recommended' },
                    message_draft: { type: 'string', description: 'Personalized message for this follow-up' },
                    topic: { type: 'string', description: 'Brief topic/subject of the follow-up' }
                  },
                  required: ['days_from_now', 'type', 'priority', 'reasoning', 'message_draft', 'topic']
                }
              }
            },
            required: ['suggestions']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'create_followup_suggestions' } }
    })
  });

  if (!aiResponse.ok) {
    throw new Error(`AI API error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('No tool call in AI response');
  }

  const suggestionsData = JSON.parse(toolCall.function.arguments);

  const suggestions = suggestionsData.suggestions.map((s: any) => {
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + s.days_from_now);

    return {
      user_id: userId,
      ...(entityType === 'deal' ? { deal_id: entityId } : { campaign_contact_id: entityId }),
      suggested_date: suggestedDate.toISOString().split('T')[0],
      suggested_type: s.type,
      suggested_priority: s.priority,
      reasoning: s.reasoning,
      ai_message_draft: s.message_draft,
      metadata: { topic: s.topic }
    };
  });

  const { data: insertedSuggestions, error: insertError } = await supabase
    .from('followup_suggestions')
    .insert(suggestions)
    .select();

  if (insertError) throw insertError;

  return insertedSuggestions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { dealId, contactId } = await req.json();

    // If no specific deal or contact, fetch active deals and contacts for the user
    if (!dealId && !contactId) {
      console.log('[generate-followup] No specific entity ID provided, fetching active entities...');
      
      // Get active deals for the user
      const { data: userDeals, error: dealsError } = await supabase
        .from('deals')
        .select('id, title, stage, status')
        .in('stage', ['discovery', 'qualification', 'proposal', 'negotiation'])
        .order('updated_at', { ascending: false })
        .limit(5);

      if (dealsError) {
        console.error('[generate-followup] Error fetching deals:', dealsError);
      } else {
        console.log(`[generate-followup] Found ${userDeals?.length || 0} active deals`);
      }

      // Get recent campaign contacts
      const { data: recentContacts, error: contactsError } = await supabase
        .from('campaign_contacts')
        .select('id, contact_name, status')
        .in('status', ['identified', 'researched', 'contacted_linkedin', 'connected'])
        .order('updated_at', { ascending: false })
        .limit(5);

      if (contactsError) {
        console.error('[generate-followup] Error fetching contacts:', contactsError);
      } else {
        console.log(`[generate-followup] Found ${recentContacts?.length || 0} recent contacts`);
      }

      // Check if we have any entities to process
      const hasDeals = userDeals && userDeals.length > 0;
      const hasContacts = recentContacts && recentContacts.length > 0;

      if (!hasDeals && !hasContacts) {
        console.log('[generate-followup] No active deals or contacts found');
        return new Response(
          JSON.stringify({ 
            success: true, 
            suggestions: [],
            count: 0,
            message: 'No active deals or campaign contacts found. Add some deals in discovery/qualification/proposal/negotiation stages, or campaign contacts in identified/researched/contacted/connected statuses.'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Generate suggestions for both deals and contacts
      let allSuggestions: any[] = [];
      const errors: string[] = [];

      // Process deals
      if (hasDeals) {
        console.log(`[generate-followup] Processing ${Math.min(2, userDeals.length)} deals...`);
        for (const deal of userDeals.slice(0, 2)) {
          try {
            const dealSuggestions = await generateSuggestionsForEntity(
              supabase,
              lovableApiKey,
              user.id,
              'deal',
              deal.id
            );
            allSuggestions = [...allSuggestions, ...dealSuggestions];
            console.log(`[generate-followup] Generated ${dealSuggestions.length} suggestions for deal: ${deal.title}`);
          } catch (error) {
            const errorMsg = `Failed to generate suggestions for deal ${deal.title}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`[generate-followup] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }

      // Process contacts
      if (hasContacts) {
        console.log(`[generate-followup] Processing ${Math.min(2, recentContacts.length)} contacts...`);
        for (const contact of recentContacts.slice(0, 2)) {
          try {
            const contactSuggestions = await generateSuggestionsForEntity(
              supabase,
              lovableApiKey,
              user.id,
              'contact',
              contact.id
            );
            allSuggestions = [...allSuggestions, ...contactSuggestions];
            console.log(`[generate-followup] Generated ${contactSuggestions.length} suggestions for contact: ${contact.contact_name}`);
          } catch (error) {
            const errorMsg = `Failed to generate suggestions for contact ${contact.contact_name}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`[generate-followup] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }

      console.log(`[generate-followup] Total suggestions generated: ${allSuggestions.length}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          suggestions: allSuggestions,
          count: allSuggestions.length,
          errors: errors.length > 0 ? errors : undefined,
          processed: {
            deals: hasDeals ? Math.min(2, userDeals.length) : 0,
            contacts: hasContacts ? Math.min(2, recentContacts.length) : 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original logic for specific deal or contact
    let contextData: any = {};
    let entityType = '';
    let entityId = '';

    if (dealId) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          client:clients(name, industry, website),
          deal_comments(comment, created_at, user_id),
          deal_checklist_items(title, is_completed)
        `)
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;
      contextData = deal;
      entityType = 'deal';
      entityId = dealId;

      // Get last activity date
      const { data: lastComment } = await supabase
        .from('deal_comments')
        .select('created_at')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      contextData.lastActivity = lastComment?.created_at;
    } else if (contactId) {
      const { data: contact, error: contactError } = await supabase
        .from('campaign_contacts')
        .select(`
          *,
          campaign:bd_campaigns(name, status, campaign_type),
          campaign_contact_comments(comment, created_at)
        `)
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;
      contextData = contact;
      entityType = 'contact';
      entityId = contactId;

      const { data: lastComment } = await supabase
        .from('campaign_contact_comments')
        .select('created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      contextData.lastActivity = lastComment?.created_at;
    }

    // Build AI prompt for generating follow-up suggestions
    const systemPrompt = `You are a business development assistant helping sales teams with intelligent follow-up strategies. 
Based on the context provided, suggest 3-5 follow-up actions with:
1. Recommended timing (calculate days from now)
2. Type of follow-up (email, call, linkedin, meeting)
3. Priority level (low, medium, high, urgent)
4. Clear reasoning for each suggestion
5. A personalized message draft for each follow-up

Consider:
- Time since last contact
- Deal/contact stage and status
- Industry best practices for the type of engagement
- Pending tasks or incomplete checklist items
- Previous communication patterns`;

    const userPrompt = entityType === 'deal'
      ? `Deal Context:
- Title: ${contextData.title}
- Stage: ${contextData.stage}
- Status: ${contextData.status}
- Client: ${contextData.client?.name}
- Industry: ${contextData.client?.industry}
- Amount: $${contextData.amount || 'Not specified'}
- Last Activity: ${contextData.lastActivity ? new Date(contextData.lastActivity).toLocaleDateString() : 'No recent activity'}
- Recent Comments: ${contextData.deal_comments?.slice(0, 3).map((c: any) => c.comment).join('; ') || 'None'}
- Incomplete Tasks: ${contextData.deal_checklist_items?.filter((t: any) => !t.is_completed).map((t: any) => t.title).join(', ') || 'None'}

Generate follow-up suggestions to move this deal forward.`
      : `Contact Context:
- Name: ${contextData.contact_name}
- Company: ${contextData.contact_company}
- Title: ${contextData.current_position_title}
- Status: ${contextData.status}
- Campaign: ${contextData.campaign?.name}
- Campaign Type: ${contextData.campaign?.campaign_type}
- Last Activity: ${contextData.lastActivity ? new Date(contextData.lastActivity).toLocaleDateString() : 'No recent activity'}
- Recent Comments: ${contextData.campaign_contact_comments?.slice(0, 3).map((c: any) => c.comment).join('; ') || 'None'}

Generate follow-up suggestions to engage this contact effectively.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_followup_suggestions',
            description: 'Create intelligent follow-up suggestions',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      days_from_now: { type: 'number', description: 'Days from today to schedule follow-up' },
                      type: { type: 'string', enum: ['email', 'call', 'linkedin', 'meeting', 'other'] },
                      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                      reasoning: { type: 'string', description: 'Why this follow-up is recommended' },
                      message_draft: { type: 'string', description: 'Personalized message for this follow-up' },
                      topic: { type: 'string', description: 'Brief topic/subject of the follow-up' }
                    },
                    required: ['days_from_now', 'type', 'priority', 'reasoning', 'message_draft', 'topic']
                  }
                }
              },
              required: ['suggestions']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_followup_suggestions' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const suggestionsData = JSON.parse(toolCall.function.arguments);

    // Insert suggestions into database
    const suggestions = suggestionsData.suggestions.map((s: any) => {
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + s.days_from_now);

      return {
        user_id: user.id,
        ...(dealId ? { deal_id: dealId } : { campaign_contact_id: contactId }),
        suggested_date: suggestedDate.toISOString().split('T')[0],
        suggested_type: s.type,
        suggested_priority: s.priority,
        reasoning: s.reasoning,
        ai_message_draft: s.message_draft,
        metadata: { topic: s.topic }
      };
    });

    const { data: insertedSuggestions, error: insertError } = await supabase
      .from('followup_suggestions')
      .insert(suggestions)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions: insertedSuggestions,
        count: insertedSuggestions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-followup] Error generating follow-up suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[generate-followup] Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Check Supabase function logs for more information',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
