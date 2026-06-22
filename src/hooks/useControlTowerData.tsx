import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createControlTowerClient } from '@/integrations/controlTower/client';
import { useControlTowerConfig } from './useControlTowerConfig';
import { supabase } from '@/integrations/supabase/client';
import type {
  ControlTowerLead,
  ControlTowerWarmLead,
  ControlTowerDeal,
  ControlTowerClient,
  ControlTowerSummary
} from '@/types/controlTower';

// Hook for fetching leads with full contact and company details
export const useControlTowerLeads = () => {
  const { data: config } = useControlTowerConfig();

  return useQuery({
    queryKey: ['control-tower-leads'],
    queryFn: async (): Promise<ControlTowerLead[]> => {
      if (!config?.url || !config?.anon_key) {
        throw new Error('Control Tower not configured');
      }

      const client = createControlTowerClient(config.url, config.anon_key);

      // Fetch leads with expanded fields and try to join with clients if relationship exists
      const { data, error } = await client
        .from('Lead')
        .select(`
          *,
          client:clients!client_id (
            id,
            name,
            company,
            email,
            contact_email,
            phone,
            contact_phone,
            contact_person,
            website,
            domain,
            industry,
            address,
            city,
            state,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // If join fails (no client_id column), fallback to basic select
        console.warn('[Control Tower] Lead-client join failed, fetching leads only:', error.message);
        const { data: basicData, error: basicError } = await client
          .from('Lead')
          .select('*')
          .order('created_at', { ascending: false });

        if (basicError) throw basicError;

        // Transform basic data to include all expected fields
        return (basicData || []).map((lead: any) => ({
          ...lead,
          // Map additional contact fields from lead record itself
          contact_first_name: lead.first_name || lead.contact_first_name || null,
          contact_last_name: lead.last_name || lead.contact_last_name || null,
          contact_email: lead.email || lead.contact_email || null,
          contact_phone: lead.phone || lead.contact_phone || null,
          contact_title: lead.title || lead.job_title || lead.contact_title || null,
          company_name: lead.company || lead.company_name || lead.organization || null,
          company_website: lead.website || lead.company_website || lead.domain || null,
          company_industry: lead.industry || lead.company_industry || null,
          company_address: lead.address || lead.company_address || null,
          linkedin_url: lead.linkedin_url || lead.linkedin || null,
        }));
      }

      // Transform data to flatten client details
      return (data || []).map((lead: any) => ({
        ...lead,
        // Contact details - from lead or joined client
        contact_first_name: lead.first_name || lead.contact_first_name || null,
        contact_last_name: lead.last_name || lead.contact_last_name || null,
        contact_email: lead.email || lead.contact_email || lead.client?.contact_email || lead.client?.email || null,
        contact_phone: lead.phone || lead.contact_phone || lead.client?.contact_phone || lead.client?.phone || null,
        contact_title: lead.title || lead.job_title || lead.contact_title || null,
        contact_person: lead.contact_person || lead.client?.contact_person || null,
        // Company details - from lead or joined client
        company_name: lead.company || lead.company_name || lead.client?.company || lead.client?.name || null,
        company_website: lead.website || lead.company_website || lead.client?.website || lead.client?.domain || null,
        company_industry: lead.industry || lead.company_industry || lead.client?.industry || null,
        company_address: lead.address || lead.company_address || lead.client?.address || null,
        company_city: lead.city || lead.client?.city || null,
        company_state: lead.state || lead.client?.state || null,
        company_country: lead.country || lead.client?.country || null,
        linkedin_url: lead.linkedin_url || lead.linkedin || null,
        // Client reference
        client_id: lead.client_id || lead.client?.id || null,
      }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!config?.url && !!config?.anon_key && config?.is_active,
  });
};

// Hook for fetching warm leads (HubSpot synced) with full contact and company details
export const useControlTowerWarmLeads = () => {
  const { data: config } = useControlTowerConfig();

  return useQuery({
    queryKey: ['control-tower-warm-leads'],
    queryFn: async (): Promise<ControlTowerWarmLead[]> => {
      if (!config?.url || !config?.anon_key) {
        throw new Error('Control Tower not configured');
      }

      const client = createControlTowerClient(config.url, config.anon_key);

      // Fetch HubSpot leads with expanded fields
      const { data, error } = await client
        .from('HubSpot_Leads')
        .select(`
          *,
          client:clients!client_id (
            id,
            name,
            company,
            email,
            contact_email,
            phone,
            contact_phone,
            contact_person,
            website,
            domain,
            industry,
            address,
            city,
            state,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // If join fails, fallback to basic select
        console.warn('[Control Tower] HubSpot lead-client join failed, fetching leads only:', error.message);
        const { data: basicData, error: basicError } = await client
          .from('HubSpot_Leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (basicError) throw basicError;

        // Transform HubSpot leads to include all expected fields
        return (basicData || []).map((lead: any) => ({
          ...lead,
          // Contact details from HubSpot lead fields
          contact_first_name: lead.firstname || lead.first_name || lead.contact_first_name || null,
          contact_last_name: lead.lastname || lead.last_name || lead.contact_last_name || null,
          contact_email: lead.email || lead.contact_email || lead.hs_email || null,
          contact_phone: lead.phone || lead.contact_phone || lead.hs_phone || lead.mobilephone || null,
          contact_title: lead.jobtitle || lead.job_title || lead.title || null,
          // Company details from HubSpot lead fields
          company_name: lead.company || lead.company_name || lead.associatedcompanyid_name || null,
          company_website: lead.website || lead.company_website || lead.domain || null,
          company_industry: lead.industry || lead.company_industry || null,
          company_address: lead.address || lead.company_address || lead.street_address || null,
          company_city: lead.city || null,
          company_state: lead.state || null,
          company_country: lead.country || null,
          // HubSpot specific fields
          hubspot_contact_id: lead.hs_object_id || lead.hubspot_contact_id || lead.vid || null,
          hubspot_owner_id: lead.hubspot_owner_id || lead.hs_owner_id || null,
          linkedin_url: lead.linkedin || lead.linkedinbio || lead.hs_linkedinbio || null,
          lead_status: lead.hs_lead_status || lead.lead_status || lead.lifecyclestage || null,
          lead_score: lead.lead_score || lead.hs_lead_score || lead.hubspotscore || null,
        }));
      }

      // Transform data to flatten client details
      return (data || []).map((lead: any) => ({
        ...lead,
        // Contact details - from HubSpot lead or joined client
        contact_first_name: lead.firstname || lead.first_name || lead.contact_first_name || null,
        contact_last_name: lead.lastname || lead.last_name || lead.contact_last_name || null,
        contact_email: lead.email || lead.contact_email || lead.hs_email || lead.client?.contact_email || lead.client?.email || null,
        contact_phone: lead.phone || lead.contact_phone || lead.hs_phone || lead.mobilephone || lead.client?.contact_phone || lead.client?.phone || null,
        contact_title: lead.jobtitle || lead.job_title || lead.title || null,
        contact_person: lead.contact_person || lead.client?.contact_person || null,
        // Company details - from HubSpot lead or joined client
        company_name: lead.company || lead.company_name || lead.client?.company || lead.client?.name || null,
        company_website: lead.website || lead.company_website || lead.domain || lead.client?.website || lead.client?.domain || null,
        company_industry: lead.industry || lead.company_industry || lead.client?.industry || null,
        company_address: lead.address || lead.company_address || lead.street_address || lead.client?.address || null,
        company_city: lead.city || lead.client?.city || null,
        company_state: lead.state || lead.client?.state || null,
        company_country: lead.country || lead.client?.country || null,
        // HubSpot specific fields
        hubspot_contact_id: lead.hs_object_id || lead.hubspot_contact_id || lead.vid || null,
        hubspot_owner_id: lead.hubspot_owner_id || lead.hs_owner_id || null,
        linkedin_url: lead.linkedin || lead.linkedinbio || lead.hs_linkedinbio || null,
        lead_status: lead.hs_lead_status || lead.lead_status || lead.lifecyclestage || null,
        lead_score: lead.lead_score || lead.hs_lead_score || lead.hubspotscore || null,
        // Client reference
        client_id: lead.client_id || lead.client?.id || null,
      }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!config?.url && !!config?.anon_key && config?.is_active,
  });
};

// Hook for fetching deals
export const useControlTowerDeals = () => {
  const { data: config } = useControlTowerConfig();
  
  return useQuery({
    queryKey: ['control-tower-deals'],
    queryFn: async (): Promise<ControlTowerDeal[]> => {
      if (!config?.url || !config?.anon_key) {
        throw new Error('Control Tower not configured');
      }
      
      const client = createControlTowerClient(config.url, config.anon_key);
      const { data, error } = await client
        .from('Deal')
        .select(`
          *,
          client:clients!client_id(name)
        `)
        .order('createdate', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!config?.url && !!config?.anon_key && config?.is_active,
  });
};

// Hook for fetching clients (legacy - uses direct Supabase connection)
export const useControlTowerClients = (page: number = 1, limit: number = 25) => {
  const { data: config } = useControlTowerConfig();

  return useQuery({
    queryKey: ['control-tower-clients', page, limit],
    queryFn: async () => {
      if (!config?.url || !config?.anon_key) {
        throw new Error('Control Tower not configured');
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const client = createControlTowerClient(config.url, config.anon_key);
      const { data, error, count } = await client
        .from('clients')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;

      return {
        data: (data || []) as ControlTowerClient[],
        total: count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!config?.url && !!config?.anon_key && config?.is_active,
  });
};

// Hook for fetching clients synced via REST API (from local database)
export const useControlTowerClientsAPI = (page: number = 1, limit: number = 25) => {
  const { data: config } = useControlTowerConfig();

  return useQuery({
    queryKey: ['control-tower-clients-api', page, limit],
    queryFn: async () => {
      // Query LOCAL clients table where synced_from_control_tower_api = true
      // This ensures we're reading from our own database after sync
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );

      const { data, error, count } = await supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('synced_from_control_tower_api', true)
        .order('name', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        data: (data || []) as ControlTowerClient[],
        total: count || 0
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: config?.is_active ?? true,
  });
};

// Hook for fetching summary stats
export const useControlTowerSummary = () => {
  const { data: config } = useControlTowerConfig();
  
  return useQuery({
    queryKey: ['control-tower-summary'],
    queryFn: async (): Promise<ControlTowerSummary> => {
      if (!config?.url || !config?.anon_key) {
        throw new Error('Control Tower not configured');
      }
      
      const client = createControlTowerClient(config.url, config.anon_key);
      
      // Fetch counts from multiple tables
      const [leadsResult, warmLeadsResult, dealsResult, clientsResult] = await Promise.all([
        client.from('Lead').select('id', { count: 'exact', head: true }),
        client.from('HubSpot_Leads').select('id', { count: 'exact', head: true }),
        client.from('Deal').select('id, amount').eq('dealstatus', 'active'),
        client.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      const dealsValue = dealsResult.data?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;

      return {
        new_leads_count: leadsResult.count || 0,
        warm_leads_count: warmLeadsResult.count || 0,
        active_deals_count: dealsResult.data?.length || 0,
        deals_value_total: dealsValue,
        active_clients_count: clientsResult.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!config?.url && !!config?.anon_key && config?.is_active,
  });
};

// Hook for fetching deals by stage
export const useControlTowerDealsByStage = (
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation',
  page: number = 1,
  limit: number = 25
) => {
  const { data: config } = useControlTowerConfig();
  
  return useQuery({
    queryKey: ['control-tower-deals-by-stage', stage, page, limit],
    queryFn: async () => {
      if (!config?.url || !config?.anon_key) {
        throw new Error('Control Tower not configured');
      }
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const client = createControlTowerClient(config.url, config.anon_key);
      
      const { data, error, count } = await client
        .from('Deal')
        .select(`
          *,
          client:clients!client_id (
            id,
            name,
            contact_email,
            contact_phone,
            contact_person,
            address,
            industry,
            domain
          )
        `, { count: 'exact' })
        .eq('dealstage', stage)
        .order('createdate', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      // Flatten client data into deal object
      const deals = (data || []).map((deal: any) => ({
        id: deal.id,
        deal_name: deal.dealname || '',
        client_id: deal.client_id,
        client_name: deal.client?.name || deal.clientCompanyName || '',
        stage: deal.dealstage,
        value: deal.amount || deal.potential_amount,
        owner_id: deal.actual_deal_owner_id,
        owner_name: deal.actual_deal_owner_name || `${deal.dealOwnerFirstName || ''} ${deal.dealOwnerLastName || ''}`.trim(),
        pm_assigned_id: deal.pm_assigned_id,
        pm_assigned_name: deal.pm_assigned_name,
        status: 'active',
        close_date: deal.expected_closing_date || deal.closedate,
        created_at: deal.createdate || new Date().toISOString(),
        updated_at: deal.updated_at || new Date().toISOString(),
        project_id: deal.project_id,
        
        // Client contact info
        client_email: deal.client?.contact_email || deal.clientEmail,
        client_phone: deal.client?.contact_phone || deal.clientPhone,
        client_contact_person: deal.client?.contact_person || `${deal.clientFirstName || ''} ${deal.clientLastName || ''}`.trim(),
        client_address: deal.client?.address,
        client_industry: deal.client?.industry,
        client_domain: deal.client?.domain || deal.clientWebsite,
        
        // Additional deal fields
        hubspot_deal_id: deal.hubspot_deal_id,
        hubspot_crm_deal_url: deal.hubspot_crm_deal_url,
        dealtype: deal.dealtype,
        lead_source: deal.lead_source,
        expected_closing_date: deal.expected_closing_date,
        potential_amount: deal.potential_amount,
      }));
      
      return {
        data: deals,
        total: count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!config?.url && !!config?.anon_key && config?.is_active,
  });
};

// Hook for triggering REST API sync for clients
export const useSyncControlTowerClientsAPI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'sync-control-tower-clients-api',
        {
          method: 'POST',
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to sync clients from API');
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      return data.result;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['control-tower-clients-api'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-summary'] });
    },
  });
};
