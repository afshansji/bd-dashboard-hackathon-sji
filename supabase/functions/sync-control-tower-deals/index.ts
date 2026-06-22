import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

interface SyncResult {
  deals: {
    new: number;
    updated: number;
    failed: number;
  };
  clients: {
    new: number;
    updated: number;
  };
  checklists: {
    synced: number;
    failed: number;
  };
  errors: string[];
  duration: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication when a JWT is supplied. Allow service role
    // headers for scheduled jobs where no user context exists.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.warn('[Sync] Unable to resolve user from auth header:', authError.message);
    }

    const userId = user?.id ?? null;
    
    // Parse request body for optional dealId filter and forceFullSync flag
    let body: any = {};
    if (req.method === 'POST') {
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch (e) {
        console.log('[Sync] No body or invalid JSON, using defaults');
        body = {};
      }
    }
    const dealId = body.dealId || null;
    const forceFullSync = body.forceFullSync || false;
    const mode = body.mode || 'full'; // 'incremental' or 'full'

    if (userId) {
      console.log(`[Sync] Starting Control Tower sync for user: ${userId}${dealId ? ` (single deal: ${dealId})` : ''}`);
    } else {
      console.log(`[Sync] Starting Control Tower sync with service credential${dealId ? ` (single deal: ${dealId})` : ''}`);
    }

    // Fetch Control Tower configuration from ai_configurations table (if user authenticated)
    let configData = null;
    if (userId) {
      const { data, error: configError } = await supabase
        .from('ai_configurations')
        .select('configuration_data')
        .eq('user_id', userId)
        .eq('configuration_type', 'control_tower')
        .maybeSingle();
      
      if (!configError) {
        configData = data;
      }
    }

    // Get Control Tower credentials from edge secrets
    const envUrl = Deno.env.get('Controltowerurl');
    const envKey = Deno.env.get('CONTROLTOWERAPIKEY');
    
    if (!envUrl || !envKey) {
      throw new Error('Control Tower credentials not configured in edge secrets');
    }

    console.log('[Sync] Using Control Tower credentials from edge secrets');
    
    // Create Control Tower client with server-side credentials
    const ctClient = createClient(envUrl, envKey);

    return await performSync(ctClient, supabase, userId, supabaseKey, dealId, forceFullSync, mode);

  } catch (error) {
    console.error('[Sync] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        synced: 0,
        updated: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Stage mapping from Control Tower to local pipeline stages
// Based on Control Tower query results showing exact dealstage IDs
const STAGE_MAPPING: Record<string, string> = {
  // Pipeline stages (HubSpot IDs from Control Tower)
  'appointmentscheduled': 'prospecting',    // Lead
  '123153694': 'qualification',              // Estimation
  'qualifiedtobuy': 'proposal',              // Discovery
  'presentationscheduled': 'negotiation',    // Proposal Shared
  
  // Closed stages
  'closedwon': 'closed_won',
  'closedlost': 'closed_lost',
};

// Revenue projection stage IDs (960xxxxx) - these should NOT be mapped to pipeline stages
// They will be excluded from pipeline views entirely
const REVENUE_PROJECTION_STAGE_IDS = new Set([
  '960399524', // Jan 2025
  '960993642', // Feb 2025
  '960993643', // Mar 2025
  '960993644', // Apr 2025
  '960993645', // May 2025
  '960993646', // Jun 2025
  '960993647', // Jul 2025
  '960993648', // Aug 2025
  '960993649', // Sep 2025
  '960993650', // Oct 2025
  '960993651', // Nov 2025 (and Dec potentially)
]);

function mapStage(ctStage: any, stageName?: string): string | null {
  if (!ctStage) return null;

  const stageStr = String(ctStage).toLowerCase().trim();
  
  // Check if this is a revenue projection stage - return null to exclude from pipeline
  if (REVENUE_PROJECTION_STAGE_IDS.has(stageStr)) {
    console.log('[Sync] Revenue projection stage detected, excluding from pipeline:', stageStr);
    return null;
  }
  
  // Log for debugging
  console.log('[Sync] Mapping stage:', { ctStage, stageName });
  
  // Try exact ID match first (this is the most reliable)
  if (STAGE_MAPPING[stageStr]) {
    console.log('[Sync] Mapped by exact ID:', stageStr, '->', STAGE_MAPPING[stageStr]);
    return STAGE_MAPPING[stageStr];
  }
  
  // If we have a stage name, try to match it
  if (stageName) {
    const nameStr = String(stageName).toLowerCase().replace(/\s+/g, '');
    if (STAGE_MAPPING[nameStr]) {
      console.log('[Sync] Mapped by name:', nameStr, '->', STAGE_MAPPING[nameStr]);
      return STAGE_MAPPING[nameStr];
    }
  }
  
  // Unknown stage - return null to exclude
  console.warn('[Sync] Unknown stage, excluding from sync:', stageStr);
  return null;
}

function extractDriveFolderId(ctDeal: any): string | null {
  const candidates = [
    ctDeal.drive_folder_id,
    ctDeal.driveFolderId,
    ctDeal.google_drive_folder_id,
    ctDeal.googleDriveFolderId,
    ctDeal.drive_folder,
    ctDeal.google_drive_folder,
    ctDeal.folder_id,
    ctDeal.deal_folder_id,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    if (typeof candidate === 'object') {
      const nestedId = candidate.id ?? candidate.folder_id ?? candidate.folderId ?? null;
      if (typeof nestedId === 'string' && nestedId.trim()) {
        return nestedId.trim();
      }
    }
  }

  return null;
}

/**
 * Maps Control Tower stage to local deal status
 */
function mapStatus(ctStage: any, closeDate: any, lastActivity: any): string {
  const stageStr = String(ctStage || '').toLowerCase().trim();
  
  // Trust Control Tower closed stages
  if (stageStr === 'closedwon') return 'won';
  if (stageStr === 'closedlost') return 'lost';
  
  // Check if deal is stale (close_date passed + no recent activity)
  if (closeDate) {
    const closeDateObj = new Date(closeDate);
    const now = new Date();
    
    if (closeDateObj < now) {
      // Close date has passed - check for recent activity
      const lastActivityDate = lastActivity ? new Date(lastActivity) : null;
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      if (!lastActivityDate || lastActivityDate < thirtyDaysAgo) {
        console.log('[Sync] Deal marked as stale (past close date + no recent activity):', { closeDate, lastActivity });
        return 'on_hold'; // Stale deal
      }
    }
  }
  
  // Active deal
  return 'active';
}

// Build a client lookup cache from company names
async function buildClientCache(supabase: any): Promise<Map<string, string>> {
  console.log('[Sync] Building client lookup cache...');
  const { data: existingClients, error } = await supabase
    .from('clients')
    .select('id, company, email, control_tower_id, hubspot_id')
    .not('company', 'is', null);
  
  if (error) {
    console.warn('[Sync] Could not load client cache:', error);
    return new Map();
  }
  
  const cache = new Map<string, string>();
  existingClients?.forEach((client: any) => {
    const key = client.company.toLowerCase().trim();
    cache.set(key, client.id);
    
    // Also cache by control_tower_id and hubspot_id for faster lookups
    if (client.control_tower_id) {
      cache.set(`ct:${client.control_tower_id}`, client.id);
    }
    if (client.hubspot_id) {
      cache.set(`hs:${client.hubspot_id}`, client.id);
    }
  });
  
  console.log(`[Sync] Cached ${cache.size} client lookup keys`);
  return cache;
}

// Extract client data from deal fields (no join - extracted directly from deal)
function extractClientData(ctDeal: any): any {
  // Extract client ID from deal fields
  const clientId = ctDeal.client_id || ctDeal.clientId || ctDeal.hubspot_company_id;

  // Extract company name from deal fields - try multiple field variations
  const clientCompany = ctDeal.clientCompanyName ||
                        ctDeal.client_company_name ||
                        ctDeal.company_name ||
                        ctDeal.client_company ||
                        ctDeal.companyName ||
                        ctDeal.dealname?.split(' - ')[0] || // Sometimes company is in deal name
                        null;

  if (!clientCompany && !clientId) {
    console.log('[Sync] No client data found in deal:', ctDeal.id);
    return null;
  }

  // Build contact person from deal fields
  const firstName = ctDeal.clientFirstName || ctDeal.client_first_name || ctDeal.contact_first_name || '';
  const lastName = ctDeal.clientLastName || ctDeal.client_last_name || ctDeal.contact_last_name || '';
  const contactPerson = ctDeal.clientContactName ||
                        ctDeal.client_contact_name ||
                        ctDeal.contact_name ||
                        (firstName || lastName ? `${firstName} ${lastName}`.trim() : null);

  return {
    control_tower_id: clientId || null,
    name: clientCompany || 'Unknown Client',
    company: clientCompany || 'Unknown Client',
    // Extract contact info from deal fields
    email: ctDeal.clientEmail ||
           ctDeal.client_email ||
           ctDeal.contact_email ||
           ctDeal.email ||
           null,
    phone: ctDeal.clientPhone ||
           ctDeal.client_phone ||
           ctDeal.contact_phone ||
           ctDeal.phone ||
           null,
    contact_person: contactPerson,
    website: ctDeal.clientWebsite ||
             ctDeal.client_website ||
             ctDeal.website ||
             ctDeal.domain ||
             null,
    industry: ctDeal.industry || ctDeal.client_industry || null,
    address: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    status: 'active',
  };
}

// Build user mapping cache by email
async function buildUserMappingCache(supabase: any): Promise<Map<string, string>> {
  console.log('[Sync] Building user mapping cache...');
  const { data: localUsers, error } = await supabase
    .from('users')
    .select('id, email');
  
  if (error) {
    console.warn('[Sync] Could not load users:', error);
    return new Map();
  }
  
  const cache = new Map<string, string>();
  localUsers?.forEach((user: any) => {
    if (user.email) {
      cache.set(user.email.toLowerCase().trim(), user.id);
    }
  });
  
  console.log(`[Sync] Cached ${cache.size} user email mappings`);
  return cache;
}

async function performSync(
  ctClient: any,
  supabase: any,
  userId: string | null,
  serviceRoleKey: string,
  singleDealId?: string | null,
  forceFullSync?: boolean,
  mode?: string
): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // First, try to fetch pipeline/stage definitions from Control Tower
    console.log('[Sync] Fetching pipeline stages from Control Tower...');
    const { data: pipelineStages, error: pipelineError } = await ctClient
      .from('DealStage')
      .select('*');
    
    if (!pipelineError && pipelineStages && pipelineStages.length > 0) {
      console.log('[Sync] Found pipeline stages:', pipelineStages);
      // Update stage mapping based on pipeline definitions (skip if revenue projection stage)
      pipelineStages.forEach((stage: any) => {
        const stageId = String(stage.id || stage.stage_id);
        const stageName = String(stage.name || stage.label || '').toLowerCase().replace(/\s+/g, '');
        if (stageName && !STAGE_MAPPING[stageId]) {
          const mapped = mapStage(stageName, stageName);
          if (mapped !== null) {
            STAGE_MAPPING[stageId] = mapped;
          }
        }
      });
      console.log('[Sync] Active stage mapping:', STAGE_MAPPING);
    } else {
      console.log('[Sync] No pipeline stages table found, using default mapping');
    }
    
    console.log('[Sync] Final stage mapping:', STAGE_MAPPING);

    // Fetch last sync timestamp for incremental mode
    let lastSyncTimestamp: string | null = null;
    if (mode === 'incremental' && !singleDealId) {
      const { data: syncState } = await supabase
        .from('control_tower_sync_state')
        .select('last_successful_sync_at')
        .order('last_successful_sync_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      lastSyncTimestamp = syncState?.last_successful_sync_at || null;
      console.log(`[Sync] Incremental mode: syncing deals updated since ${lastSyncTimestamp || 'beginning'}`);
    }

    // Fetch deals from Control Tower (all or single)
    const syncModeLabel = singleDealId 
      ? ` (single: ${singleDealId})` 
      : mode === 'incremental' 
        ? ` (INCREMENTAL since ${lastSyncTimestamp || 'beginning'})`
        : forceFullSync 
          ? ' (FULL SYNC - all statuses)' 
          : ' (active only)';
    console.log(`[Sync] Fetching deals from Control Tower${syncModeLabel}...`);
    
    // Join with clients table to get full contact details
    // Fetch deals from Control Tower - without client join to avoid column mismatch
    // Client data will be extracted from deal fields instead
    let ctDealsQuery = ctClient.from('Deal').select('*');
    
    // Apply filters based on sync mode
    if (singleDealId) {
      // For single deal sync, fetch by control_tower_id
      const { data: localDeal } = await supabase
        .from('deals')
        .select('control_tower_id')
        .eq('id', singleDealId)
        .maybeSingle();
      
      if (localDeal?.control_tower_id) {
        ctDealsQuery = ctDealsQuery.eq('id', localDeal.control_tower_id);
      } else {
        throw new Error('Deal not found or has no Control Tower ID');
      }
    } else if (mode === 'incremental' && lastSyncTimestamp) {
      // Incremental mode: only fetch deals updated since last sync
      ctDealsQuery = ctDealsQuery.gte('updated_at', lastSyncTimestamp);
      console.log(`[Sync] Filtering deals with updated_at >= ${lastSyncTimestamp}`);
    } else if (!forceFullSync) {
      // Default mode: only fetch active deals (exclude closed won/lost)
      ctDealsQuery = ctDealsQuery
        .not('dealstage', 'eq', 'closedwon')
        .not('dealstage', 'eq', 'closedlost');
    }
    // If forceFullSync is true, no filter is applied - fetch ALL deals
    
    const { data: ctDeals, error: fetchError } = await ctDealsQuery;

    if (fetchError) {
      console.error('[Sync] Error fetching deals from Control Tower:', {
        message: fetchError.message,
        code: fetchError.code,
        hint: fetchError.hint,
        details: fetchError.details
      });
      throw new Error(`Failed to fetch deals from Control Tower: ${fetchError.message}. Hint: ${fetchError.hint || 'Check table name and permissions'}`);
    }

    if (!ctDeals || ctDeals.length === 0) {
      console.log('[Sync] No active deals found');
      return new Response(
        JSON.stringify({ 
          synced: 0, 
          updated: 0, 
          failed: 0, 
          errors: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sync] Fetched ${ctDeals.length} deals from Control Tower`);

    // Filter out stale deals (close_date > 30 days old with no recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeDeals = ctDeals.filter((deal: any) => {
      // Always include single deal syncs
      if (singleDealId) return true;
      
      // If no close_date, keep it
      const closeDate = deal.closedate || deal.close_date || deal.expected_closing_date;
      if (!closeDate) return true;
      
      const closeDateObj = new Date(closeDate);
      
      // If close_date is recent (within 30 days), keep it
      if (closeDateObj >= thirtyDaysAgo) return true;
      
      // If close_date is old, check for recent activity
      const updatedAt = deal.updated_at || deal.updatedAt || deal.createdate || deal.created_at;
      if (updatedAt) {
        const updatedAtObj = new Date(updatedAt);
        const hasRecentActivity = updatedAtObj >= thirtyDaysAgo;
        return hasRecentActivity;
      }
      
      // No activity data, exclude stale deal
      return false;
    });

    const filteredCount = ctDeals.length - activeDeals.length;
    if (filteredCount > 0) {
      console.log(`[Sync] Filtered out ${filteredCount} stale deals (close_date > 30 days old with no recent activity)`);
    }
    
    if (activeDeals.length === 0) {
      console.log('[Sync] No active deals remaining after filtering');
      return new Response(
        JSON.stringify({ 
          synced: 0, 
          updated: 0, 
          failed: 0, 
          errors: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sync] Syncing ${activeDeals.length} active deals`);

    const driveFolderMap = new Map<string, string>();
    for (const ctDeal of activeDeals) {
      const folderId = extractDriveFolderId(ctDeal);
      if (folderId) {
        driveFolderMap.set(String(ctDeal.id), folderId);
      }
    }

    if (driveFolderMap.size > 0) {
      console.log(`[Sync] Identified Drive folders for ${driveFolderMap.size} deals`);
    }

    // Log sample deal structure for debugging
    if (activeDeals.length > 0) {
      console.log('[Sync] Sample deal structure:', {
        id: activeDeals[0].id,
        dealname: activeDeals[0].dealname,
        potential_amount: activeDeals[0].potential_amount,
        amount: activeDeals[0].amount,
        dealstage: activeDeals[0].dealstage,
        clientCompanyName: activeDeals[0].clientCompanyName,
        expected_closing_date: activeDeals[0].expected_closing_date,
        keys: Object.keys(activeDeals[0]).slice(0, 15)
      });
    }

    // Build client lookup cache for fast lookups
    const clientCache = await buildClientCache(supabase);
    
    // Build user mapping cache
    const userMappingCache = await buildUserMappingCache(supabase);
    
    // Build employee mapping cache (Control Tower ID -> local employee ID)
    const { data: employeesData } = await supabase
      .from('employees')
      .select('id, control_tower_id, email');
    const employeeMappingCache = new Map<string, string>();
    employeesData?.forEach((emp: any) => {
      if (emp.control_tower_id) {
        employeeMappingCache.set(emp.control_tower_id, emp.id);
      }
    });
    console.log(`[Sync] Built employee mapping cache with ${employeeMappingCache.size} employees`);
    
    // Build POD mapping cache (by name)
    const { data: podsData } = await supabase.from('pods').select('id, name');
    const podMappingCache = new Map<string, string>();
    podsData?.forEach((pod: any) => {
      if (pod.name) {
        podMappingCache.set(pod.name.toLowerCase().trim(), pod.id);
      }
    });
    console.log(`[Sync] Built POD mapping cache with ${podMappingCache.size} PODs`);
    
    // Step 1: Collect all unique clients from deals
    console.log('[Sync] Extracting clients from deals...');
    const clientsMap = new Map<string, any>();
    
    activeDeals.forEach((ctDeal: any) => {
      const clientData = extractClientData(ctDeal);
      if (clientData && clientData.company) {
        const key = clientData.company.toLowerCase().trim();
        // Keep first occurrence (deals are already sorted by creation)
        if (!clientsMap.has(key)) {
          clientsMap.set(key, clientData);
        }
      }
    });
    
    console.log(`[Sync] Found ${clientsMap.size} unique clients to sync`);
    
    // Step 2: Bulk upsert all clients
    let clientsCreated = 0;
    let clientsUpdated = 0;
    
    if (clientsMap.size > 0) {
      const clientsToUpsert = Array.from(clientsMap.values());
      
      const { data: upsertedClients, error: clientUpsertError } = await supabase
        .from('clients')
        .upsert(clientsToUpsert, {
          onConflict: 'company',
          ignoreDuplicates: false
        })
        .select('id, company, created_at');
      
      if (clientUpsertError) {
        console.error('[Sync] Error upserting clients:', clientUpsertError);
      } else {
        console.log(`[Sync] Upserted ${upsertedClients?.length || 0} clients`);
        
        // Update cache with newly created/updated clients
        upsertedClients?.forEach((client: any) => {
          const key = client.company.toLowerCase().trim();
          clientCache.set(key, client.id);
          
          // Track new vs updated based on created_at timestamp
          const createdRecently = new Date(client.created_at).getTime() > startTime - 1000;
          if (createdRecently) {
            clientsCreated++;
          } else {
            clientsUpdated++;
          }
        });
      }
    }
    
    // Step 3: Transform deals for bulk upsert using cached client IDs and user mappings
    console.log('[Sync] Transforming deals with cached client and user references...');
    const unmappedOwners: Array<{ email: string | null; name: string | null }> = [];
    
    const transformedDeals = activeDeals
      .map((ctDeal: any) => {
        const ctStage = ctDeal.dealstage || ctDeal.stage;
        const ctStageName = ctDeal.dealstage_name || ctDeal.stage_name;
        
        // Map stage - this may return null for revenue projection stages
        const mappedStage = mapStage(ctStage, ctStageName);
        
        // Skip deals with unmapped stages (revenue projection deals)
        if (mappedStage === null) {
          console.log('[Sync] Skipping deal with revenue projection stage:', {
            id: ctDeal.id,
            dealname: ctDeal.dealname,
            stage: ctStage
          });
          return null;
        }
        
        // Lookup client from cache
        let localClientId = null;
        const clientData = extractClientData(ctDeal);
        
        if (clientData?.company) {
          const key = clientData.company.toLowerCase().trim();
          localClientId = clientCache.get(key) || null;
        }
        
        // Fallback: try control_tower_id or hubspot_id
        if (!localClientId) {
          const clientId = ctDeal.client_id || ctDeal.clientId;
          if (clientId) {
            localClientId = clientCache.get(`ct:${clientId}`) || 
                           clientCache.get(`hs:${clientId}`) || 
                           null;
          }
        }
        
        // Extract owner Control Tower ID
        const ownerControlTowerId = 
          ctDeal.actual_deal_owner_id || 
          ctDeal.owner_id || 
          ctDeal.ownerId ||
          null;
        
        // Map owner via email (tier 1: users table)
        const ownerEmail = 
          ctDeal.actual_deal_owner_email || 
          ctDeal.dealOwnerEmail || 
          ctDeal.owner_email;
        
        let localOwnerId = null;
        if (ownerEmail) {
          localOwnerId = userMappingCache.get(ownerEmail.toLowerCase().trim()) || null;
        }
        
        // If not found in users, try employees table (tier 2)
        if (!localOwnerId && ownerControlTowerId) {
          localOwnerId = employeeMappingCache.get(ownerControlTowerId) || null;
        }
        
        if (!localOwnerId) {
          console.warn(`[Sync] No mapping found for owner:`, {
            email: ownerEmail,
            control_tower_id: ownerControlTowerId,
            name: ctDeal.actual_deal_owner_name || ctDeal.dealOwnerName || null
          });
          unmappedOwners.push({
            email: ownerEmail,
            name: ctDeal.actual_deal_owner_name || ctDeal.dealOwnerName || null
          });
        }
        
        // Extract PM Control Tower ID
        const pmControlTowerId = 
          ctDeal.pm_assigned_id || 
          ctDeal.pm_id || 
          ctDeal.project_manager_id ||
          null;
        
        // Map PM via email (tier 1: users table)
        const pmEmail = ctDeal.pm_email || ctDeal.pm_assigned_email || ctDeal.project_manager_email;
        let localPmId = null;
        if (pmEmail) {
          localPmId = userMappingCache.get(pmEmail.toLowerCase().trim()) || null;
        }
        
        // If not found in users, try employees table (tier 2)
        if (!localPmId && pmControlTowerId) {
          localPmId = employeeMappingCache.get(pmControlTowerId) || null;
        }
        
        // Map POD via name
        const podName = ctDeal.pod || ctDeal.pod_name || ctDeal.team;
        let localPodId = null;
        if (podName) {
          localPodId = podMappingCache.get(podName.toLowerCase().trim()) || null;
        }
        
        const tags = Array.isArray(ctDeal.tags)
          ? ctDeal.tags
          : typeof ctDeal.tags === 'string'
            ? ctDeal.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
            : [];

        const expectedCloseDate = ctDeal.expected_closing_date || ctDeal.closedate || ctDeal.close_date;

        return {
          control_tower_id: ctDeal.id,

          // Use correct Control Tower field names
          title: ctDeal.dealname || ctDeal.deal_name || ctDeal.name || 'Untitled Deal',
          amount: parseFloat(ctDeal.amount || ctDeal.potential_amount || 0),
          stage: mappedStage, // Already mapped and validated above
          close_date: expectedCloseDate || null,

          // Map to local client and users
          client_id: localClientId,
          owner_id: localOwnerId,
          pm_assigned_id: localPmId,

          // Store Control Tower references for tracking
          control_tower_client_id: ctDeal.client_id || ctDeal.clientId || null,
          control_tower_owner_id: ownerControlTowerId,
          pm_control_tower_id: pmControlTowerId,
          control_tower_status: ctDeal.dealstage || ctDeal.status || 'active',

          notes: ctDeal.notes || ctDeal.description || null,
          hubspot_deal_id: ctDeal.hubspot_deal_id || ctDeal.hs_object_id || null,
          hubspot_crm_deal_url: ctDeal.hubspot_crm_deal_url || null,
          dealtype: ctDeal.dealtype || ctDeal.deal_type || null,
          category: ctDeal.category || ctDeal.deal_category || null,
          pod_id: localPodId,
          lead_source: ctDeal.lead_source || ctDeal.source || null,
          expected_closing_date: expectedCloseDate ? new Date(expectedCloseDate).toISOString().split('T')[0] : null,
          potential_amount: ctDeal.potential_amount ? parseFloat(ctDeal.potential_amount) : (ctDeal.amount ? parseFloat(ctDeal.amount) : null),
          priority: ctDeal.priority || 'medium',
          tags,
          
          // NEW FIELDS - Pipeline and work type
          pipeline: ctDeal.pipeline || null,
          type_of_work: ctDeal.type_of_work || null,
          
          // NEW FIELDS - Estimate URLs
          estimate_url: ctDeal.estimate_url || null,
          internal_estimate_doc_url: ctDeal.internal_estimate_doc_url || null,
          client_estimate_doc_url: ctDeal.client_estimate_doc_url || null,
          estimate_task_link: ctDeal.estimate_task_link || null,
          internal_estimate_doc_link: ctDeal.internal_estimate_doc_link || null,
          
          // NEW FIELDS - Proposal and collaboration URLs
          pandadoc_proposal_url: ctDeal.pandadoc_proposal_url || null,
          collaborative_ai: ctDeal.collaborative_ai || null,
          collaborative_ai_link: ctDeal.collaborative_ai_link || null,
          workboard_ai_link: ctDeal.workboard_ai_link || null,
          
          // NEW FIELDS - CRM URLs
          leadslift_crm_deal_url: ctDeal.leadslift_crm_deal_url || null,
          client_agent_url: ctDeal.client_agent_url || null,
          client_agent_folder: ctDeal.client_agent_folder || null,
          
          external_links: {
            n8n_workflow_url: ctDeal.n8n_workflow_url || null,
            activecollab_project_url: ctDeal.activecollab_project_url || null,
          },
          control_tower_metadata: ctDeal,
          last_activity_date: ctDeal.updated_at?.split('T')[0] || ctDeal.last_activity_date || new Date().toISOString().split('T')[0],

          // Control Tower may not expose the user reference; store null until mappings exist.
          last_activity_by: null,

          synced_from_control_tower: true,
          last_synced_at: new Date().toISOString(),
          probability: ctDeal.probability ? parseFloat(ctDeal.probability) : null,
          
          // Map dealstage to local status field with stale detection
          status: mapStatus(
            ctDeal.dealstage || ctDeal.status,
            expectedCloseDate,
            ctDeal.updated_at || ctDeal.hs_lastmodifieddate
          ),

          // Timestamps from Control Tower
          created_at: ctDeal.createdate || ctDeal.created_at || new Date().toISOString(),
          updated_at: ctDeal.updated_at || new Date().toISOString(),
        };
      })
      .filter((deal: any): deal is NonNullable<typeof deal> => deal !== null); // Remove null entries (revenue projection deals)
    
    // Log unmapped owners
    if (unmappedOwners.length > 0) {
      console.warn(`[Sync] ${unmappedOwners.length} deals have unmapped owners:`, unmappedOwners.slice(0, 5));
    }
    
    console.log('[Sync] Transformed', transformedDeals.length, 'deals with cached client references');

    // Perform bulk upsert
    console.log('[Sync] Performing bulk upsert...');
    const { data: upsertedDeals, error: upsertError } = await supabase
      .from('deals')
      .upsert(transformedDeals, {
        onConflict: 'control_tower_id',
        ignoreDuplicates: false
      })
      .select('id, control_tower_id');

    if (upsertError) {
      console.error('[Sync] Bulk upsert error:', upsertError);
      throw new Error(`Failed to sync deals: ${upsertError.message}`);
    }

    const syncedCount = upsertedDeals?.length || transformedDeals.length;
    console.log(`[Sync] Synced ${syncedCount} deals`);

    type UpsertedDealReference = { id: string | number; control_tower_id: string | number | null };
    const typedUpserts: UpsertedDealReference[] = (upsertedDeals || []) as UpsertedDealReference[];

    const fileSyncPayload = typedUpserts
      .map((deal) => {
        if (!deal?.id || !deal.control_tower_id) return null;
        const folderId = driveFolderMap.get(String(deal.control_tower_id));
        if (!folderId) return null;
        return {
          dealId: String(deal.id),
          controlTowerDealId: String(deal.control_tower_id),
          driveFolderId: folderId,
        };
      })
      .filter((value): value is { dealId: string; controlTowerDealId: string; driveFolderId: string } => Boolean(value));

    if (fileSyncPayload.length > 0) {
      console.log(`[Sync] Triggering Drive file sync for ${fileSyncPayload.length} deals`);
      try {
        await supabase.functions.invoke('sync-deal-files', {
          body: { deals: fileSyncPayload },
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        });
      } catch (fileSyncError) {
        console.warn('[Sync] Failed to trigger deal file sync:', fileSyncError);
      }
    }

    // Now sync checklist items for each deal
    console.log('[Sync] Syncing checklist items from Control Tower...');
    let checklistSyncedCount = 0;
    let checklistFailedCount = 0;

    for (const deal of upsertedDeals || []) {
      if (!deal.control_tower_id) continue;

      try {
        // Fetch checklist items from Control Tower for this deal
        // Attempt to fetch checklist items with graceful fallbacks for missing columns
        let ctChecklistItems: any[] | null = null;
        let checklistError: any = null;

        // Try ordering by order_index first (preferred)
        let resp = await ctClient
          .from('deal_checklist')
          .select('*')
          .eq('deal_id', deal.control_tower_id)
          .order('order_index', { ascending: true });

        if (resp.error && (resp.error.code === '42703' || (resp.error.message || '').includes('order_index'))) {
          console.warn(`[Sync] order_index not found, falling back to position for deal ${deal.id}`);
          // Fallback to position
          resp = await ctClient
            .from('deal_checklist')
            .select('*')
            .eq('deal_id', deal.control_tower_id)
            .order('position', { ascending: true });
        }

        if (resp.error && (resp.error.code === '42703' || (resp.error.message || '').includes('position'))) {
          console.warn(`[Sync] position not found, falling back to created_at for deal ${deal.id}`);
          // Fallback to created_at
          resp = await ctClient
            .from('deal_checklist')
            .select('*')
            .eq('deal_id', deal.control_tower_id)
            .order('created_at', { ascending: true });
        }

        if (resp.error && (resp.error.code === '42703' || (resp.error.message || '').includes('created_at'))) {
          console.warn(`[Sync] created_at not found, fetching without explicit order for deal ${deal.id}`);
          // Final fallback without explicit order
          resp = await ctClient
            .from('deal_checklist')
            .select('*')
            .eq('deal_id', deal.control_tower_id);
        }

        ctChecklistItems = resp.data;
        checklistError = resp.error;

        if (checklistError) {
          console.warn(`[Sync] Error fetching checklist for deal ${deal.id}:`, checklistError);
          checklistFailedCount++;
          continue;
        }

        if (ctChecklistItems && ctChecklistItems.length > 0) {
          console.log(`[Sync] Found ${ctChecklistItems.length} checklist items for deal ${deal.id}`);

          // Fetch existing checklist items for conflict resolution
          const { data: existingItems } = await supabase
            .from('deal_checklist_items')
            .select('id, control_tower_item_id, is_completed, completed_at, completed_by')
            .eq('deal_id', deal.id);

          const existingItemsMap = new Map(
            (existingItems || []).map((item: any) => [item.control_tower_item_id, item])
          );

          // Map Control Tower checklist items to BD Portal format with conflict resolution
          const checklistItemsToUpsert = ctChecklistItems.map((item: any, index: number) => {
            const existingItem = existingItemsMap.get(item.id) as any;
            
            // Conflict resolution: if both systems have completion status, use most recent
            let isCompleted = item.is_completed || false;
            let completedAt = item.completed_at || null;
            let completedBy = null;

            if (existingItem?.is_completed && item.is_completed) {
              // Both completed - use most recent timestamp
              const existingDate = existingItem.completed_at ? new Date(existingItem.completed_at) : new Date(0);
              const ctDate = item.completed_at ? new Date(item.completed_at) : new Date(0);
              
              if (existingDate > ctDate) {
                isCompleted = existingItem.is_completed;
                completedAt = existingItem.completed_at;
                completedBy = existingItem.completed_by || null;
                console.log(`[Sync] Preserving local completion for item "${item.title}" (local newer)`);
              }
            } else if (existingItem?.is_completed && !item.is_completed) {
              // Local completed but Control Tower not - preserve local
              isCompleted = existingItem.is_completed;
              completedAt = existingItem.completed_at;
              completedBy = existingItem.completed_by || null;
              console.log(`[Sync] Preserving local completion for item "${item.title}"`);
            }

            return {
              deal_id: deal.id,
              control_tower_item_id: item.id, // Store Control Tower item ID
              title: item.label || item.title || item.name || item.description || `Task ${index + 1}`,
              is_completed: isCompleted,
              completed_by: completedBy,
              completed_at: completedAt,
              order_index: item.sort_order ?? item.order_index ?? index,
            };
          });

          // Upsert checklist items using control_tower_item_id for matching
          for (const item of checklistItemsToUpsert) {
            const { error: upsertError } = await supabase
              .from('deal_checklist_items')
              .upsert(item, {
                onConflict: 'deal_id,control_tower_item_id',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`[Sync] Error upserting checklist item "${item.title}":`, upsertError);
              checklistFailedCount++;
            }
          }

          checklistSyncedCount++;
        } else {
          // No checklist in Control Tower - BD team will manually manage checklists
          console.log(`[Sync] No checklist in Control Tower for deal ${deal.id}, skipping template application (BD team manages manually)`);
        }
      } catch (error) {
        console.error(`[Sync] Error processing checklist for deal ${deal.id}:`, error);
        checklistFailedCount++;
      }
    }

    console.log(`[Sync] Checklist sync complete: ${checklistSyncedCount} synced, ${checklistFailedCount} failed`);
    const duration = Date.now() - startTime;

    console.log(`[Sync] Successfully synced ${syncedCount} deals in ${duration}ms`);

    // Log sync operation to audit log (optional)
    try {
      await supabase
        .from('sync_audit_log')
        .insert({
          sync_type: 'deals',
          user_id: userId,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          status: 'success',
          records_synced: syncedCount,
          records_updated: syncedCount,
          records_failed: 0,
          error_details: null
        });
    } catch (auditError) {
      console.warn('[Sync] Failed to log legacy audit record:', auditError);
    }

    try {
      await supabase.from('control_tower_sync_log').insert({
        sync_type: 'pull',
        entity_type: 'deal',
        status: 'success',
        payload: {
          deals: {
            new: 0,
            updated: syncedCount,
            failed: 0
          },
          clients: {
            new: clientsCreated,
            updated: clientsUpdated
          },
          checklists: {
            synced: checklistSyncedCount,
            failed: checklistFailedCount
          },
          duration: duration,
          timestamp: new Date().toISOString(),
          errors: []
        },
        synced_by: userId,
      });
    } catch (logError) {
      console.warn('[Sync] Failed to log control_tower_sync_log record:', logError);
    }

    // Update sync state for incremental mode
    if (mode === 'incremental' && !singleDealId) {
      try {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('control_tower_sync_state')
          .update({
            last_successful_sync_at: now,
            last_sync_status: 'success',
            last_sync_error: null,
            deals_synced: syncedCount,
            updated_at: now
          })
          .eq('id', (await supabase
            .from('control_tower_sync_state')
            .select('id')
            .order('last_successful_sync_at', { ascending: false })
            .limit(1)
            .single()
          ).data?.id);
        
        if (updateError) {
          console.warn('[Sync] Failed to update sync state:', updateError);
        } else {
          console.log(`[Sync] Updated sync state: last_successful_sync_at = ${now}`);
        }
      } catch (stateError) {
        console.warn('[Sync] Error updating sync state:', stateError);
      }
    }

    const result: SyncResult = {
      deals: {
        new: 0,
        updated: syncedCount,
        failed: 0
      },
      clients: {
        new: clientsCreated,
        updated: clientsUpdated
      },
      checklists: {
        synced: checklistSyncedCount,
        failed: checklistFailedCount
      },
      errors: [],
      duration
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Sync] Failed after ${duration}ms:`, error);

    // Log failed sync to audit log
    try {
      await supabase
        .from('sync_audit_log')
        .insert({
          sync_type: 'deals',
          user_id: userId,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          status: 'failed',
          records_synced: 0,
          records_updated: 0,
          records_failed: 0,
          error_details: { message: error instanceof Error ? error.message : 'Unknown error' }
        });
    } catch (auditError) {
      console.warn('[Sync] Failed to log legacy audit record:', auditError);
    }

    try {
      await supabase.from('control_tower_sync_log').insert({
        sync_type: 'pull',
        entity_type: 'deal',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        payload: { duration },
        synced_by: userId,
      });
    } catch (logError) {
      console.warn('[Sync] Failed to log control_tower_sync_log failure record:', logError);
    }

    throw error;
  }
}
