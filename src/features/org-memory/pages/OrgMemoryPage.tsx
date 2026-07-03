import { useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Database, Search, RefreshCw } from "lucide-react";
import {
  useCreateOrgRepository,
  useOrgMemoryQuery,
  useOrgRepositories,
  useTriggerOrgIndex,
} from "../hooks/useOrgMemory";

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "success") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

export function OrgMemoryPage() {
  const { data: repos, isLoading, refetch } = useOrgRepositories();
  const createRepo = useCreateOrgRepository();
  const triggerIndex = useTriggerOrgIndex();
  const queryMemory = useOrgMemoryQuery();

  const [query, setQuery] = useState(
    "What technologies and projects are in our repositories?",
  );
  const [repoName, setRepoName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [result, setResult] = useState<
    Awaited<ReturnType<typeof queryMemory.mutateAsync>> | null
  >(null);

  const handleSearch = async () => {
    const data = await queryMemory.mutateAsync({
      query,
      capabilities: [
        "repository_discovery",
        "project_understanding",
        "knowledge_retrieval",
      ],
    });
    setResult(data);
  };

  const handleAddRepo = async (e?: FormEvent) => {
    e?.preventDefault();
    await createRepo.mutateAsync({
      name: repoName,
      url: repoUrl,
      defaultBranch: "main",
    });
    setRepoName("");
    setRepoUrl("");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-2 text-primary">
            <Database className="h-6 w-6" />
            <span className="text-sm font-medium uppercase tracking-wide">
              Organizational Memory
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Project Knowledge Search
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Register GitHub repositories, index README and config files, then
            search across company project knowledge.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search knowledge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              placeholder="Ask about tech stack, projects, capabilities..."
            />
            <Button
              onClick={handleSearch}
              disabled={queryMemory.isPending || query.length < 3}
            >
              {queryMemory.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>

            {queryMemory.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Query failed</AlertTitle>
                <AlertDescription>
                  {(queryMemory.error as Error).message}
                </AlertDescription>
              </Alert>
            ) : null}

            {result?.error ? (
              <Alert variant="destructive">
                <AlertTitle>Service unavailable</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : null}

            {result?.discovery?.repos?.length ? (
              <div className="space-y-2">
                <h3 className="font-medium">Discovered repositories</h3>
                {result.discovery.repos.map((repo) => (
                  <div key={repo.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{repo.name}</div>
                    <a
                      href={repo.url}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {repo.url}
                    </a>
                  </div>
                ))}
              </div>
            ) : null}

            {result?.projects?.length ? (
              <div className="space-y-2">
                <h3 className="font-medium">Project profiles</h3>
                {result.projects.map((p) => (
                  <div key={p.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{p.name}</div>
                    <p className="text-muted-foreground">{p.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.techStack.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {result?.answer ? (
              <div className="space-y-2">
                <h3 className="font-medium">Answer</h3>
                <p className="rounded-md border bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.answer.text}
                </p>
                {result.answer.citations.length > 0 ? (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">
                      {result.answer.citations.length} source
                      {result.answer.citations.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-2 space-y-1">
                      {result.answer.citations.map((c) => (
                        <div key={c.chunkId}>
                          {c.sourcePath}: {c.excerpt.slice(0, 120)}...
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Repositories</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleAddRepo}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repo-name">Name</Label>
                <Input
                  id="repo-name"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="patient-portal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repo-url">GitHub URL</Label>
                <Input
                  id="repo-url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={
                createRepo.isPending || !repoName.trim() || !repoUrl.trim()
              }
            >
              {createRepo.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Register repository
            </Button>
            </form>

            {createRepo.isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {(createRepo.error as Error).message}
                </AlertDescription>
              </Alert>
            ) : null}

            {createRepo.isSuccess ? (
              <Alert>
                <AlertDescription>
                  {(createRepo.data as { _existing?: boolean } | undefined)?._existing
                    ? "Repository already registered. Click Index below to ingest it."
                    : (
                      <>
                        Repository saved. Click <strong>Index</strong> below to ingest
                        README and config files (org-memory service must run on port
                        3100).
                      </>
                    )}
                </AlertDescription>
              </Alert>
            ) : null}

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading repositories...
              </div>
            ) : null}

            <div className="space-y-2">
              {(repos ?? []).map((repo) => (
                <div
                  key={repo.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{repo.name}</div>
                    <div className="text-muted-foreground">{repo.url}</div>
                    {repo.index_error ? (
                      <div className="text-destructive">{repo.index_error}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(repo.index_status)}>
                      {repo.index_status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={triggerIndex.isPending}
                      onClick={() => triggerIndex.mutate(repo.id)}
                    >
                      Index
                    </Button>
                  </div>
                </div>
              ))}
              {!isLoading && (repos ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No repositories registered yet.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
