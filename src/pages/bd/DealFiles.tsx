import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight,
  FileText,
  RefreshCw,
  Loader2,
  FileCheck,
} from "lucide-react";
import { useDealFiles, type DealFile } from "@/hooks/useDealFiles";
import { useDealSystemInfo } from "@/hooks/useDealSystemInfo";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistance } from "date-fns";

interface Deal {
  id: string;
  title: string;
  stage: string;
  google_drive_folder_id: string | null;
}

const CATEGORY_OPTIONS = ["Proposal", "Meeting Files", "User Story", "Other"] as const;
const UNCATEGORIZED_VALUE = "uncategorized";

export default function DealFiles() {
  const { stage, slug } = useParams();
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [localFiles, setLocalFiles] = useState<DealFile[]>([]);
  const [updatingFileId, setUpdatingFileId] = useState<string | null>(null);

  // Extract deal ID from slug (last segment after last dash)
  const dealIdMatch = slug?.match(/([a-f0-9-]{36})$/);
  const dealId = dealIdMatch ? dealIdMatch[1] : null;

  const { files, loading: filesLoading, refetch: refetchFiles } = useDealFiles({
    dealId: dealId || undefined,
    enabled: !!dealId,
  });

  const { data: systemInfo } = useDealSystemInfo(dealId || "", deal?.title);

  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  // Fetch deal info
  useState(() => {
    const fetchDeal = async () => {
      if (!dealId) return;
      
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("id, title, stage, google_drive_folder_id")
          .eq("id", dealId)
          .single();

        if (error) throw error;
        setDeal(data);
      } catch (error) {
        console.error("Failed to fetch deal", error);
        toast({
          title: "Error",
          description: "Failed to load deal information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDeal();
  });

  const handleSync = async () => {
    if (!deal?.google_drive_folder_id) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-deal-files", {
        body: {
          deals: [{
            dealId: deal.id,
            driveFolderId: deal.google_drive_folder_id,
          }],
        },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (result?.status === "success") {
        toast({
          title: "Sync complete",
          description: `${result.filesAdded || 0} files added, ${result.filesUpdated || 0} updated`,
        });
        refetchFiles();
      } else {
        throw new Error(result?.error || "Sync failed");
      }
    } catch (error) {
      console.error("Sync failed", error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unable to sync Google Drive folder",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCategoryChange = async (file: DealFile, value: string) => {
    const nextCategory = value === UNCATEGORIZED_VALUE ? null : value;
    const previousCategory = file.category ?? null;

    setLocalFiles((prev) =>
      prev.map((current) =>
        current.id === file.id ? { ...current, category: nextCategory } : current
      )
    );
    setUpdatingFileId(file.id);

    const { error } = await supabase
      .from("deal_files")
      .update({ category: nextCategory })
      .eq("id", file.id);

    setUpdatingFileId(null);

    if (error) {
      setLocalFiles((prev) =>
        prev.map((current) =>
          current.id === file.id ? { ...current, category: previousCategory } : current
        )
      );
      toast({
        title: "Failed to update category",
        description: error.message ?? "Unable to update file category",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Category updated",
      description: nextCategory ? `Marked as ${nextCategory}` : "Category cleared",
    });

    await refetchFiles();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link to={`/${stage}`} className="capitalize hover:text-foreground">
              {stage}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/${stage}/${slug}`} className="hover:text-foreground">
              {deal?.title}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Files</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">Deal Files</h1>
              <p className="text-muted-foreground mt-1">
                Documents synced from Google Drive
              </p>
            </div>
            {deal?.google_drive_folder_id && (
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Synced Files ({localFiles.length})</CardTitle>
            <CardDescription>
              Files automatically synced from the linked Google Drive folder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : localFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No files synced yet
                </p>
                {deal?.google_drive_folder_id && (
                  <Button onClick={handleSync} disabled={syncing} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Files
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead>AI-Ready</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localFiles.map((file) => {
                    const isAIReady = file.metadata?.parser === 'pdfjs' || file.json_snapshot_path;
                    return (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-md">{file.drive_file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{file.drive_file_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={file.category ?? UNCATEGORIZED_VALUE}
                            onValueChange={(value) => handleCategoryChange(file, value)}
                          >
                            <SelectTrigger
                              className="w-[180px]"
                              disabled={updatingFileId === file.id}
                            >
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNCATEGORIZED_VALUE}>Uncategorized</SelectItem>
                              {CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {file.drive_last_modified_at
                            ? formatDistance(new Date(file.drive_last_modified_at), new Date(), {
                                addSuffix: true,
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {isAIReady ? (
                            <Badge variant="secondary" className="text-xs">
                              <FileCheck className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
