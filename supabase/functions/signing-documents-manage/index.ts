import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptSecret } from "../_shared/crypto.ts";
import { sendEmail } from "../_shared/notifications.ts";

const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1';

// ============================================================================
// TYPES
// ============================================================================

interface PandaDocIntegration {
  id: string;
  user_id: string;
  api_key_encrypted: string;
  workspace_id?: string;
  is_active: boolean;
}

interface CreateDocumentBody {
  documentType: 'sow' | 'nda';
  templateId: string;
  title: string;
  dealId?: string;
  clientId?: string;
  projectId?: string;
  recipients: Array<{
    email: string;
    firstName: string;
    lastName: string;
    role: 'signer' | 'approver' | 'cc';
    signingOrder: number;
  }>;
  mergeFields?: Record<string, any>;
  expiresInDays?: number;
  watchers?: Array<{
    userId: string;
    role: string;
  }>;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Extract endpoint from path
    // Format: /signing-documents-manage/[endpoint] or /signing-documents-manage/[id]/[action]
    const functionName = pathParts.find(p => p === 'signing-documents-manage');
    const functionIndex = pathParts.indexOf(functionName || '');
    const remainingPath = pathParts.slice(functionIndex + 1);

    const endpoint = remainingPath[0] || '';
    const documentId = remainingPath.length > 1 ? remainingPath[0] : undefined;
    const action = remainingPath.length > 1 ? remainingPath[1] : undefined;

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('No authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return errorResponse('Invalid user token', 401);
    }

    console.log(`[signing-documents] ${req.method} ${endpoint}${action ? '/' + action : ''} by ${user.id}`);

    // ========================================================================
    // ROUTES
    // ========================================================================

    // GET /templates - List templates by document type
    if (req.method === 'GET' && endpoint === 'templates') {
      return await handleGetTemplates(supabase, user.id, url);
    }

    // POST /create - Create new signing document
    if (req.method === 'POST' && endpoint === 'create') {
      const body = await req.json();
      return await handleCreateDocument(supabase, user.id, body);
    }

    // GET /list - List signing documents
    if (req.method === 'GET' && endpoint === 'list') {
      return await handleListDocuments(supabase, user.id, url);
    }

    // GET /:id - Get single document
    if (req.method === 'GET' && documentId && !action) {
      return await handleGetDocument(supabase, user.id, documentId);
    }

    // POST /:id/send - Send document for signatures
    if (req.method === 'POST' && documentId && action === 'send') {
      const body = await req.json().catch(() => ({}));
      return await handleSendDocument(supabase, user.id, documentId, body);
    }

    // POST /:id/resend - Resend to pending recipients
    if (req.method === 'POST' && documentId && action === 'resend') {
      return await handleResendDocument(supabase, user.id, documentId);
    }

    // POST /:id/void - Void document
    if (req.method === 'POST' && documentId && action === 'void') {
      const body = await req.json().catch(() => ({}));
      return await handleVoidDocument(supabase, user.id, documentId, body.reason);
    }

    // POST /:id/embed-session - Get embedded signing URL
    if (req.method === 'POST' && documentId && action === 'embed-session') {
      const body = await req.json();
      return await handleEmbedSession(supabase, user.id, documentId, body.recipientEmail);
    }

    // GET /:id/download - Download PDF or certificate
    if (req.method === 'GET' && documentId && action === 'download') {
      const type = url.searchParams.get('type') || 'pdf';
      return await handleDownload(supabase, user.id, documentId, type);
    }

    // GET /:id/activity - Get activity log
    if (req.method === 'GET' && documentId && action === 'activity') {
      return await handleGetActivity(supabase, user.id, documentId);
    }

    // POST /:id/recipients - Add recipient
    if (req.method === 'POST' && documentId && action === 'recipients') {
      const body = await req.json();
      return await handleAddRecipient(supabase, user.id, documentId, body);
    }

    // DELETE /:id/recipients/:recipientId - Remove recipient
    if (req.method === 'DELETE' && documentId && action === 'recipients') {
      const recipientId = remainingPath[2];
      return await handleRemoveRecipient(supabase, user.id, documentId, recipientId);
    }

    // POST /:id/watchers - Add watcher
    if (req.method === 'POST' && documentId && action === 'watchers') {
      const body = await req.json();
      return await handleAddWatcher(supabase, user.id, documentId, body);
    }

    // DELETE /:id/watchers/:watcherId - Remove watcher
    if (req.method === 'DELETE' && documentId && action === 'watchers') {
      const watcherId = remainingPath[2];
      return await handleRemoveWatcher(supabase, user.id, documentId, watcherId);
    }

    // POST /:id/duplicate - Duplicate document
    if (req.method === 'POST' && documentId && action === 'duplicate') {
      return await handleDuplicateDocument(supabase, user.id, documentId);
    }

    return errorResponse('Endpoint not found', 404);

  } catch (error) {
    console.error('[signing-documents] Error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});

// ============================================================================
// HANDLERS
// ============================================================================

async function handleGetTemplates(
  supabase: SupabaseClient,
  userId: string,
  url: URL
): Promise<Response> {
  const documentType = url.searchParams.get('documentType');

  const integration = await getPandaDocIntegration(supabase, userId);
  const templates = await fetchPandaDoc('/templates', integration.apiKey);

  // Filter templates by naming convention if documentType specified
  let filteredTemplates = templates.results || [];

  if (documentType) {
    const prefix = documentType.toUpperCase();
    filteredTemplates = filteredTemplates.filter((t: any) =>
      t.name.toUpperCase().includes(prefix) ||
      t.name.toUpperCase().includes(documentType === 'sow' ? 'STATEMENT OF WORK' : 'NON-DISCLOSURE') ||
      t.name.toUpperCase().includes(documentType === 'sow' ? 'SOW' : 'NDA')
    );
  }

  return jsonResponse({ ok: true, templates: filteredTemplates });
}

async function handleCreateDocument(
  supabase: SupabaseClient,
  userId: string,
  body: CreateDocumentBody
): Promise<Response> {
  const {
    documentType,
    templateId,
    title,
    dealId,
    clientId,
    projectId,
    recipients,
    mergeFields = {},
    expiresInDays = 30,
    watchers = [],
  } = body;

  // Validate required fields
  if (!documentType || !templateId || !title || !recipients || recipients.length === 0) {
    return errorResponse('Missing required fields: documentType, templateId, title, recipients', 400);
  }

  // Validate at least one signer
  const signers = recipients.filter(r => r.role === 'signer');
  if (signers.length === 0) {
    return errorResponse('At least one signer is required', 400);
  }

  const integration = await getPandaDocIntegration(supabase, userId);

  // Fetch deal and client data for merge fields
  let dealData: any = null;
  let clientData: any = null;

  if (dealId) {
    const { data } = await supabase
      .from('deals')
      .select('*, clients(*)')
      .eq('id', dealId)
      .single();
    dealData = data;
  }

  if (clientId) {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    clientData = data;
  }

  // Sort recipients by signing order
  const sortedRecipients = [...recipients].sort((a, b) => a.signingOrder - b.signingOrder);

  // Prepare PandaDoc recipients
  const pandadocRecipients = sortedRecipients.map((r, index) => ({
    email: r.email,
    first_name: r.firstName,
    last_name: r.lastName,
    role: r.role === 'cc' ? 'cc' : 'signer',
    signing_order: index + 1,
  }));

  // Build merge tokens
  const tokens = buildMergeTokens(dealData, clientData, mergeFields);

  // Create document in PandaDoc
  const pandadocDoc = await fetchPandaDoc('/documents', integration.apiKey, 'POST', {
    name: title,
    template_uuid: templateId,
    recipients: pandadocRecipients,
    tokens,
    metadata: {
      document_type: documentType,
      deal_id: dealId,
      client_id: clientId,
      project_id: projectId,
      created_by: userId,
    },
    settings: {
      allow_decline: true,
    },
  });

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Create signing document record
  const { data: document, error: insertError } = await supabase
    .from('signing_documents')
    .insert({
      document_type: documentType,
      title,
      template_id: templateId,
      deal_id: dealId,
      client_id: clientId,
      project_id: projectId,
      created_by: userId,
      pandadoc_doc_id: pandadocDoc.id,
      status: 'draft',
      expires_at: expiresAt.toISOString(),
      merge_fields: mergeFields,
      metadata: {
        pandadoc_name: pandadocDoc.name,
      },
    })
    .select()
    .single();

  if (insertError) {
    console.error('[signing-documents] Insert error:', insertError);
    return errorResponse('Failed to create document record', 500);
  }

  // Insert recipients
  const recipientInserts = sortedRecipients.map((r, index) => ({
    document_id: document.id,
    email: r.email,
    first_name: r.firstName,
    last_name: r.lastName,
    role: r.role,
    signing_order: index + 1,
    status: 'pending',
  }));

  await supabase.from('signing_document_recipients').insert(recipientInserts);

  // Insert watchers if provided
  if (watchers.length > 0) {
    const watcherInserts = watchers.map(w => ({
      document_id: document.id,
      user_id: w.userId,
      role: w.role,
    }));
    await supabase.from('signing_document_watchers').insert(watcherInserts);
  }

  // Log activity
  await logActivity(supabase, document.id, {
    action: 'created',
    actorType: 'user',
    actorId: userId,
    description: `${documentType.toUpperCase()} "${title}" created`,
    metadata: { template_id: templateId, recipient_count: recipients.length },
  });

  console.log(`[signing-documents] Created document ${document.id}`);

  return jsonResponse({ ok: true, document });
}

async function handleListDocuments(
  supabase: SupabaseClient,
  userId: string,
  url: URL
): Promise<Response> {
  const dealId = url.searchParams.get('dealId');
  const clientId = url.searchParams.get('clientId');
  const status = url.searchParams.get('status');
  const documentType = url.searchParams.get('documentType');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = supabase
    .from('signing_documents')
    .select(`
      *,
      deal:deals(id, title),
      client:clients(id, name),
      signing_document_recipients(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dealId) query = query.eq('deal_id', dealId);
  if (clientId) query = query.eq('client_id', clientId);
  if (status) query = query.eq('status', status);
  if (documentType) query = query.eq('document_type', documentType);

  const { data: documents, count, error } = await query;

  if (error) {
    console.error('[signing-documents] List error:', error);
    return errorResponse('Failed to list documents', 500);
  }

  return jsonResponse({ ok: true, documents, total: count });
}

async function handleGetDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<Response> {
  const { data: document, error } = await supabase
    .from('signing_documents')
    .select(`
      *,
      deal:deals(id, title),
      client:clients(id, name, email, company),
      signing_document_recipients(*),
      signing_document_watchers(*, user:profiles(id, full_name, email))
    `)
    .eq('id', documentId)
    .single();

  if (error || !document) {
    return errorResponse('Document not found', 404);
  }

  return jsonResponse({ ok: true, document });
}

async function handleSendDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  body: { message?: string; subject?: string }
): Promise<Response> {
  const { data: document, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*, signing_document_recipients(*)')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    return errorResponse('Document not found', 404);
  }

  if (document.status !== 'draft') {
    return errorResponse('Only draft documents can be sent', 400);
  }

  const integration = await getPandaDocIntegration(supabase, document.created_by);

  // Send document in PandaDoc
  await fetchPandaDoc(`/documents/${document.pandadoc_doc_id}/send`, integration.apiKey, 'POST', {
    message: body.message || 'Please review and sign this document',
    subject: body.subject || `${document.document_type.toUpperCase()}: ${document.title}`,
    silent: false,
  });

  const now = new Date().toISOString();

  // Update document status
  await supabase
    .from('signing_documents')
    .update({
      status: 'sent',
      sent_at: now,
    })
    .eq('id', documentId);

  // Update recipients status
  await supabase
    .from('signing_document_recipients')
    .update({ status: 'sent' })
    .eq('document_id', documentId);

  // Log activity
  await logActivity(supabase, documentId, {
    action: 'sent',
    actorType: 'user',
    actorId: userId,
    description: `Document sent to ${document.signing_document_recipients.length} recipient(s)`,
  });

  // Notify watchers
  await notifyWatchers(supabase, documentId, 'sent');

  return jsonResponse({ ok: true });
}

async function handleResendDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<Response> {
  const { data: document, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*, signing_document_recipients(*)')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    return errorResponse('Document not found', 404);
  }

  if (!['sent', 'viewed'].includes(document.status)) {
    return errorResponse('Document must be sent or viewed to resend', 400);
  }

  const pendingRecipients = document.signing_document_recipients.filter(
    (r: any) => ['pending', 'sent', 'viewed'].includes(r.status)
  );

  if (pendingRecipients.length === 0) {
    return errorResponse('No pending recipients to resend to', 400);
  }

  const integration = await getPandaDocIntegration(supabase, document.created_by);

  // Resend via PandaDoc
  await fetchPandaDoc(`/documents/${document.pandadoc_doc_id}/send`, integration.apiKey, 'POST', {
    message: 'Reminder: Please review and sign this document',
    silent: false,
  });

  // Log activity
  await logActivity(supabase, documentId, {
    action: 'resent',
    actorType: 'user',
    actorId: userId,
    description: `Reminder sent to ${pendingRecipients.length} pending recipient(s)`,
  });

  return jsonResponse({ ok: true, resentTo: pendingRecipients.length });
}

async function handleVoidDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  reason?: string
): Promise<Response> {
  const { data: document, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    return errorResponse('Document not found', 404);
  }

  // Can only void draft, sent, or viewed documents
  if (!['draft', 'sent', 'viewed'].includes(document.status)) {
    return errorResponse('Cannot void completed, declined, or already voided documents', 400);
  }

  // Try to delete from PandaDoc (soft failure)
  if (document.pandadoc_doc_id && document.status !== 'draft') {
    try {
      const integration = await getPandaDocIntegration(supabase, document.created_by);
      await fetchPandaDoc(`/documents/${document.pandadoc_doc_id}`, integration.apiKey, 'DELETE');
    } catch (error) {
      console.error('[signing-documents] PandaDoc void failed (non-fatal):', error);
    }
  }

  const now = new Date().toISOString();

  // Update document
  await supabase
    .from('signing_documents')
    .update({
      status: 'voided',
      voided_at: now,
      metadata: { ...document.metadata, void_reason: reason },
    })
    .eq('id', documentId);

  // Log activity
  await logActivity(supabase, documentId, {
    action: 'voided',
    actorType: 'user',
    actorId: userId,
    description: reason ? `Document voided: ${reason}` : 'Document voided',
  });

  // Notify watchers
  await notifyWatchers(supabase, documentId, 'voided');

  return jsonResponse({ ok: true });
}

async function handleEmbedSession(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  recipientEmail: string
): Promise<Response> {
  if (!recipientEmail) {
    return errorResponse('recipientEmail is required', 400);
  }

  const { data: document, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*, signing_document_recipients(*)')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    return errorResponse('Document not found', 404);
  }

  if (!['sent', 'viewed'].includes(document.status)) {
    return errorResponse('Document must be sent before signing', 400);
  }

  // Find recipient
  const recipient = document.signing_document_recipients.find(
    (r: any) => r.email.toLowerCase() === recipientEmail.toLowerCase()
  );

  if (!recipient) {
    return errorResponse('Recipient not found', 404);
  }

  // Check signing order - previous signers must be complete
  const previousSigners = document.signing_document_recipients.filter(
    (r: any) => r.signing_order < recipient.signing_order && r.role !== 'cc'
  );

  const allPreviousSigned = previousSigners.every((r: any) => r.status === 'signed');
  if (!allPreviousSigned) {
    return errorResponse('Waiting for previous signers to complete', 400);
  }

  const integration = await getPandaDocIntegration(supabase, document.created_by);

  // Create embedded session
  const session = await fetchPandaDoc(
    `/documents/${document.pandadoc_doc_id}/session`,
    integration.apiKey,
    'POST',
    {
      recipient: recipientEmail,
      lifetime: 3600, // 1 hour
    }
  );

  // Update session ID
  await supabase
    .from('signing_documents')
    .update({ pandadoc_session_id: session.id })
    .eq('id', documentId);

  return jsonResponse({
    ok: true,
    sessionUrl: session.url,
    expiresAt: session.expires_at,
  });
}

async function handleDownload(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  type: string
): Promise<Response> {
  const { data: document, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    return errorResponse('Document not found', 404);
  }

  const urlField = type === 'certificate' ? 'certificate_url' : 'pdf_url';
  const storagePath = document[urlField];

  if (!storagePath) {
    return errorResponse(`${type === 'certificate' ? 'Certificate' : 'PDF'} not available`, 404);
  }

  // Get signed URL from storage
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('deal-files')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (urlError || !signedUrl) {
    return errorResponse('Failed to generate download URL', 500);
  }

  // Log download
  await logActivity(supabase, documentId, {
    action: 'downloaded',
    actorType: 'user',
    actorId: userId,
    description: `${type === 'certificate' ? 'Certificate' : 'PDF'} downloaded`,
  });

  return jsonResponse({ ok: true, url: signedUrl.signedUrl });
}

async function handleGetActivity(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<Response> {
  const { data: activities, error } = await supabase
    .from('signing_document_activity_log')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) {
    return errorResponse('Failed to fetch activity log', 500);
  }

  return jsonResponse({ ok: true, activities });
}

async function handleAddRecipient(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  body: { email: string; firstName: string; lastName: string; role: string; signingOrder: number }
): Promise<Response> {
  const { data: document, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    return errorResponse('Document not found', 404);
  }

  if (document.status !== 'draft') {
    return errorResponse('Can only add recipients to draft documents', 400);
  }

  const { data: recipient, error: insertError } = await supabase
    .from('signing_document_recipients')
    .insert({
      document_id: documentId,
      email: body.email,
      first_name: body.firstName,
      last_name: body.lastName,
      role: body.role,
      signing_order: body.signingOrder,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    return errorResponse('Failed to add recipient', 500);
  }

  await logActivity(supabase, documentId, {
    action: 'recipient_added',
    actorType: 'user',
    actorId: userId,
    description: `Recipient added: ${body.email}`,
  });

  return jsonResponse({ ok: true, recipient });
}

async function handleRemoveRecipient(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  recipientId: string
): Promise<Response> {
  const { data: document, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    return errorResponse('Document not found', 404);
  }

  if (document.status !== 'draft') {
    return errorResponse('Can only remove recipients from draft documents', 400);
  }

  const { data: recipient } = await supabase
    .from('signing_document_recipients')
    .select('email')
    .eq('id', recipientId)
    .single();

  await supabase
    .from('signing_document_recipients')
    .delete()
    .eq('id', recipientId);

  await logActivity(supabase, documentId, {
    action: 'recipient_removed',
    actorType: 'user',
    actorId: userId,
    description: `Recipient removed: ${recipient?.email || recipientId}`,
  });

  return jsonResponse({ ok: true });
}

async function handleAddWatcher(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  body: { userId: string; role: string }
): Promise<Response> {
  const { data: watcher, error } = await supabase
    .from('signing_document_watchers')
    .insert({
      document_id: documentId,
      user_id: body.userId,
      role: body.role,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      return errorResponse('User is already watching this document', 400);
    }
    return errorResponse('Failed to add watcher', 500);
  }

  await logActivity(supabase, documentId, {
    action: 'watcher_added',
    actorType: 'user',
    actorId: userId,
    description: `Watcher added (${body.role})`,
  });

  return jsonResponse({ ok: true, watcher });
}

async function handleRemoveWatcher(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  watcherId: string
): Promise<Response> {
  await supabase
    .from('signing_document_watchers')
    .delete()
    .eq('id', watcherId);

  await logActivity(supabase, documentId, {
    action: 'watcher_removed',
    actorType: 'user',
    actorId: userId,
    description: 'Watcher removed',
  });

  return jsonResponse({ ok: true });
}

async function handleDuplicateDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<Response> {
  const { data: original, error: fetchError } = await supabase
    .from('signing_documents')
    .select('*, signing_document_recipients(*)')
    .eq('id', documentId)
    .single();

  if (fetchError || !original) {
    return errorResponse('Document not found', 404);
  }

  // Create new document with same data
  const newTitle = `${original.title} (Copy)`;

  const integration = await getPandaDocIntegration(supabase, userId);

  // Prepare recipients for PandaDoc
  const pandadocRecipients = original.signing_document_recipients.map((r: any) => ({
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    role: r.role === 'cc' ? 'cc' : 'signer',
    signing_order: r.signing_order,
  }));

  // Create new document in PandaDoc
  const pandadocDoc = await fetchPandaDoc('/documents', integration.apiKey, 'POST', {
    name: newTitle,
    template_uuid: original.template_id,
    recipients: pandadocRecipients,
    tokens: buildMergeTokens(null, null, original.merge_fields),
    metadata: {
      document_type: original.document_type,
      deal_id: original.deal_id,
      client_id: original.client_id,
      duplicated_from: documentId,
    },
  });

  // Calculate new expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Create new document record
  const { data: newDocument, error: insertError } = await supabase
    .from('signing_documents')
    .insert({
      document_type: original.document_type,
      title: newTitle,
      template_id: original.template_id,
      deal_id: original.deal_id,
      client_id: original.client_id,
      project_id: original.project_id,
      created_by: userId,
      pandadoc_doc_id: pandadocDoc.id,
      status: 'draft',
      expires_at: expiresAt.toISOString(),
      merge_fields: original.merge_fields,
      metadata: { duplicated_from: documentId },
    })
    .select()
    .single();

  if (insertError) {
    return errorResponse('Failed to create duplicate', 500);
  }

  // Copy recipients
  const recipientInserts = original.signing_document_recipients.map((r: any) => ({
    document_id: newDocument.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    role: r.role,
    signing_order: r.signing_order,
    status: 'pending',
  }));

  await supabase.from('signing_document_recipients').insert(recipientInserts);

  // Log activity on new document
  await logActivity(supabase, newDocument.id, {
    action: 'created',
    actorType: 'user',
    actorId: userId,
    description: `Duplicated from document ${documentId}`,
  });

  return jsonResponse({ ok: true, document: newDocument });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getPandaDocIntegration(
  supabase: SupabaseClient,
  userId: string
): Promise<{ integration: PandaDocIntegration; apiKey: string }> {
  const { data, error } = await supabase
    .from('pandadoc_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    throw new Error('PandaDoc integration not configured. Please set up in Integration Manager.');
  }

  const apiKey = await decryptSecret(data.api_key_encrypted);
  if (!apiKey) {
    throw new Error('Failed to decrypt API key');
  }

  return { integration: data, apiKey };
}

async function fetchPandaDoc(
  endpoint: string,
  apiKey: string,
  method: string = 'GET',
  body?: any,
  retries: number = 3
): Promise<any> {
  const url = `${PANDADOC_API_BASE}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `API-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Rate limiting - retry with backoff
        if (response.status === 429 && attempt < retries) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          console.log(`[signing-documents] Rate limited, retrying in ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw new Error(`PandaDoc API error (${response.status}): ${errorText}`);
      }

      // Handle DELETE which returns no content
      if (response.status === 204) {
        return { success: true };
      }

      return response.json();
    } catch (error) {
      if (attempt === retries || !(error instanceof TypeError)) {
        throw error;
      }
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[signing-documents] Network error, retrying in ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Max retries exceeded');
}

function buildMergeTokens(
  dealData: any,
  clientData: any,
  customFields: Record<string, any>
): Array<{ name: string; value: string }> {
  const tokens: Array<{ name: string; value: string }> = [];

  // Client tokens
  if (clientData) {
    tokens.push(
      { name: 'Client.Name', value: clientData.name || clientData.contact_person || '' },
      { name: 'Client.Email', value: clientData.email || '' },
      { name: 'Client.Company', value: clientData.company || '' },
      { name: 'Client.Phone', value: clientData.phone || '' },
      { name: 'Client.Address', value: clientData.address || '' },
    );
  }

  // Deal tokens
  if (dealData) {
    tokens.push(
      { name: 'Deal.Title', value: dealData.title || '' },
      { name: 'Deal.Amount', value: dealData.amount?.toString() || '' },
      { name: 'Deal.Stage', value: dealData.stage || '' },
      { name: 'Deal.CloseDate', value: dealData.close_date || '' },
    );

    // Also include client from deal if not provided separately
    if (!clientData && dealData.clients) {
      tokens.push(
        { name: 'Client.Name', value: dealData.clients.name || '' },
        { name: 'Client.Email', value: dealData.clients.email || '' },
        { name: 'Client.Company', value: dealData.clients.company || '' },
      );
    }
  }

  // Custom merge fields
  for (const [key, value] of Object.entries(customFields)) {
    tokens.push({ name: key, value: String(value) });
  }

  // Add date tokens
  const now = new Date();
  tokens.push(
    { name: 'Date.Today', value: now.toLocaleDateString() },
    { name: 'Date.Year', value: now.getFullYear().toString() },
  );

  return tokens;
}

async function logActivity(
  supabase: SupabaseClient,
  documentId: string,
  data: {
    action: string;
    actorType: string;
    actorId?: string;
    actorEmail?: string;
    description?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }
): Promise<void> {
  try {
    await supabase.from('signing_document_activity_log').insert({
      document_id: documentId,
      action: data.action,
      actor_type: data.actorType,
      actor_id: data.actorId,
      actor_email: data.actorEmail,
      description: data.description,
      metadata: data.metadata || {},
      ip_address: data.ipAddress,
    });
  } catch (error) {
    console.error('[signing-documents] Failed to log activity:', error);
  }
}

async function notifyWatchers(
  supabase: SupabaseClient,
  documentId: string,
  event: 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'voided'
): Promise<void> {
  try {
    // Get document with watchers
    const { data: document } = await supabase
      .from('signing_documents')
      .select(`
        *,
        signing_document_watchers(*, user:profiles(email, full_name))
      `)
      .eq('id', documentId)
      .single();

    if (!document?.signing_document_watchers) return;

    const eventToPreference: Record<string, string> = {
      sent: 'notify_on_sent',
      viewed: 'notify_on_viewed',
      signed: 'notify_on_signed',
      declined: 'notify_on_declined',
      completed: 'notify_on_signed',
      voided: 'notify_on_declined',
    };

    const preference = eventToPreference[event];
    if (!preference) return;

    for (const watcher of document.signing_document_watchers) {
      if (!watcher[preference] || !watcher.user?.email) continue;

      const subject = getWatcherEmailSubject(event, document);
      const html = getWatcherEmailHtml(event, document, watcher.user.full_name);

      await sendEmail({
        to: watcher.user.email,
        subject,
        html,
      });
    }
  } catch (error) {
    console.error('[signing-documents] Failed to notify watchers:', error);
  }
}

function getWatcherEmailSubject(event: string, document: any): string {
  const docType = document.document_type.toUpperCase();
  const subjects: Record<string, string> = {
    sent: `${docType} Sent: ${document.title}`,
    viewed: `${docType} Viewed: ${document.title}`,
    signed: `Signature Complete: ${document.title}`,
    declined: `${docType} Declined: ${document.title}`,
    completed: `All Signatures Complete: ${document.title}`,
    voided: `${docType} Voided: ${document.title}`,
  };
  return subjects[event] || `${docType} Update: ${document.title}`;
}

function getWatcherEmailHtml(event: string, document: any, recipientName: string): string {
  const docType = document.document_type.toUpperCase();
  return `
    <h2>${docType} ${event.charAt(0).toUpperCase() + event.slice(1)}</h2>
    <p>Hello ${recipientName},</p>
    <p>The ${docType} document <strong>${document.title}</strong> has been ${event}.</p>
    <p style="color: #666; font-size: 12px; margin-top: 20px;">
      You are receiving this notification because you are watching this document.
    </p>
  `;
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
