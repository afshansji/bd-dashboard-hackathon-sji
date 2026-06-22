/**
 * HubSpot Sync Edge Function
 * 
 * Active Pipeline Stages (Synced):
 * - Lead (appointmentscheduled, qualifiedtobuy, presentationscheduled) → prospecting
 * - Estimation (decisionmakerboughtin) → qualification
 * - Discovery (contractsent) → proposal
 * - Proposal Shared (proposalshared) → negotiation
 * 
 * Excluded Stages (Not Synced):
 * - Proposal Accepted (closedwon) → excluded
 * - Proposal Lost (closedlost) → excluded
 * 
 * This filtering reduces sync volume by ~98% (from 6,047 to ~103 deals)
 * and prevents CPU timeout errors during large data synchronization.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptSecret, encryptSecret } from "../_shared/crypto.ts";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

type HubSpotIntegration = {
  id: string;
  is_active: boolean;
  last_sync: string | null;
  config: Record<string, any> | null;
};

type HubSpotObject = {
  id: string;
  properties?: Record<string, any>;
  associations?: Record<string, { results?: Array<{ id: string }> }>;
};

type SyncResult = {
  companies: number;
  contacts: number;
  deals: number;
  pipelineValue: number;
  lastSync: string;
};

type TriggerSource = "manual" | "webhook";

const HUBSPOT_COMPANY_PROPERTIES = [
  "name",
  "domain",
  "website",
  "phone",
  "city",
  "state",
  "country",
  "industry",
  "address",
  "zip",
  "annualrevenue",
  "numberofemployees",
  "description",
  "type",
];

const HUBSPOT_CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "jobtitle",
  "lifecyclestage",
  "hs_lead_status",
];

const HUBSPOT_DEAL_PROPERTIES = [
  "dealname",
  "amount",
  "dealstage",
  "closedate",
  "hs_pipeline_stage_probability",
  "dealtype",
  "hs_lastmodifieddate",
  "createdate",
  "pipeline",
];

// HubSpot active pipeline stages to sync (excludes closed stages)
// Only syncing active deals: Lead, Estimation, Discovery, Proposal Shared
// Excludes: closedwon (Proposal Accepted), closedlost (Proposal Lost)
const HUBSPOT_STAGES = [
  'appointmentscheduled',        // → prospecting (Lead)
  'qualifiedtobuy',              // → prospecting (Lead)
  'presentationscheduled',       // → prospecting (Lead)
  'decisionmakerboughtin',       // → qualification (Estimation)
  'contractsent',                // → proposal (Discovery)
  'proposalshared',              // → negotiation (Proposal Shared)
  // EXCLUDED: 'closedwon', 'closedlost' to reduce sync volume and prevent timeouts
];

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function createSupabaseClient(req?: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: req
      ? { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
      : undefined,
  });
}

async function getHubSpotIntegration(client: SupabaseClient): Promise<{ integration: HubSpotIntegration; token: string }>
{
  const { data, error } = await client
    .from("integrations")
    .select("id, is_active, last_sync, config")
    .eq("type", "hubspot")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Active HubSpot integration not found");
  }

  // Get API token from Supabase secrets (secure)
  const token = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
  
  if (!token) {
    throw new Error("HubSpot API key not found in environment secrets. Please configure HUBSPOT_PRIVATE_APP_TOKEN.");
  }

  return { integration: data, token };
}

async function fetchPagedObjects(token: string, resource: string, properties: string[], associations: string[] = []): Promise<HubSpotObject[]> {
  const results: HubSpotObject[] = [];
  let after: string | undefined;

  do {
    const url = new URL(`https://api.hubapi.com/crm/v3/objects/${resource}`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("properties", properties.join(","));
    if (associations.length > 0) {
      url.searchParams.set("associations", associations.join(","));
    }
    if (after) {
      url.searchParams.set("after", after);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot ${resource} fetch failed (${response.status}): ${errorText}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload.results)) {
      results.push(...payload.results);
    }
    after = payload.paging?.next?.after;
  } while (after);

  return results;
}

// Fetch deals filtered by specific stage using /search endpoint
async function fetchDealsByStage(
  token: string, 
  stage: string,
  maxRetries: number = 3
): Promise<HubSpotObject[]> {
  const results: HubSpotObject[] = [];
  let after: string | undefined;

  do {
    let attempt = 0;
    let success = false;
    
    while (attempt < maxRetries && !success) {
      try {
        const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'dealstage',
                operator: 'EQ',
                value: stage
              }]
            }],
            properties: HUBSPOT_DEAL_PROPERTIES,
            associations: ['companies'],
            limit: 100,
            after: after
          })
        });
        
        if (response.status === 429) {
          // Rate limit hit - wait with exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`[HubSpot Sync] Rate limit hit for stage '${stage}', waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await delay(waitTime);
          attempt++;
          continue;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HubSpot deals search for stage '${stage}' failed (${response.status}): ${errorText}`);
        }
        
        const payload = await response.json();
        if (Array.isArray(payload.results)) {
          results.push(...payload.results);
          console.log(`[HubSpot Sync] Fetched ${payload.results.length} deals for stage '${stage}' (total: ${results.length})`);
        }
        after = payload.paging?.next?.after;
        success = true;
        
      } catch (error) {
        if (attempt >= maxRetries - 1) {
          throw error;
        }
        attempt++;
      }
    }
  } while (after);

  return results;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return numeric;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return null;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const date = new Date(numeric);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }
  return null;
}

function parseTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const date = new Date(numeric);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return null;
}

// Batch processing function for companies
async function fetchAndProcessCompaniesBatch(
  token: string,
  supabase: SupabaseClient,
  syncId: string | undefined,
  now: string
): Promise<{ totalCompanies: number; clientMap: Map<string, string> }> {
  const BATCH_SIZE = 100;
  let totalCompanies = 0;
  let after: string | undefined;
  const clientMap = new Map<string, string>();

  // Load existing clients into map
  const { data: existingClients } = await supabase
    .from("clients")
    .select("id, hubspot_id")
    .not("hubspot_id", "is", null);

  existingClients?.forEach((row: any) => {
    if (row.hubspot_id) {
      clientMap.set(row.hubspot_id, row.id);
    }
  });

  console.log(`[HubSpot Sync] Starting batch processing for companies (batch size: ${BATCH_SIZE})`);

  // Update status to show we're in companies phase
  if (syncId) {
    await supabase
      .from('hubspot_sync_status')
      .update({ 
        metadata: { current_phase: 'companies' },
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);
  }

  do {
    try {
      const url = new URL(`https://api.hubapi.com/crm/v3/objects/companies`);
      url.searchParams.set("limit", String(BATCH_SIZE));
      url.searchParams.set("properties", HUBSPOT_COMPANY_PROPERTIES.join(","));
      if (after) {
        url.searchParams.set("after", after);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot companies fetch failed (${response.status}): ${errorText}`);
      }

      const payload = await response.json();
      const batchCompanies = payload.results || [];

      if (batchCompanies.length > 0) {
        // Process this batch
        const clientRows = batchCompanies.map((company: HubSpotObject) => {
          const props = company.properties ?? {};
          return {
            hubspot_id: company.id,
            name: props.name || "Unknown Company",
            company: props.name || null,
            website: props.website || props.domain || null,
            phone: props.phone || null,
            email: props.email || null,
            address: props.address || null,
            city: props.city || null,
            state: props.state || null,
            country: props.country || null,
            postal_code: props.zip || null,
            industry: props.industry || null,
            revenue: parseNumber(props.annualrevenue),
            employee_count: parseNumber(props.numberofemployees),
            notes: props.description || null,
            status: "active"
          } as Record<string, unknown>;
        });

        // Upsert this batch
        const { data: upsertedClients, error: clientError } = await supabase
          .from("clients")
          .upsert(clientRows, { onConflict: "hubspot_id" })
          .select("id, hubspot_id");

        if (clientError) {
          throw clientError;
        }

        // Update client map
        upsertedClients?.forEach((row: any) => {
          if (row.hubspot_id) {
            clientMap.set(row.hubspot_id, row.id);
          }
        });

        totalCompanies += batchCompanies.length;
        console.log(`[HubSpot Sync] Processed ${batchCompanies.length} companies (total: ${totalCompanies})`);

        // Update sync status with heartbeat
        if (syncId) {
          await supabase
            .from('hubspot_sync_status')
            .update({ 
              companies_synced: totalCompanies,
              updated_at: new Date().toISOString(),
              metadata: { current_phase: 'companies', last_heartbeat: new Date().toISOString() }
            })
            .eq('id', syncId);
        }
      }

      after = payload.paging?.next?.after;

      // Add delay to respect rate limits
      if (after) {
        await delay(500);
      }
    } catch (error) {
      console.error('[HubSpot Sync] Error in companies batch:', error);
      
      // Update sync status with error
      if (syncId) {
        await supabase
          .from('hubspot_sync_status')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `Companies phase failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
          .eq('id', syncId);
      }
      throw error;
    }
  } while (after);

  console.log(`[HubSpot Sync] ✅ Companies batch processing complete: ${totalCompanies} total`);
  return { totalCompanies, clientMap };
}

// Batch processing function for contacts
async function fetchAndProcessContactsBatch(
  token: string,
  supabase: SupabaseClient,
  clientMap: Map<string, string>,
  syncId: string | undefined,
  now: string
): Promise<{ totalContacts: number; skippedContacts: number }> {
  const BATCH_SIZE = 100;
  let totalContacts = 0;
  let skippedContacts = 0;
  let after: string | undefined;

  console.log(`[HubSpot Sync] Starting batch processing for contacts (batch size: ${BATCH_SIZE})`);

  // Update status to show we're in contacts phase
  if (syncId) {
    await supabase
      .from('hubspot_sync_status')
      .update({ 
        metadata: { current_phase: 'contacts', last_heartbeat: new Date().toISOString() },
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);
  }

  do {
    try {
      const url = new URL(`https://api.hubapi.com/crm/v3/objects/contacts`);
      url.searchParams.set("limit", String(BATCH_SIZE));
      url.searchParams.set("properties", HUBSPOT_CONTACT_PROPERTIES.join(","));
      url.searchParams.set("associations", "companies");
      if (after) {
        url.searchParams.set("after", after);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot contacts fetch failed (${response.status}): ${errorText}`);
      }

      const payload = await response.json();
      const batchContacts = payload.results || [];

      if (batchContacts.length > 0) {
        // Process this batch - filter out contacts with no valid client_id
        const contactRows = batchContacts
          .map((contact: HubSpotObject) => {
            const props = contact.properties ?? {};
            const associatedCompany = contact.associations?.companies?.results?.[0]?.id;
            const clientId = associatedCompany ? clientMap.get(associatedCompany) ?? null : null;
            
            // Skip contacts without a valid client_id (NOT NULL constraint)
            if (!clientId) {
              skippedContacts++;
              return null;
            }
            
            return {
              hubspot_id: contact.id,
              client_id: clientId,
              first_name: props.firstname || null,
              last_name: props.lastname || null,
              email: props.email || null,
              phone: props.phone || null,
              position: props.jobtitle || null,
              company: props.company || null
            } as Record<string, unknown>;
          })
          .filter((contact: any): contact is Record<string, unknown> => contact !== null);

        // Only upsert if we have valid contacts
        if (contactRows.length > 0) {
          const { error: contactsError } = await supabase
            .from("contacts")
            .upsert(contactRows, { onConflict: "hubspot_id" });

          if (contactsError) {
            throw contactsError;
          }

          totalContacts += contactRows.length;
        }

        console.log(`[HubSpot Sync] Processed ${batchContacts.length} contacts (${contactRows.length} valid, ${skippedContacts} skipped, total: ${totalContacts})`);

        // Update sync status with heartbeat and progress
        if (syncId) {
          await supabase
            .from('hubspot_sync_status')
            .update({ 
              contacts_synced: totalContacts,
              updated_at: new Date().toISOString(),
              metadata: { 
                current_phase: 'contacts', 
                last_heartbeat: new Date().toISOString(),
                skipped_contacts: skippedContacts
              }
            })
            .eq('id', syncId);
        }
      }

      after = payload.paging?.next?.after;

      // Add delay to respect rate limits
      if (after) {
        await delay(500);
      }
    } catch (error) {
      console.error('[HubSpot Sync] Error in contacts batch:', error);
      
      // Update sync status with error
      if (syncId) {
        await supabase
          .from('hubspot_sync_status')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `Contacts phase failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { skipped_contacts: skippedContacts }
          })
          .eq('id', syncId);
      }
      throw error;
    }
  } while (after);

  console.log(`[HubSpot Sync] ✅ Contacts batch processing complete: ${totalContacts} valid contacts, ${skippedContacts} skipped`);
  return { totalContacts, skippedContacts };
}

async function performHubSpotSync(options: {
  supabase?: SupabaseClient;
  integration?: HubSpotIntegration;
  token?: string;
  triggeredBy?: TriggerSource;
  syncType?: 'full' | 'deals-only';
  syncId?: string;
} = {}): Promise<SyncResult> {
  const supabase = options.supabase ?? await createSupabaseClient();
  let integration = options.integration;
  let token = options.token;

  if (!integration || !token) {
    const resolved = await getHubSpotIntegration(supabase);
    integration = resolved.integration;
    token = resolved.token;
  }

  const now = new Date().toISOString();
  const syncType = options.syncType ?? 'full';
  const syncId = options.syncId;

  console.log(`[HubSpot Sync] Starting ${syncType} sync (ID: ${syncId || 'N/A'})...`);
  console.log(`[HubSpot Sync] Filtering to active pipeline stages only`);
  console.log(`[HubSpot Sync] Including: Lead, Estimation, Discovery, Proposal Shared`);
  console.log(`[HubSpot Sync] Excluding: Proposal Accepted (closedwon), Proposal Lost (closedlost)`);

  let totalCompanies = 0;
  let totalContacts = 0;
  let clientMap = new Map<string, string>();

  let skippedContacts = 0;

  // Conditionally fetch and process based on sync type with batch processing
  if (syncType === 'full') {
    console.log(`[HubSpot Sync] Starting batch processing for companies and contacts...`);
    
    // Process companies in batches
    const companyResult = await fetchAndProcessCompaniesBatch(token, supabase, syncId, now);
    totalCompanies = companyResult.totalCompanies;
    clientMap = companyResult.clientMap;
    
    // Process contacts in batches
    const contactResult = await fetchAndProcessContactsBatch(token, supabase, clientMap, syncId, now);
    totalContacts = contactResult.totalContacts;
    skippedContacts = contactResult.skippedContacts;
  } else {
    console.log(`[HubSpot Sync] Skipping companies and contacts (${syncType} mode)`);
    
    // Still need to load existing client map for deal processing
    const { data: existingClients } = await supabase
      .from("clients")
      .select("id, hubspot_id")
      .not("hubspot_id", "is", null);

    existingClients?.forEach((row: any) => {
      if (row.hubspot_id) {
        clientMap.set(row.hubspot_id, row.id);
      }
    });
  }

  console.log(`[HubSpot Sync] Fetching deals from ${HUBSPOT_STAGES.length} HubSpot stages sequentially...`);

  // Update status to show we're in deals phase
  if (syncId) {
    await supabase
      .from('hubspot_sync_status')
      .update({ 
        metadata: { 
          current_phase: 'deals', 
          last_heartbeat: new Date().toISOString(),
          skipped_contacts: skippedContacts
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);
  }

  const deals: HubSpotObject[] = [];
  for (let i = 0; i < HUBSPOT_STAGES.length; i++) {
    const stage = HUBSPOT_STAGES[i];
    console.log(`[HubSpot Sync] Fetching stage ${i + 1}/${HUBSPOT_STAGES.length}: '${stage}'`);
    
    try {
      const stageDeals = await fetchDealsByStage(token, stage);
      deals.push(...stageDeals);
      console.log(`[HubSpot Sync] Stage '${stage}' complete: ${stageDeals.length} deals fetched (total: ${deals.length})`);
      
      // Update progress after each stage
      if (syncId) {
        await supabase
          .from('hubspot_sync_status')
          .update({ 
            deals_synced: deals.length,
            updated_at: new Date().toISOString(),
            metadata: { 
              current_phase: 'deals',
              current_stage: stage,
              last_heartbeat: new Date().toISOString(),
              skipped_contacts: skippedContacts
            }
          })
          .eq('id', syncId);
      }
      
      // Add delay between stages to respect rate limits (except after last stage)
      if (i < HUBSPOT_STAGES.length - 1) {
        await delay(750); // 750ms delay between stages
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[HubSpot Sync] Failed to fetch stage '${stage}':`, errorMessage);
      
      // Update sync status with error but continue
      if (syncId) {
        await supabase
          .from('hubspot_sync_status')
          .update({
            metadata: { 
              current_phase: 'deals',
              current_stage: stage,
              last_error: errorMessage,
              last_heartbeat: new Date().toISOString(),
              skipped_contacts: skippedContacts
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', syncId);
      }
      // Continue with other stages even if one fails
    }
  }
  
  console.log(`[HubSpot Sync] Found ${deals.length} total deals across all stages`);
  console.log('[HubSpot Sync] Deal stage distribution:', deals.reduce((acc, deal) => {
    const stage = deal.properties?.dealstage || 'unknown';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));

  // Helper function to map HubSpot stages to local stages
  // Returns null for closed stages to filter them out
  const mapHubSpotStage = (hubspotStage: string | null): string | null => {
    if (!hubspotStage) return 'prospecting';
    
    const stage = hubspotStage.toLowerCase();
    
    // Filter out closed stages immediately - these are excluded from sync
    if (stage === 'closedwon' || stage === 'closedlost') {
      return null; // Signal to skip this deal
    }
    
    // Exact matches first for precise mapping
    if (stage === 'appointmentscheduled' || stage === 'qualifiedtobuy' || 
        stage === 'presentationscheduled') {
      return 'prospecting';
    }
    
    if (stage === 'decisionmakerboughtin') {
      return 'qualification';
    }
    
    if (stage === 'contractsent') {
      return 'proposal';
    }
    
    if (stage === 'proposalshared') {
      return 'negotiation';
    }
    
    // Fallback to substring matching for any other HubSpot stages
    if (stage.includes('appointment') || stage.includes('qualified') || 
        stage.includes('presentation') || stage.includes('lead')) {
      return 'prospecting';
    }
    
    if (stage.includes('decision') || stage.includes('qualification') || 
        stage.includes('estimate')) {
      return 'qualification';
    }
    
    if (stage.includes('contract') || stage.includes('proposal') || 
        stage.includes('discovery')) {
      return 'proposal';
    }
    
    if (stage.includes('negotiation')) {
      return 'negotiation';
    }
    
    // Filter out any stage containing 'won' or 'lost'
    if (stage.includes('won') || stage.includes('lost')) {
      return null; // Skip closed deals
    }
    
    // Default fallback for unknown stages
    return 'prospecting';
  };

  const dealRows = deals.map((deal) => {
    const props = deal.properties ?? {};
    const associatedCompany = deal.associations?.companies?.results?.[0]?.id;
    const amount = parseNumber(props.amount);
    const probabilityRaw = parseNumber(props.hs_pipeline_stage_probability);
    const probability = probabilityRaw && probabilityRaw <= 1 ? probabilityRaw * 100 : probabilityRaw;
    const clientId = associatedCompany ? clientMap.get(associatedCompany) ?? null : null;

    // Map the stage - returns null for closed stages
    const mappedStage = mapHubSpotStage(props.dealstage);
    
    // Skip closed deals (closedwon, closedlost)
    if (!mappedStage) {
      console.log(`[HubSpot Sync] Skipping closed deal: ${props.dealname || deal.id} (stage: ${props.dealstage})`);
      return null;
    }

    // Skip deals without associated company
    if (!clientId) {
      return null;
    }

    return {
      hubspot_deal_id: deal.id,
      client_id: clientId,
      title: props.dealname || `Deal ${deal.id}`,
      amount,
      stage: mappedStage,
      probability,
      close_date: parseDate(props.closedate),
      pipeline: props.pipeline || null,
      dealtype: props.dealtype || null,
      hubspot_crm_deal_url: `https://app.hubspot.com/contacts/deal/${deal.id}`,
      last_activity_date: parseDate(props.hs_lastmodifieddate) || new Date().toISOString().split('T')[0],
      updated_at: parseTimestamp(props.hs_lastmodifieddate) || new Date().toISOString(),
    } as Record<string, unknown>;
  }).filter((deal): deal is Record<string, unknown> => Boolean(deal));

  if (dealRows.length > 0) {
    console.log(`[HubSpot Sync] Upserting ${dealRows.length} deals to database...`);
    
    const { error: dealsError } = await supabase
      .from("deals")
      .upsert(dealRows, { onConflict: "hubspot_deal_id" });

    if (dealsError) {
      console.error('[HubSpot Sync] Error upserting deals:', dealsError);
      throw dealsError;
    }
    
    console.log(`[HubSpot Sync] Successfully synced ${dealRows.length} deals`);
  }

  const pipelineValue = dealRows.reduce((sum, deal) => {
    const amount = typeof deal.amount === "number" ? deal.amount : Number(deal.amount ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  await supabase
    .from("integrations")
    .update({ last_sync: now })
    .eq("id", integration!.id);

  // Log sync to control_tower_sync_log
  await supabase
    .from("control_tower_sync_log")
    .insert({
      sync_type: "pull",
      entity_type: "hubspot_sync",
      status: "success",
      synced_at: now,
      payload: {
        companies: totalCompanies,
        contacts: totalContacts,
        deals: dealRows.length,
        pipelineValue: pipelineValue,
        triggeredBy: options.triggeredBy ?? "manual",
      },
      created_at: now,
    });

  // Log summary
  console.log(`[HubSpot Sync] ✅ Sync completed successfully`);
  console.log(`[HubSpot Sync] Companies: ${totalCompanies}, Contacts: ${totalContacts}, Deals: ${dealRows.length}`);
  console.log(`[HubSpot Sync] Pipeline Value: $${pipelineValue.toLocaleString()}`);

  return {
    companies: totalCompanies,
    contacts: totalContacts,
    deals: dealRows.length,
    pipelineValue,
    lastSync: now,
  };
}

async function handleStatus(): Promise<Response> {
  try {
    const supabase = await createSupabaseClient();
    const { integration } = await getHubSpotIntegration(supabase);
    return new Response(JSON.stringify({
      ok: true,
      isActive: integration.is_active,
      lastSync: integration.last_sync,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({
      ok: false,
      isActive: false,
      lastSync: null,
      error: message,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  }
}

async function handleSync(req?: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  
  try {
    // Parse request body for syncType
    let syncType: 'full' | 'deals-only' = 'full';
    if (req && req.method === 'POST') {
      try {
        const body = await req.json();
        syncType = body?.syncType === 'deals-only' ? 'deals-only' : 'full';
      } catch {
        // No body or invalid JSON, use default
      }
    }

    const supabase = await createSupabaseClient();

    // Create sync status record
    const { data: syncRecord, error: syncError } = await supabase
      .from('hubspot_sync_status')
      .insert({
        sync_type: syncType,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        triggered_by: 'manual'
      })
      .select()
      .single();

    if (syncError) {
      throw new Error(`Failed to create sync record: ${syncError.message}`);
    }

    const syncId = syncRecord.id;

    // Return immediately with sync ID
    const immediateResponse = new Response(
      JSON.stringify({ 
        ok: true, 
        syncId,
        syncType,
        message: `HubSpot ${syncType} sync started in background`
      }),
      { headers, status: 200 }
    );

    // Start background sync using EdgeRuntime.waitUntil
    EdgeRuntime.waitUntil((async () => {
      try {
        console.log(`[HubSpot Sync] Starting background ${syncType} sync (ID: ${syncId})`);
        
        // Perform actual sync
        const result = await performHubSpotSync({ 
          triggeredBy: "manual",
          syncType,
          syncId,
          supabase
        });

        // Update status record on success
        const { data: currentStatus } = await supabase
          .from('hubspot_sync_status')
          .select('metadata')
          .eq('id', syncId)
          .single();

        await supabase
          .from('hubspot_sync_status')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            total_items_synced: result.companies + result.contacts + result.deals,
            companies_synced: result.companies,
            contacts_synced: result.contacts,
            deals_synced: result.deals,
            metadata: {
              ...currentStatus?.metadata,
              pipelineValue: result.pipelineValue,
              lastSync: result.lastSync,
              current_phase: 'completed'
            }
          })
          .eq('id', syncId);

        console.log(`[HubSpot Sync] Background sync completed (ID: ${syncId})`);
      } catch (error) {
        console.error('[HubSpot Sync] Background sync failed:', error);

        // Update status record on failure
        await supabase
          .from('hubspot_sync_status')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', syncId);
      }
    })());

    return immediateResponse;

  } catch (error) {
    console.error("[HubSpot Sync]", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      headers,
      status: 500,
    });
  }
}

async function handleWebhook(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  const secret = Deno.env.get("HUBSPOT_WEBHOOK_SECRET");
  if (secret) {
    const provided = req.headers.get("x-webhook-secret") || req.headers.get("x-hubspot-secret");
    if (provided !== secret) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { headers, status: 401 });
    }
  }

  try {
    const supabase = await createSupabaseClient();
    const { integration, token } = await getHubSpotIntegration(supabase);
    const result = await performHubSpotSync({
      supabase,
      integration,
      token,
      triggeredBy: "webhook",
    });

    return new Response(JSON.stringify({ ok: true, ...result }), { headers });
  } catch (error) {
    console.error("[HubSpot Webhook]", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      headers,
      status: 500,
    });
  }
}

async function handleConfigure(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  
  try {
    const body = await req.json();
    const apiKey = body?.apiKey;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      return new Response(JSON.stringify({ ok: false, error: "API key is required" }), {
        headers,
        status: 400,
      });
    }

    // Validate API key format (HubSpot private app tokens start with "pat-")
    if (!apiKey.startsWith("pat-")) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Invalid API key format. HubSpot Private App Access Tokens should start with 'pat-'" 
      }), {
        headers,
        status: 400,
      });
    }

    // Test the API key by making a simple API call
    const testResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `Invalid API key: ${testResponse.status} - ${errorText}` 
      }), {
        headers,
        status: 400,
      });
    }

    // Encrypt the API key
    const encryptedKey = await encryptSecret(apiKey);

    // Save to database
    const supabase = await createSupabaseClient();
    const { data: existingIntegration } = await supabase
      .from("integrations")
      .select("id")
      .eq("type", "hubspot")
      .maybeSingle();

    if (existingIntegration) {
      // Update existing
      const { error: updateError } = await supabase
        .from("integrations")
        .update({
          name: "HubSpot",
          type: "hubspot",
          config: { api_key_encrypted: encryptedKey },
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingIntegration.id);

      if (updateError) throw updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from("integrations")
        .insert({
          name: "HubSpot",
          type: "hubspot",
          config: { api_key_encrypted: encryptedKey },
          is_active: true,
        });

      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ ok: true, message: "HubSpot API key configured successfully" }), {
      headers,
    });
  } catch (error) {
    console.error("[HubSpot Configure]", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Configuration failed" 
    }), {
      headers,
      status: 500,
    });
  }
}

async function handleLegacyAction(req: Request): Promise<Response> {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  const body = await req.json();
  const action = body?.action;

  if (!action) {
    return new Response(JSON.stringify({ error: "Invalid action" }), { headers, status: 400 });
  }

  try {
    const supabase = await createSupabaseClient();
    const { token } = await getHubSpotIntegration(supabase);

    if (action === "search_companies") {
      const response = await fetch("https://api.hubapi.com/crm/v3/objects/companies/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: "name",
              operator: "CONTAINS_TOKEN",
              value: body.searchTerm,
            }],
          }],
          properties: HUBSPOT_COMPANY_PROPERTIES,
          limit: 20,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data.results || []), { headers });
    }

    if (action === "fetch_company_by_id") {
      let actualCompanyId = body.companyId;

      try {
        const contactResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${body.companyId}?properties=associatedcompanyid`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          if (contactData.properties?.associatedcompanyid) {
            actualCompanyId = contactData.properties.associatedcompanyid;
          }
        }
      } catch (_err) {
        // ignore and treat as company id
      }

      const companyResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/companies/${actualCompanyId}?properties=${HUBSPOT_COMPANY_PROPERTIES.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!companyResponse.ok) {
        throw new Error(`Company not found: ${companyResponse.statusText}`);
      }

      const companyData = await companyResponse.json();

      const contactsResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/companies/${actualCompanyId}/associations/contacts`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      let contacts: any[] = [];
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        const contactIds = contactsData.results?.map((r: any) => r.id) || [];

        if (contactIds.length > 0) {
          const contactDetailsResponse = await fetch(
            "https://api.hubapi.com/crm/v3/objects/contacts/batch/read",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                properties: HUBSPOT_CONTACT_PROPERTIES,
                inputs: contactIds.map((id: string) => ({ id })),
              }),
            },
          );

          if (contactDetailsResponse.ok) {
            const contactDetailsData = await contactDetailsResponse.json();
            contacts = contactDetailsData.results || [];
          }
        }
      }

      return new Response(JSON.stringify({ company: companyData, contacts }), { headers });
    }

    if (action === "import_company") {
      const { company, contacts } = body;
      const props = company.properties ?? {};
      const now = new Date().toISOString();

      const clientData = {
        name: props.name || "Unknown Company",
        company: props.name || "Unknown Company",
        email: props.email || null,
        phone: props.phone || null,
        website: props.website || props.domain || null,
        address: props.address || null,
        city: props.city || null,
        state: props.state || null,
        country: props.country || null,
        industry: props.industry || null,
        revenue: parseNumber(props.annualrevenue),
        employee_count: parseNumber(props.numberofemployees),
        notes: props.description || null,
        status: "active",
        source: "hubspot",
        hubspot_id: company.id,
        hubspot_sync_status: "synced",
        hubspot_last_sync: now,
        hubspot_sync_metadata: { type: props.type || null },
      } as Record<string, unknown>;

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .upsert(clientData, { onConflict: "hubspot_id" })
        .select()
        .single();

      if (clientError) throw clientError;

      if (Array.isArray(contacts) && contacts.length > 0) {
        const contactsData = contacts.map((contact: any) => ({
          client_id: client.id,
          hubspot_id: contact.id,
          first_name: contact.properties?.firstname || null,
          last_name: contact.properties?.lastname || null,
          email: contact.properties?.email || null,
          phone: contact.properties?.phone || null,
          job_title: contact.properties?.jobtitle || null,
          lifecycle_stage: contact.properties?.lifecyclestage || null,
          lead_status: contact.properties?.hs_lead_status || null,
          hubspot_sync_status: "synced",
          hubspot_last_sync: now,
        }));

        const { error: contactsError } = await supabase
          .from("contacts")
          .upsert(contactsData, { onConflict: "hubspot_id" });

        if (contactsError) throw contactsError;
      }

      return new Response(JSON.stringify({ success: true, client }), { headers });
    }

    if (action === "sync_client") {
      const { data: clientRecord, error: clientFetchError } = await supabase
        .from("clients")
        .select("hubspot_id")
        .eq("id", body.clientId)
        .single();

      if (clientFetchError) throw clientFetchError;
      if (!clientRecord?.hubspot_id) {
        throw new Error("Client not linked to HubSpot");
      }

      const companyResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/companies/${clientRecord.hubspot_id}?properties=${HUBSPOT_COMPANY_PROPERTIES.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!companyResponse.ok) {
        throw new Error("Failed to sync from HubSpot");
      }

      const companyData = await companyResponse.json();
      const props = companyData.properties ?? {};
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("clients")
        .update({
          name: props.name || "Unknown",
          company: props.name || "Unknown",
          phone: props.phone || null,
          website: props.website || props.domain || null,
          address: props.address || null,
          city: props.city || null,
          state: props.state || null,
          country: props.country || null,
          industry: props.industry || null,
          revenue: parseNumber(props.annualrevenue),
          employee_count: parseNumber(props.numberofemployees),
          notes: props.description || null,
          hubspot_sync_status: "synced",
          hubspot_last_sync: now,
        })
        .eq("id", body.clientId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    if (action === "link_client") {
      const now = new Date().toISOString();
      const { error: linkError } = await supabase
        .from("clients")
        .update({
          hubspot_id: body.hubspotId,
          hubspot_sync_status: "synced",
          hubspot_last_sync: now,
          source: "manual",
        })
        .eq("id", body.clientId);

      if (linkError) throw linkError;

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), { headers, status: 400 });
  } catch (error) {
    console.error("[HubSpot Legacy]", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { headers, status: 400 });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/hubspot-sync/, "") || "/";

  if (req.method === "GET" && pathname === "/status") {
    return handleStatus();
  }

  if (req.method === "POST" && pathname === "/sync") {
    return handleSync(req);
  }
  
  // Handle POST at root path to trigger sync
  if (req.method === "POST" && pathname === "/") {
    return handleSync(req);
  }

  if (req.method === "POST" && pathname === "/webhook") {
    return handleWebhook(req);
  }

  if (req.method === "POST" && pathname === "/configure") {
    return handleConfigure(req);
  }

  if (req.method === "POST") {
    return handleLegacyAction(req);
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
