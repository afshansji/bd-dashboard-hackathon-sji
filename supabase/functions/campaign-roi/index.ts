import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId, avgDealValue, costPerContact } = await req.json();

    console.log(`[campaign-roi] Calculating ROI for campaign: ${campaignId}`);

    // Update assumptions if provided
    if (avgDealValue || costPerContact) {
      const updates: any = {};
      if (avgDealValue) updates.average_deal_value = avgDealValue;
      if (costPerContact) updates.cost_per_contact = costPerContact;

      await supabase
        .from('campaign_financial_data')
        .update(updates)
        .eq('campaign_id', campaignId);
    }

    // Trigger financial recalculation
    const { error: calcError } = await supabase.rpc('update_campaign_financials', {
      p_campaign_id: campaignId,
    });

    if (calcError) {
      throw calcError;
    }

    // Fetch updated financial data
    const { data: financials, error: financialsError } = await supabase
      .from('campaign_financial_data')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (financialsError) {
      throw financialsError;
    }

    // Fetch campaign data for projections
    const { data: campaign, error: campaignError } = await supabase
      .from('bd_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      throw campaignError;
    }

    // Calculate breakdown
    const breakdown = {
      totalCost: Number(financials.actual_spend),
      totalRevenue: Number(financials.deals_revenue),
      netProfit: Number(financials.deals_revenue) - Number(financials.actual_spend),
      roi: Number(financials.roi_percentage),
    };

    // Calculate projections based on current conversion rates
    const contactsRemaining = campaign.target_contacts_count - (campaign.actual_contacts_reached || 0);
    const conversionRate = campaign.actual_contacts_reached > 0 
      ? (campaign.deals_generated || 0) / campaign.actual_contacts_reached 
      : 0.05; // Default 5% if no data

    const projections = {
      projectedDeals: Math.round(contactsRemaining * conversionRate),
      projectedRevenue: contactsRemaining * conversionRate * Number(financials.average_deal_value),
      projectedROI: breakdown.totalCost > 0
        ? ((breakdown.totalRevenue + (contactsRemaining * conversionRate * Number(financials.average_deal_value)) - breakdown.totalCost) / breakdown.totalCost) * 100
        : 0,
    };

    console.log(`[campaign-roi] ROI calculated: ${breakdown.roi.toFixed(2)}%`);

    return new Response(
      JSON.stringify({
        campaignId,
        financials,
        breakdown,
        projections,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[campaign-roi] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
