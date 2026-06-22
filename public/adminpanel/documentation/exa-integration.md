# Exa Search Integration

_Last Updated: 2025-10-22_

## Integration Summary
Exa provides real-time web search and research synthesis that feeds the Business Development AI platform with verifiable, citation-backed insights. This documentation outlines how to connect the Exa API, expose the research tools in the admin panel, and align role-based permissions with the new search modules.

**Why it matters**
- Accelerates market research for pitch decks, campaign briefs, and discovery calls.
- Gives AI agents a trusted data layer for summarizing competitor activity.
- Centralizes research artifacts inside the admin documentation hub for later review.

## Key Capabilities
| Capability | Description |
| --- | --- |
| Research Workbench | Lets BD specialists compose Exa queries, filter by content type, and store snapshots tied to campaigns. |
| Intelligence Briefings | Produces AI-generated summaries that cite Exa results and surface in the Insights library. |
| Agent Assist | AI agents can request fresh research packets via Exa before drafting outreach material. |
| Audit Trail | All queries and saved snapshots are logged for compliance and knowledge transfer. |

## Architecture Overview
1. **Client UI** – The admin panel exposes an Exa Research tab (feature flagged) where users submit search prompts.
2. **Supabase Edge Function** – Requests are proxied through a dedicated edge function (`supabase/functions/exa-research/index.ts`) that signs requests with the Exa API key and enforces rate limits.
3. **Storage** – Structured results are stored in `exa_snapshots` (JSONB payloads) and linked to campaigns via `campaign_research_links`.
4. **AI Agents** – When `enableResearch` is toggled on an AI agent configuration, the agent fetches the latest Exa snapshot for its campaign context before composing an output.
5. **Logging** – Metadata about each query (requester, timestamp, prompt, result count) is written to `analytics_data` with `metric_name = 'exa_search'`.

```
Client UI → Supabase Edge Function → Exa API → Snapshot Storage → AI Agent Consumption
```

## Environment & Secrets
| Variable | Scope | Notes |
| --- | --- | --- |
| `EXA_API_KEY` | Supabase Edge Functions | **New.** Store as a Supabase secret (`supabase secrets set EXA_API_KEY=...`). The edge proxy reads it via `Deno.env.get`. |
| `VITE_EXA_API_KEY` | Vite client (optional) | Only required if the client makes direct calls during local development. Keep it unset in production builds. |
| `EXA_DEFAULT_COLLECTION` | Supabase Edge Functions | Optional override that scopes searches to a particular Exa collection or workspace. |

Ensure `.env.local` contains the Vite variables while Supabase secrets hold the server-side keys. Rotate keys quarterly and revoke any unused workspace tokens.

## Permissions Modules
Two new permission modules gate access to the Exa tooling:

| Module key | Purpose | Required routes |
| --- | --- | --- |
| `aiResearch` | Unlocks the Exa Research Workbench so users can run live searches and save snapshots. | `/adminpanel/intelligence/research` |
| `intelBriefings` | Grants read access to the AI-generated intelligence briefings sourced from Exa snapshots. | `/adminpanel/intelligence/briefings` |

Update the `user_permissions` table (and supporting admin UI) so that:
- **BD Strategists** receive both modules.
- **Sales reps** typically receive only `intelBriefings`.
- **Contract researchers** can be granted `aiResearch` without broader admin access.

For seed data or mocks, extend the `modules` object with the booleans above to keep parity across environments.

## Setup Checklist
1. **Provision API access** – Generate an Exa API key in the Exa dashboard and save it as `EXA_API_KEY`.
2. **Sync secrets** – Run `supabase secrets set EXA_API_KEY=... EXA_DEFAULT_COLLECTION=default` in each Supabase environment.
3. **Configure client env** – Add `VITE_EXA_API_KEY` (if needed) to `.env.local` for local testing; omit it from deployed builds.
4. **Deploy proxy** – Deploy `supabase/functions/exa-research` so all requests are routed through the signed proxy.
5. **Run migrations** – Apply the migration that creates `exa_snapshots` and `campaign_research_links` tables.
6. **Assign permissions** – Update relevant roles with the `aiResearch` and `intelBriefings` modules in `user_permissions`.
7. **Smoke test** – Use the curl recipe below to confirm the proxy returns data and logs an entry to `analytics_data`.

## Usage Walkthrough
1. Navigate to **AI & Automation → Exa Research** inside the admin panel.
2. Enter a target keyword, choose filters (date range, domain, result count), and submit.
3. Review the result list and mark relevant items to include in a snapshot.
4. Save the snapshot to a campaign or niche; the system stores raw JSON plus summary notes.
5. Trigger an AI briefing. The AI agent references the saved snapshot, generates a summary, and publishes it to the Briefings tab.

### Curl Smoke Test
```bash
curl \
  -X POST "https://<your-project-ref>.functions.supabase.co/exa-research" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "query": "AI in healthcare revenue forecasts 2025",
        "filters": { "country": "US", "published_after": "2024-01-01" },
        "limit": 5
      }'
```
Expected response: a JSON array of Exa documents with titles, URLs, snippet summaries, and Exa-provided citation metadata.

## Operational Notes
- **Rate limits:** The edge proxy queues concurrent searches and returns a `429` with retry headers when Exa quotas are exhausted.
- **Caching:** Snapshots older than 30 days are auto-archived to reduce noise in campaign dashboards.
- **Security:** The proxy strips user-supplied headers to prevent header injection and validates payload shape with Zod.
- **Monitoring:** Analytics entries tagged with `dimensions.integration = 'exa'` make it easy to build monitoring dashboards.

## Troubleshooting
| Symptom | Resolution |
| --- | --- |
| `401 Unauthorized` from proxy | Verify `EXA_API_KEY` is present in Supabase secrets and has not expired. |
| Empty result set | Adjust filters or confirm the Exa workspace has the necessary collections enabled. |
| Permissions error in UI | Confirm the logged-in user has `aiResearch` or `intelBriefings` modules set to `true` in `user_permissions`. |
| AI briefing lacks citations | Ensure the associated snapshot stored `source_url` and `source_title` fields; rerun the search if they were missing. |

## Related Documents
- [Logic & Functions](logic-and-functions.md) – Details on deploying and testing Supabase edge functions.
- [Campaigns](campaigns.md) – Shows how research insights tie back into campaign execution metrics.
- [Review Checklist](review-checklist.md) – Add Exa smoke tests to the release process to avoid regression.

With the Exa integration configured, BD teams can ground AI output in verifiable research while maintaining centralized governance over who can search, summarize, and publish intelligence.
