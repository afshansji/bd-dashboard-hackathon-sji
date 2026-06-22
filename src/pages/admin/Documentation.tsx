import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Download } from "lucide-react";

import { DocumentationSearch } from "@/components/documentation/DocumentationSearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { documentationIndex, getCategoryById } from "@/lib/documentation";

const DOCUMENT_BASE_PATH = "/adminpanel/documentation/";
const PROJECT_NAME = "SJ Business Development AI Platform";

type DocContentState = {
  status: "loading" | "ready" | "error";
  content: string;
  error?: string;
};

export default function Documentation() {
  const orderedDocs = useMemo(() => documentationIndex.flatMap((category) => category.items), []);
  const [docStates, setDocStates] = useState<Record<string, DocContentState>>(() =>
    Object.fromEntries(
      orderedDocs.map((item) => [item.file, { status: "loading", content: "" } as DocContentState])
    )
  );
  const [activeDoc, setActiveDoc] = useState<string>(orderedDocs[0]?.file ?? "overview.md");

  useEffect(() => {
    let isMounted = true;

    orderedDocs.forEach((item) => {
      fetch(`${DOCUMENT_BASE_PATH}${item.file}`, { cache: "no-cache" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.text();
        })
        .then((text) => {
          if (!isMounted) return;
          setDocStates((prev) => ({
            ...prev,
            [item.file]: {
              status: "ready",
              content: text
            }
          }));
        })
        .catch((error: unknown) => {
          console.error(`Failed to load documentation ${item.file}`, error);
          if (!isMounted) return;
          setDocStates((prev) => ({
            ...prev,
            [item.file]: {
              status: "error",
              content: "",
              error: error instanceof Error ? error.message : String(error)
            }
          }));
        });
    });

    return () => {
      isMounted = false;
    };
  }, [orderedDocs]);

  useEffect(() => {
    if (!orderedDocs.some((doc) => doc.file === activeDoc)) {
      setActiveDoc(orderedDocs[0]?.file ?? "overview.md");
    }
  }, [orderedDocs, activeDoc]);

  const handleDownloadAll = () => {
    const isoTimestamp = new Date().toISOString();
    const dateStamp = isoTimestamp.split("T")[0];
    const header = `# ${PROJECT_NAME} Documentation\nLast Updated: ${isoTimestamp}\n\n`;
    const body = orderedDocs
      .map((item) => {
        const entry = docStates[item.file];
        let sectionContent = "";
        if (!entry || entry.status === "loading") {
          sectionContent = "> Loading content...";
        } else if (entry.status === "error") {
          sectionContent = `> ⚠️ Unable to load documentation (${entry.error ?? "Unknown error"}).`;
        } else {
          sectionContent = entry.content;
        }
        return `## ${item.title}\n\n${sectionContent}`;
      })
      .join("\n\n---\n\n");

    const blob = new Blob([header + body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sj-business-development-ai-platform_documentation_${dateStamp}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const activeDocMeta = orderedDocs.find((doc) => doc.file === activeDoc);
  const activeCategory = activeDocMeta ? getCategoryById(activeDocMeta.category) : undefined;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="text-muted-foreground">
            Centralized Markdown documentation surfaced directly in the Admin Panel.
          </p>
        </div>
        <Button onClick={handleDownloadAll} className="gap-2" variant="secondary">
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>📥 Download All Documentation</span>
        </Button>
      </div>

      <div className="max-w-xl">
        <DocumentationSearch onSelectDoc={setActiveDoc} currentDoc={activeDoc} />
      </div>

      <Tabs value={activeDoc} onValueChange={setActiveDoc} className="space-y-4">
        <TabsList className="flex w-full flex-wrap gap-2 rounded-lg bg-muted/40 p-1">
          {orderedDocs.map((item) => (
            <TabsTrigger
              key={item.file}
              value={item.file}
              className="rounded-md border border-transparent bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {item.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {orderedDocs.map((item) => {
          const state = docStates[item.file];
          const category = getCategoryById(item.category);
          const Icon = category?.icon;

          return (
            <TabsContent key={item.file} value={item.file} className="focus-visible:outline-none">
              <Card className="border-muted-foreground/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                    {item.title}
                  </CardTitle>
                  <CardDescription className="space-y-2 text-sm">
                    <p>{item.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {category ? <span>{category.title}</span> : null}
                      {item.lastUpdated ? <span>Last updated: {item.lastUpdated}</span> : null}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {state?.status === "loading" && (
                    <p className="text-sm text-muted-foreground">Loading documentation…</p>
                  )}
                  {state?.status === "error" && (
                    <p className="text-sm text-destructive">
                      Failed to load documentation. {state.error ? `(${state.error})` : ""}
                    </p>
                  )}
                  {state?.status === "ready" && (
                    <ReactMarkdown
                      className="prose prose-slate max-w-none dark:prose-invert"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {state.content}
                    </ReactMarkdown>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {activeDocMeta && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>
            Showing <strong>{activeDocMeta.title}</strong> from the {activeCategory?.title ?? "documentation"} section.
            Markdown files live at <code className="mx-1 rounded bg-background px-1 py-0.5">
              {DOCUMENT_BASE_PATH}
            </code>
            within the project’s <code className="mx-1 rounded bg-background px-1 py-0.5">public</code> directory.
          </p>
        </div>
      )}
    </div>
  );
}
