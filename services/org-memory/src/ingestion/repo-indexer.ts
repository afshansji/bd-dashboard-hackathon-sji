import { getSupabase } from "../knowledge/supabase.js";
import { chunkText, hashContent } from "./chunker.js";
import { embedText, embedTexts } from "./embeddings.js";
import {
  detectTechStack,
  fetchLatestCommitSha,
  fetchRepositoryFiles,
  parseGitHubUrl,
  resolveDefaultBranch,
  summarizeReadme,
} from "./github.js";

export interface IndexRepositoryInput {
  repositoryId: string;
  indexRunId?: string;
}

export interface IndexRepositoryResult {
  repositoryId: string;
  indexRunId: string;
  commitSha: string | null;
  chunksCreated: number;
  status: "success" | "failed";
  errorMessage?: string;
}

export async function indexRepository(
  input: IndexRepositoryInput,
): Promise<IndexRepositoryResult> {
  const supabase = getSupabase();
  const started = Date.now();

  const { data: repo, error: repoError } = await supabase
    .from("org_repositories")
    .select("*")
    .eq("id", input.repositoryId)
    .single();

  if (repoError || !repo) {
    throw new Error(`Repository not found: ${input.repositoryId}`);
  }

  let indexRunId = input.indexRunId;
  if (!indexRunId) {
    const { data: run, error: runError } = await supabase
      .from("org_index_runs")
      .insert({ repository_id: repo.id, status: "running" })
      .select("id")
      .single();
    if (runError || !run) throw runError ?? new Error("Failed to create index run");
    indexRunId = run.id;
  }

  if (!indexRunId) {
    throw new Error("Failed to resolve index run id");
  }

  await supabase
    .from("org_repositories")
    .update({ index_status: "running", index_error: null })
    .eq("id", repo.id);

  try {
    const gh = parseGitHubUrl(repo.url);
    if (!gh) {
      throw new Error(`Unsupported repository URL (GitHub only in Phase 1): ${repo.url}`);
    }

    const branch = repo.default_branch || (await resolveDefaultBranch(gh.owner, gh.repo));
    const commitSha = await fetchLatestCommitSha(gh.owner, gh.repo, branch);
    const files = await fetchRepositoryFiles(gh.owner, gh.repo, branch);

    if (files.length === 0) {
      throw new Error("No indexable files found (README, package.json, etc.)");
    }

    const techStack = detectTechStack(files);
    const summary = summarizeReadme(files) || repo.name;

    const summaryEmbedding = await embedText(summary);

    const { data: project, error: projectError } = await supabase
      .from("org_projects")
      .upsert(
        {
          repository_id: repo.id,
          name: repo.name,
          root_path: ".",
          summary,
          tech_stack: techStack,
          domain_tags: repo.tags ?? [],
          summary_embedding: summaryEmbedding,
          profile: {
            name: repo.name,
            summary,
            techStack,
            domainTags: repo.tags ?? [],
            keyFeatures: [],
            indexedFiles: files.map((f) => f.path),
          },
        },
        { onConflict: "repository_id,root_path" },
      )
      .select("id")
      .single();

    if (projectError || !project) {
      throw projectError ?? new Error("Failed to upsert project");
    }

    await supabase
      .from("org_knowledge_chunks")
      .delete()
      .eq("repository_id", repo.id);

    const chunkRows: Array<{
      repository_id: string;
      project_id: string;
      source_type: string;
      source_path: string;
      content: string;
      content_hash: string;
      chunk_index: number;
      embedding: number[] | null;
      token_count: number;
      metadata: Record<string, unknown>;
    }> = [];

    for (const file of files) {
      const parts = chunkText(file.content);
      parts.forEach((content, chunkIndex) => {
        chunkRows.push({
          repository_id: repo.id,
          project_id: project.id,
          source_type: file.sourceType,
          source_path: file.path,
          content,
          content_hash: hashContent(`${file.path}:${content}`),
          chunk_index: chunkIndex,
          embedding: null,
          token_count: Math.ceil(content.length / 4),
          metadata: { branch, commitSha },
        });
      });
    }

    const embeddings = await embedTexts(chunkRows.map((r) => r.content));
    chunkRows.forEach((row, i) => {
      if (embeddings[i]?.length) row.embedding = embeddings[i];
    });

    const { error: insertError } = await supabase
      .from("org_knowledge_chunks")
      .insert(chunkRows);

    if (insertError) throw insertError;

    await supabase
      .from("org_repositories")
      .update({
        index_status: "success",
        last_indexed_commit: commitSha,
        last_indexed_at: new Date().toISOString(),
        index_error: null,
      })
      .eq("id", repo.id);

    await supabase
      .from("org_index_runs")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        commit_sha: commitSha,
        chunks_created: chunkRows.length,
        telemetry: {
          durationMs: Date.now() - started,
          filesIndexed: files.length,
          branch,
        },
      })
      .eq("id", indexRunId);

    return {
      repositoryId: repo.id,
      indexRunId,
      commitSha,
      chunksCreated: chunkRows.length,
      status: "success",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexing failed";

    await supabase
      .from("org_repositories")
      .update({ index_status: "failed", index_error: message })
      .eq("id", repo.id);

    await supabase
      .from("org_index_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message,
        telemetry: { durationMs: Date.now() - started },
      })
      .eq("id", indexRunId);

    return {
      repositoryId: repo.id,
      indexRunId,
      commitSha: null,
      chunksCreated: 0,
      status: "failed",
      errorMessage: message,
    };
  }
}
