import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

interface FetchAction {
  action: 'fetch';
  sheetId: string;
  sheetUrl: string;
  gid?: string; // Optional tab ID - if provided, only imports from this specific tab
}

interface ValidateAction {
  action: 'validate';
  campaignId: string;
  sheetData: string[][];
  fieldMapping: Record<string, string>;
}

interface ImportAction {
  action: 'import';
  campaignId: string;
  contacts: Array<{
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    company: string;
    phone?: string;
    linkedinUrl?: string;
    companyWebsite?: string;
    companyIndustry?: string;
    companySize?: string;
    companyLinkedinUrl?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }>;
  tags: string[];
}

interface UpdateAction {
  action: 'update';
  campaignId: string;
  contacts: Array<{
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    company: string;
    phone?: string;
    linkedinUrl?: string;
    companyWebsite?: string;
    companyIndustry?: string;
    companySize?: string;
    companyLinkedinUrl?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }>;
  tags: string[];
}

type RequestBody = FetchAction | ValidateAction | ImportAction | UpdateAction;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Supabase environment variables are not configured" }),
      { status: 500, headers: jsonHeaders }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400, headers: jsonHeaders });
  }

  console.log('[campaign-google-sheet-import] Action:', body.action);

  try {
    if (body.action === 'fetch') {
      return await handleFetch(body);
    } else if (body.action === 'validate') {
      return await handleValidate(body, supabase);
    } else if (body.action === 'import') {
      return await handleImport(body, supabase, user.id);
    } else if (body.action === 'update') {
      return await handleUpdate(body, supabase, user.id);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: jsonHeaders }
      );
    }
  } catch (error: any) {
    console.error('[campaign-google-sheet-import] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});

async function handleFetch(body: FetchAction): Promise<Response> {
  const { sheetId, gid } = body;

  // Construct CSV export URL for public sheets
  // If gid is provided, only export that specific tab; otherwise export the default/first tab
  const csvUrl = gid
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  console.log('[fetch] Fetching sheet:', csvUrl, gid ? `(tab gid: ${gid})` : '(default tab)');

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet (HTTP ${response.status}). Make sure the sheet is shared publicly with "Anyone with the link" as Viewer.`);
  }

  const csvText = await response.text();
  const sheetData = parseCSV(csvText);

  if (sheetData.length === 0) {
    throw new Error('Sheet is empty');
  }

  return new Response(
    JSON.stringify({
      sheetName: `Sheet from ${sheetId}`,
      sheetData,
    }),
    { status: 200, headers: jsonHeaders }
  );
}

async function handleValidate(body: ValidateAction, supabase: any): Promise<Response> {
  const { campaignId, sheetData, fieldMapping } = body;

  if (sheetData.length < 2) {
    throw new Error('Sheet must contain at least a header row and one data row');
  }

  const headers = sheetData[0];
  const dataRows = sheetData.slice(1);

  // Create reverse mapping (header -> field key)
  const headerToField: Record<string, string> = {};
  Object.entries(fieldMapping).forEach(([fieldKey, headerValue]) => {
    headerToField[headerValue] = fieldKey;
  });

  const validContacts: any[] = [];
  const errors: Array<{ rowNumber: number; field: string; message: string }> = [];
  const emailsSeen = new Set<string>();
  const duplicatesInSheet = new Set<string>();

  // Required fields
  const requiredFields = ['firstName', 'lastName', 'email', 'jobTitle', 'company'];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // +2 because we skip header and are 1-indexed
    const contact: any = {};
    let hasError = false;

    // Map row data to contact fields
    headers.forEach((header, index) => {
      const fieldKey = headerToField[header];
      if (fieldKey && row[index]) {
        contact[fieldKey] = row[index].trim();
      }
    });

    // Validate required fields
    for (const field of requiredFields) {
      if (!contact[field]) {
        errors.push({
          rowNumber,
          field: fieldMapping[field] || field,
          message: 'Required field is missing',
        });
        hasError = true;
      }
    }

    // Validate email format
    if (contact.email && !isValidEmail(contact.email)) {
      errors.push({
        rowNumber,
        field: fieldMapping['email'] || 'email',
        message: 'Invalid email format',
      });
      hasError = true;
    }

    // Check for duplicates within sheet
    if (contact.email) {
      if (emailsSeen.has(contact.email.toLowerCase())) {
        duplicatesInSheet.add(contact.email.toLowerCase());
        hasError = true;
      } else {
        emailsSeen.add(contact.email.toLowerCase());
      }
    }

    if (!hasError) {
      contact.rowNumber = rowNumber;
      validContacts.push(contact);
    }
  }

  // Check for existing contacts in campaign
  const existingEmails = new Set<string>();
  if (validContacts.length > 0) {
    const emails = validContacts.map(c => c.email.toLowerCase());
    const { data: existing } = await supabase
      .from('campaign_contacts')
      .select('contact_email')
      .eq('campaign_id', campaignId)
      .in('contact_email', emails);

    if (existing) {
      existing.forEach((c: any) => existingEmails.add(c.contact_email.toLowerCase()));
    }
  }

  // Filter out contacts that already exist
  const contactsToImport = validContacts.filter(
    c => !existingEmails.has(c.email.toLowerCase()) && !duplicatesInSheet.has(c.email.toLowerCase())
  );

  const validation = {
    total: dataRows.length,
    valid: contactsToImport.length,
    invalid: errors.length,
    duplicateInSheet: duplicatesInSheet.size,
    alreadyExists: existingEmails.size,
    validContacts: contactsToImport,
    errors,
  };

  console.log('[validate] Result:', {
    total: validation.total,
    valid: validation.valid,
    invalid: validation.invalid,
    duplicates: validation.duplicateInSheet,
    existing: validation.alreadyExists,
  });

  return new Response(JSON.stringify({ validation }), { status: 200, headers: jsonHeaders });
}

async function handleImport(body: ImportAction, supabase: any, userId: string): Promise<Response> {
  const { campaignId, contacts, tags } = body;

  console.log('[import] Importing', contacts.length, 'contacts');

  const imported: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    const insertData = batch.map(contact => {
      // Build address object if any address fields are present
      const addressData = {
        streetAddress: contact.streetAddress || null,
        city: contact.city || null,
        state: contact.state || null,
        zipCode: contact.zipCode || null,
        country: contact.country || null,
      };
      
      const hasAddress = Object.values(addressData).some(v => v !== null);

      return {
        campaign_id: campaignId,
        contact_name: `${contact.firstName} ${contact.lastName}`,
        contact_email: contact.email.toLowerCase(),
        contact_title: contact.jobTitle,
        contact_company: contact.company,
        contact_phone: contact.phone || null,
        contact_linkedin_url: contact.linkedinUrl || null,
        // Company fields (map to existing columns)
        company_website: contact.companyWebsite || null,
        company_industry: contact.companyIndustry || null,
        company_size: contact.companySize || null,
        company_linkedin_url: contact.companyLinkedinUrl || null,
        status: 'identified',
        metadata: { 
          tags, 
          imported_via: 'google_sheet', 
          imported_by: userId,
          // Store address in metadata since no dedicated columns exist
          ...(hasAddress ? { address: addressData } : {})
        },
      };
    });

    const { data, error } = await supabase
      .from('campaign_contacts')
      .insert(insertData)
      .select('contact_email');

    if (error) {
      console.error('[import] Batch error:', error);
      batch.forEach(c => failed.push({ email: c.email, error: error.message }));
    } else if (data) {
      data.forEach((c: any) => imported.push(c.contact_email));
    }
  }

  const result = {
    imported: imported.length,
    skipped: skipped.length,
    failed: failed.length,
    tags,
  };

  console.log('[import] Complete:', result);

  return new Response(JSON.stringify({ result }), { status: 200, headers: jsonHeaders });
}

async function handleUpdate(body: UpdateAction, supabase: any, userId: string): Promise<Response> {
  const { campaignId, contacts, tags } = body;

  console.log('[update] Updating/creating', contacts.length, 'contacts');

  const matched: string[] = [];
  const updated: string[] = [];
  const created: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  // Process each contact individually for update/create logic
  for (const contact of contacts) {
    const fullName = `${contact.firstName} ${contact.lastName}`;
    
    try {
      // Try to find existing contact by name + company (case-insensitive)
      const { data: existingContacts, error: searchError } = await supabase
        .from('campaign_contacts')
        .select('id, contact_email')
        .eq('campaign_id', campaignId)
        .ilike('contact_name', fullName)
        .ilike('contact_company', contact.company)
        .limit(1);

      if (searchError) {
        console.error('[update] Search error:', searchError);
        failed.push({ name: fullName, error: searchError.message });
        continue;
      }

      const addressData = {
        streetAddress: contact.streetAddress || null,
        city: contact.city || null,
        state: contact.state || null,
        zipCode: contact.zipCode || null,
        country: contact.country || null,
      };
      const hasAddress = Object.values(addressData).some(v => v !== null);

      if (existingContacts && existingContacts.length > 0) {
        // Contact exists - update it
        const existingContact = existingContacts[0];
        matched.push(fullName);

        const updateData = {
          contact_email: contact.email.toLowerCase(),
          contact_title: contact.jobTitle,
          contact_phone: contact.phone || null,
          contact_linkedin_url: contact.linkedinUrl || null,
          company_website: contact.companyWebsite || null,
          company_industry: contact.companyIndustry || null,
          company_size: contact.companySize || null,
          company_linkedin_url: contact.companyLinkedinUrl || null,
          metadata: {
            tags,
            updated_via: 'google_sheet_update',
            updated_by: userId,
            ...(hasAddress ? { address: addressData } : {})
          },
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('campaign_contacts')
          .update(updateData)
          .eq('id', existingContact.id);

        if (updateError) {
          console.error('[update] Update error:', updateError);
          failed.push({ name: fullName, error: updateError.message });
        } else {
          updated.push(fullName);
          console.log('[update] Updated:', fullName);
        }
      } else {
        // Contact doesn't exist - create new
        const insertData = {
          campaign_id: campaignId,
          contact_name: fullName,
          contact_email: contact.email.toLowerCase(),
          contact_title: contact.jobTitle,
          contact_company: contact.company,
          contact_phone: contact.phone || null,
          contact_linkedin_url: contact.linkedinUrl || null,
          company_website: contact.companyWebsite || null,
          company_industry: contact.companyIndustry || null,
          company_size: contact.companySize || null,
          company_linkedin_url: contact.companyLinkedinUrl || null,
          status: 'identified',
          metadata: {
            tags,
            imported_via: 'google_sheet_update',
            imported_by: userId,
            ...(hasAddress ? { address: addressData } : {})
          },
        };

        const { error: insertError } = await supabase
          .from('campaign_contacts')
          .insert(insertData);

        if (insertError) {
          console.error('[update] Insert error:', insertError);
          failed.push({ name: fullName, error: insertError.message });
        } else {
          created.push(fullName);
          console.log('[update] Created:', fullName);
        }
      }
    } catch (error: any) {
      console.error('[update] Error processing contact:', error);
      failed.push({ name: fullName, error: error.message });
    }
  }

  const result = {
    matched: matched.length,
    updated: updated.length,
    created: created.length,
    failed: failed.length,
    tags,
    failedDetails: failed,
  };

  console.log('[update] Complete:', result);

  return new Response(JSON.stringify({ result }), { status: 200, headers: jsonHeaders });
}

function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n').filter(line => line.trim());
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current.trim());
    result.push(row);
  }

  return result;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
