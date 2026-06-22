import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { encodeBase64, decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

interface DealInput {
  dealId: string;
  driveFolderId: string;
  controlTowerDealId?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  createdTime?: string;
  md5Checksum?: string;
  size?: string;
}

interface SyncSummary {
  dealId: string;
  driveFolderId: string;
  filesProcessed: number;
  filesUploaded: number;
  filesSkipped: number;
  errors: string[];
  status?: 'success' | 'error';
}

interface GoogleServiceAccount {
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
}

type ConversionResult = {
  payload: Record<string, unknown>;
  parser: "base64" | "google-docs-text-export" | "google-sheets-csv-export" | "google-slides-text-export";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const googleKey = Deno.env.get("GOOGLE_DRIVE_API_KEY") ?? undefined;
    const googleJson = Deno.env.get("GOOGLE_DRIVE_JSON");

    console.log("[Deal Files] Checking for Google Drive credentials...");
    console.log("[Deal Files] GOOGLE_DRIVE_JSON present:", !!googleJson);
    
    if (!googleJson) {
      throw new Error("Google Drive service account JSON is not configured");
    }

    const serviceAccount = parseServiceAccount(googleJson);

    // Handle test connection requests
    const bodyText = await req.text();
    if (bodyText) {
      try {
        const parsed = JSON.parse(bodyText);
        if (parsed.action === 'test-connection') {
          try {
            await getGoogleAccessToken(serviceAccount);
            return new Response(
              JSON.stringify({ 
                ok: true, 
                message: "Service account authenticated successfully" 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (error) {
            return new Response(
              JSON.stringify({ 
                ok: false, 
                error: error instanceof Error ? error.message : "Authentication failed"
              }),
              { 
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        }
      } catch (_parseError) {
        // Not JSON or no action field, continue with normal processing
      }
    }

    const deals = await parseRequest(new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyText || null,
    }));

    if (deals.length === 0) {
      throw new Error("Request body must include at least one deal to sync");
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const summaries: SyncSummary[] = [];

    for (const deal of deals) {
      const summary: SyncSummary = {
        dealId: deal.dealId,
        driveFolderId: deal.driveFolderId,
        filesProcessed: 0,
        filesUploaded: 0,
        filesSkipped: 0,
        errors: [],
      };

      if (!deal.driveFolderId) {
        summary.errors.push("Missing driveFolderId for deal");
        summaries.push(summary);
        continue;
      }

      try {
        console.log(`[Deal Files] Listing files for deal ${deal.dealId}, folder ${deal.driveFolderId}`);
        const driveFiles = await listFolderFiles(deal.driveFolderId, accessToken, googleKey);
        console.log(`[Deal Files] Found ${driveFiles.length} files in folder`);
        summary.filesProcessed = driveFiles.length;

        for (const file of driveFiles) {
          try {
            const fileBytes = await downloadDriveFile(file.id, file.mimeType, accessToken, googleKey);
            const conversion = await convertFileToJson(file, fileBytes);
            const storagePath = createStoragePath(deal.dealId, file);

            const uploadError = await uploadJsonToStorage(
              supabase as any,
              storagePath,
              {
                dealId: deal.dealId,
                controlTowerDealId: deal.controlTowerDealId ?? null,
                driveFolderId: deal.driveFolderId,
                file: {
                  id: file.id,
                  name: file.name,
                  mimeType: file.mimeType,
                  modifiedTime: file.modifiedTime ?? null,
                  createdTime: file.createdTime ?? null,
                  md5Checksum: file.md5Checksum ?? null,
                  size: file.size ? Number(file.size) : null,
                },
                payload: conversion.payload,
                parser: conversion.parser,
                syncedAt: new Date().toISOString(),
              },
            );

            if (uploadError) {
              summary.filesSkipped++;
              summary.errors.push(`Failed to upload ${file.name}: ${uploadError}`);
              continue;
            }

            const metadataError = await upsertMetadata(
              supabase as any,
              {
                deal_id: deal.dealId,
                client_id: null,
                drive_file_id: file.id,
                drive_folder_id: deal.driveFolderId,
                drive_file_name: file.name,
                drive_file_type: file.mimeType,
                storage_bucket_path: storagePath,
                json_snapshot_path: storagePath,
                drive_last_modified_at: file.modifiedTime ?? null,
                drive_created_at: file.createdTime ?? null,
                file_size: file.size ? Number(file.size) : null,
                checksum: file.md5Checksum ?? null,
              },
            );

            if (metadataError) {
              summary.filesSkipped++;
              summary.errors.push(`Failed to record metadata for ${file.name}: ${metadataError}`);
              continue;
            }

            summary.filesUploaded++;
          } catch (fileError) {
            const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
            summary.filesSkipped++;
            summary.errors.push(`Error processing ${file.name}: ${errorMessage}`);
            console.warn(`[Deal Files] Error processing file ${file.id}:`, fileError);
          }
        }
      } catch (folderError) {
        const errorMessage = folderError instanceof Error ? folderError.message : String(folderError);
        summary.errors.push(`Failed to enumerate folder: ${errorMessage}`);
        console.error(`[Deal Files] Failed to sync folder ${deal.driveFolderId}:`, folderError);
      }

      summaries.push(summary);
    }

    // Transform summaries to match frontend expectations
    const results = summaries.map(summary => ({
      dealId: summary.dealId,
      status: summary.errors.length === 0 ? 'success' : 'error',
      filesAdded: summary.filesUploaded,
      filesUpdated: 0,
      message: summary.errors.length === 0 
        ? `Successfully synced ${summary.filesUploaded} file(s)`
        : summary.errors.join('; '),
      errors: summary.errors,
    }));

    return new Response(
      JSON.stringify({ results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[Deal Files] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function parseRequest(req: Request): Promise<DealInput[]> {
  const bodyText = await req.text();
  if (!bodyText) {
    return [];
  }

  try {
    const parsed = JSON.parse(bodyText);

    if (Array.isArray(parsed)) {
      return normalizeDealInputArray(parsed);
    }

    const dealsField = (parsed as { deals?: unknown }).deals;
    if (Array.isArray(dealsField)) {
      return normalizeDealInputArray(dealsField);
    }

    const record = parsed as Record<string, unknown>;
    if (record && record.dealId && record.driveFolderId) {
      return normalizeDealInputArray([record]);
    }

    return [];
  } catch (_error) {
    throw new Error("Invalid JSON body supplied");
  }
}

function normalizeDealInputArray(values: unknown[]): DealInput[] {
  return values
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const record = value as Record<string, unknown>;
      const dealId = readStringField(record, ["dealId", "deal_id"]);
      const driveFolderId = readStringField(record, ["driveFolderId", "drive_folder_id"]);
      if (!dealId || !driveFolderId) {
        return null;
      }
      const controlTowerDealId = readStringField(record, ["controlTowerDealId", "control_tower_deal_id"]);
      const normalized: DealInput = controlTowerDealId
        ? { dealId, driveFolderId, controlTowerDealId }
        : { dealId, driveFolderId };
      return normalized;
    })
    .filter((value): value is DealInput => Boolean(value));
}

function readStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseServiceAccount(raw: string): GoogleServiceAccount {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Service account JSON must be an object");
    }
    return parsed as GoogleServiceAccount;
  } catch (_error) {
    try {
      const decoded = decodeBase64(raw.replace(/\s+/g, ""));
      const json = new TextDecoder().decode(decoded);
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Service account JSON must be an object");
      }
      return parsed as GoogleServiceAccount;
    } catch (decodeError) {
      throw new Error(`Failed to parse GOOGLE_DRIVE_JSON: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
    }
  }
}

async function getGoogleAccessToken(serviceAccount: GoogleServiceAccount): Promise<string> {
  const clientEmail = serviceAccount.client_email;
  const privateKey = serviceAccount.private_key;

  if (!clientEmail || !privateKey) {
    throw new Error("Service account JSON must include client_email and private_key");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const key = await importPrivateKey(privateKey);
  const encoder = new TextEncoder();
  const headerPayload = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(encoder.encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(headerPayload));
  const jwt = `${headerPayload}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Failed to obtain Google access token: ${tokenResponse.status} ${text}`);
  }

  const tokenJson = await tokenResponse.json();
  if (!tokenJson.access_token) {
    throw new Error("Google token response did not include access_token");
  }

  return tokenJson.access_token as string;
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  const cleaned = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const raw = decodeBase64(cleaned);
  return await crypto.subtle.importKey(
    "pkcs8",
    raw as any,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  return encodeBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function listFolderFiles(folderId: string, accessToken: string, apiKey?: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id,name,mimeType,modifiedTime,createdTime,md5Checksum,size)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    if (apiKey) {
      params.set("key", apiKey);
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      
      // Check for specific error types
      if (response.status === 403) {
        throw new Error(`Permission denied to access folder ${folderId}. Please check sharing settings and service account permissions.`);
      }
      if (response.status === 404) {
        throw new Error(`Folder ${folderId} not found. Please verify the folder ID is correct.`);
      }
      
      throw new Error(`Failed to list Drive files: ${response.status} ${text}`);
    }

    const json = await response.json();
    const pageFiles = (json.files ?? []) as DriveFile[];
    files.push(...pageFiles);
    pageToken = json.nextPageToken ?? undefined;
  } while (pageToken);

  // Note: Empty folders are valid - not an error condition
  return files;
}

async function downloadDriveFile(fileId: string, mimeType: string, accessToken: string, apiKey?: string): Promise<Uint8Array> {
  // Map Google Editor types to export formats (TEXT/CSV for AI)
  // null = skip these file types (not exportable as text)
  const googleExportFormats: Record<string, string | null> = {
    'application/vnd.google-apps.document': 'text/plain',       // Docs → Plain text
    'application/vnd.google-apps.spreadsheet': 'text/csv',      // Sheets → CSV
    'application/vnd.google-apps.presentation': 'text/plain',   // Slides → Plain text
    'application/vnd.google-apps.form': null,                   // Forms → Skip (not exportable)
    'application/vnd.google-apps.shortcut': null,               // Shortcuts → Skip
    'application/vnd.google-apps.folder': null,                 // Folders → Skip
  };

  let url: string;
  const keyParam = apiKey ? `&key=${apiKey}` : "";
  
  // Check if it's a Google Editor file that needs export
  if (googleExportFormats[mimeType] !== undefined) {
    const exportMimeType = googleExportFormats[mimeType];
    
    // Skip files that can't be exported as text
    if (exportMimeType === null) {
      throw new Error(`File type ${mimeType} cannot be exported (shortcut, folder, or form)`);
    }
    
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}${keyParam}`;
    console.log(`[Deal Files] Exporting Google Editor file ${fileId} as ${exportMimeType}`);
  } else {
    // Regular binary files (PDFs, images, etc.)
    url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${keyParam}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download/export Drive file ${fileId}: ${response.status} ${text}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function convertFileToJson(file: DriveFile, data: Uint8Array): Promise<ConversionResult> {
  const textDecoder = new TextDecoder('utf-8');
  
  // Handle Google Docs (exported as plain text)
  if (file.mimeType === 'application/vnd.google-apps.document') {
    const textContent = textDecoder.decode(data);
    return {
      parser: "google-docs-text-export",
      payload: {
        type: "text",
        source: "google_docs",
        content: textContent,
        characterCount: textContent.length,
        wordCount: textContent.split(/\s+/).filter(w => w.length > 0).length,
        metadata: {
          originalName: file.name,
          exportFormat: "text/plain",
          modifiedTime: file.modifiedTime
        }
      }
    };
  }
  
  // Handle Google Sheets (exported as CSV)
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    const csvContent = textDecoder.decode(data);
    const rows = csvContent.split('\n').filter(row => row.trim().length > 0);
    return {
      parser: "google-sheets-csv-export",
      payload: {
        type: "csv",
        source: "google_sheets",
        content: csvContent,
        rowCount: rows.length,
        columnCount: rows[0]?.split(',').length || 0,
        metadata: {
          originalName: file.name,
          exportFormat: "text/csv",
          modifiedTime: file.modifiedTime
        }
      }
    };
  }
  
  // Handle Google Slides (exported as plain text)
  if (file.mimeType === 'application/vnd.google-apps.presentation') {
    const textContent = textDecoder.decode(data);
    return {
      parser: "google-slides-text-export",
      payload: {
        type: "text",
        source: "google_slides",
        content: textContent,
        characterCount: textContent.length,
        metadata: {
          originalName: file.name,
          exportFormat: "text/plain",
          modifiedTime: file.modifiedTime
        }
      }
    };
  }

  // PDF text extraction via pdfjs-dist is unavailable in Edge Functions (requires native canvas).
  // Store PDFs as base64; downstream AI can process if needed.
  return {
    parser: "base64",
    payload: {
      type: "binary",
      mimeType: file.mimeType,
      data: encodeBase64(data),
    },
  };
}

function createStoragePath(dealId: string, file: DriveFile): string {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9-_.]+/g, "_");
  const timestamp = file.modifiedTime ?? file.createdTime ?? new Date().toISOString();
  const suffix = timestamp.replace(/[^0-9A-Za-z]/g, "");
  return `${dealId}/${sanitizedName}-${suffix}.json`;
}

async function uploadJsonToStorage(
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
  json: Record<string, unknown>,
): Promise<string | null> {
  const payload = JSON.stringify(json, null, 2);
  const file = new Blob([payload], { type: "application/json" });

  const { error } = await supabase
    .storage
    .from("deal-files")
    .upload(storagePath, file, {
      contentType: "application/json",
      upsert: true,
    });

  return error ? (error.message ?? "Unknown storage error") : null;
}

async function upsertMetadata(
  supabase: any,
  record: any,
): Promise<string | null> {
  const upsertRecord = { ...record };

  if (record.drive_file_id) {
    const { data: existing, error: existingError } = await supabase
      .from("deal_files")
      .select("id, category")
      .eq("drive_file_id", record.drive_file_id)
      .maybeSingle();

    if (existingError) {
      console.warn(
        `[Deal Files] Unable to fetch existing metadata for ${record.drive_file_id}:`,
        existingError,
      );
    }

    if (existing) {
      if (upsertRecord.category === undefined) {
        upsertRecord.category = existing.category ?? null;
      }
      if (existing.id) {
        upsertRecord.id = existing.id;
      }
    }
  }

  const { error } = await supabase
    .from("deal_files")
    .upsert(upsertRecord, { onConflict: "drive_file_id" });

  return error ? (error.message ?? "Unknown metadata error") : null;
}
