/**
 * Bulk register and index all repositories from a GitHub organization.
 *
 * Usage:
 *   npm run sync:org
 *   npm run sync:org -- --org sjinnovation
 *   npm run sync:org -- --register-only
 *   npm run sync:org -- --index-only
 *   npm run sync:org -- --force
 */
import "dotenv/config";
import { getSupabase } from "../src/knowledge/supabase.js";
import { indexRepository } from "../src/ingestion/repo-indexer.js";

const DEFAULT_ORG = "sjinnovation";

interface GitHubRepo {
  name: string;
  html_url: string;
  default_branch: string;
  archived: boolean;
  disabled: boolean;
  private: boolean;
  topics?: string[];
  description?: string | null;
}

function parseArgs(argv: string[]) {
  return {
    org: argv.find((_, i, arr) => arr[i - 1] === "--org") ?? process.env.GITHUB_ORG ?? DEFAULT_ORG,
    registerOnly: argv.includes("--register-only"),
    indexOnly: argv.includes("--index-only"),
    force: argv.includes("--force"),
    delayMs: Number(argv.find((_, i, arr) => arr[i - 1] === "--delay") ?? 500),
  };
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "sji-org-memory-bulk-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;

}

async function fetchOrgRepos(org: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const url =
      `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=100&page=${page}&type=all&sort=updated`;
    const res = await fetch(url, { headers: githubHeaders() });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const batch = (await res.json()) as GitHubRepo[];
    if (batch.length === 0) break;

    repos.push(...batch);
    console.log(`  Fetched page ${page}: ${batch.length} repos (total ${repos.length})`);

    if (batch.length < 100) break;
    page += 1;
    await sleep(300);
  }

  return repos.filter((repo) => !repo.archived && !repo.disabled);
}

async function resolveCreatedBy(supabase: ReturnType<typeof getSupabase>): Promise<string> {
  const configured = process.env.ORG_MEMORY_CREATED_BY?.trim();
  if (configured) return configured;

  const { data: adminRole, error: roleError } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();

  if (!roleError && adminRole?.user_id) {
    return adminRole.user_id as string;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (profileError || !profile?.id) {
    throw new Error(
      "No profile found for created_by. Set ORG_MEMORY_CREATED_BY in .env to a valid profiles.id UUID.",
    );
  }

  return profile.id as string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerRepos(
  supabase: ReturnType<typeof getSupabase>,
  repos: GitHubRepo[],
  createdBy: string,
): Promise<{ registered: number; skipped: number; failed: number }> {
  let registered = 0;
  let skipped = 0;
  let failed = 0;

  for (const repo of repos) {
    const tags = [...new Set(repo.topics ?? [])];

    const { data: existing } = await supabase
      .from("org_repositories")
      .select("id, url")
      .eq("url", repo.html_url)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("org_repositories")
        .update({
          name: repo.name,
          default_branch: repo.default_branch || "main",
          tags,
          is_active: true,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error(`  ✗ update ${repo.name}: ${updateError.message}`);
        failed += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const { error: insertError } = await supabase.from("org_repositories").insert({
      name: repo.name,
      url: repo.html_url,
      default_branch: repo.default_branch || "main",
      provider: "github",
      tags,
      created_by: createdBy,
      index_status: "pending",
      metadata: {
        github_private: repo.private,
        github_description: repo.description ?? null,
        synced_from_org: true,
      },
    });

    if (insertError) {
      console.error(`  ✗ register ${repo.name}: ${insertError.message}`);
      failed += 1;
    } else {
      registered += 1;
      console.log(`  + registered ${repo.name}`);
    }
  }

  return { registered, skipped, failed };
}

async function indexAllRepos(
  supabase: ReturnType<typeof getSupabase>,
  force: boolean,
  delayMs: number,
): Promise<{ success: number; failed: number; skipped: number }> {
  const { data: repos, error } = await supabase
    .from("org_repositories")
    .select("id, name, index_status")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  let success = 0;
  let failed = 0;
  let skipped = 0;
  const total = repos?.length ?? 0;

  for (let i = 0; i < total; i += 1) {
    const repo = repos![i];
    if (!force && repo.index_status === "success") {
      skipped += 1;
      continue;
    }

    console.log(`[${i + 1}/${total}] Indexing ${repo.name}...`);
    const result = await indexRepository({ repositoryId: repo.id });

    if (result.status === "success") {
      success += 1;
      console.log(`  ✓ ${repo.name} (${result.chunksCreated} chunks)`);
    } else {
      failed += 1;
      console.error(`  ✗ ${repo.name}: ${result.errorMessage ?? "failed"}`);
    }

    if (i < total - 1) await sleep(delayMs);
  }

  return { success, failed, skipped };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const org = args.org;

  if (!process.env.GITHUB_TOKEN) {
    console.warn("Warning: GITHUB_TOKEN not set — private repos may be missing and rate limits apply.");
  }
  if (!process.env.OPENAI_API_KEY && !process.env.LOVABLE_API_KEY) {
    throw new Error("OPENAI_API_KEY or LOVABLE_API_KEY required for embeddings.");
  }

  const supabase = getSupabase();
  const createdBy = await resolveCreatedBy(supabase);

  console.log(`\n=== GitHub org bulk sync: ${org} ===\n`);

  if (!args.indexOnly) {
    console.log("Step 1: Fetching repositories from GitHub...");
    const ghRepos = await fetchOrgRepos(org);
    console.log(`Found ${ghRepos.length} active repositories.\n`);

    console.log("Step 2: Registering in org_repositories...");
    const reg = await registerRepos(supabase, ghRepos, createdBy);
    console.log(
      `\nRegistration complete: ${reg.registered} new, ${reg.skipped} updated/existing, ${reg.failed} failed.\n`,
    );
  }

  if (!args.registerOnly) {
    console.log("Step 3: Indexing repositories...");
    const idx = await indexAllRepos(supabase, args.force, args.delayMs);
    console.log(
      `\nIndexing complete: ${idx.success} success, ${idx.skipped} skipped (already indexed), ${idx.failed} failed.`,
    );
  }

  console.log("\nDone.\n");
}

main().catch((error) => {
  console.error("\nBulk sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
