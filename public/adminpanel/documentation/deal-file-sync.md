# Deal File Synchronization

The deal file synchronization pipeline mirrors supporting assets from Google Drive into the Business Development Portal. Each deal is paired with a Drive folder; attachments are normalized to JSON, stored in Supabase Storage, and tracked in the `deal_files` table for downstream analytics and search indexing.

## Google Drive Credentials

Add the following secrets to the Supabase Edge Function environment (locally they can be set in `.env` before running `supabase functions serve`):

| Variable | Description |
| --- | --- |
| `GOOGLE_DRIVE_API_KEY` | **Optional** API key that improves Drive quota usage. Requests are authenticated with OAuth, so this can be left blank if not provisioned. |
| `GOOGLE_DRIVE_JSON` | Service account JSON payload (either raw JSON or base64-encoded) with `drive.readonly` access to the folders that store deal attachments. |

> **Tip:** When pasting JSON into Supabase Edge Config, wrap it in quotes to preserve newlines or supply a base64-encoded variant. The new `sync-deal-files` function automatically detects both formats.

## Drive Folder Conventions

* Create a dedicated folder per Control Tower deal. Subfolders are supported but every top-level deal folder **must** be named using one of these patterns so the pipeline can map it back to a Control Tower record:
  * `<ControlTowerDealId> - <Deal Name>`
  * `<Deal Name> (Deal ID <ControlTowerDealId>)`
* Store the folder reference on the Control Tower deal (e.g., `google_drive_folder_id`, `drive_folder_id`, or similar). The Control Tower sync copies that identifier into each BD Portal deal record.
* Supported file types:
  * PDFs are parsed to page-level text using `pdfjs-dist` before being saved to storage.
  * Other formats (Word, Excel, images, etc.) are captured as base64 payloads so they can be reprocessed later.

## Triggering a Sync

### Manual Trigger

1. Run the main Control Tower pull: `supabase functions invoke sync-control-tower-deals --no-verify-jwt`.
2. After deals upsert, the function automatically calls `sync-deal-files`, passing the local deal ID and Drive folder reference.
3. To resync files for a specific deal without touching the full pipeline:

```bash
supabase functions invoke sync-deal-files \
  --no-verify-jwt \
  --body '{"dealId": "<bd_deal_uuid>", "driveFolderId": "<drive_folder_id>"}'
```

### Scheduling

* The hourly cron entry defined in `20251115090000_deal_detail_enhancements.sql` already executes `sync-control-tower-deals` using the service role key.
* Because the pull function now chains into `sync-deal-files`, no extra cron job is required. Ensure the Supabase project secrets include `GOOGLE_DRIVE_API_KEY`/`GOOGLE_DRIVE_JSON` so the chained call succeeds.

## Data Flow

1. `sync-control-tower-deals` upserts deals, collects each Control Tower folder ID, and invokes `sync-deal-files`.
2. `sync-deal-files` authenticates to Drive with the service account, enumerates every file inside the folder, and converts content to JSON (text for PDFs, base64 for other formats).
3. JSON payloads are uploaded to the `deal-files` storage bucket under `/<deal-id>/<filename>-<timestamp>.json`.
4. Metadata (file name, MIME type, checksum, folder reference, sync timestamp) is upserted into the `deal_files` table for querying.

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `Missing authorization header` | Ensure the caller supplies the Supabase service role key in the `Authorization` header. Internal calls handle this automatically. |
| `Google token response did not include access_token` | Confirm the service account JSON has the Drive API enabled and contains `client_email` / `private_key`. |
| Files skipped with `Failed to upload` errors | Check that the `deal-files` bucket exists and the service role key has storage permissions. The upload step uses `upsert: true`, so existing paths can be overwritten safely. |
| PDFs fall back to base64 | Some PDFs may be encrypted. The payload still lands in storage, but text extraction is skipped. |

Keeping folders tidy (no stray archives or extremely large binaries) ensures syncs remain fast and avoids hitting Drive download quotas.
