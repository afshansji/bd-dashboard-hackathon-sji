import { useMemo, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { StagePipelineTable } from "@/components/bd/StagePipelineTable";
import { SyncControlTowerButton } from "@/components/bd/SyncControlTowerButton";
import { LastSyncDetails } from "@/components/bd/LastSyncDetails";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExaIntegration } from "@/hooks/useExaIntegration";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export default function Prospecting() {
  const { hasPermission } = useUserPermissions();
  const canImportFromExa = useMemo(
    () =>
      hasPermission(["exa", "exa_integration", "exa_leads", "bd_exa", "lead_exa"], "create") ||
      hasPermission(/exa/i, "create"),
    [hasPermission],
  );
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [industries, setIndustries] = useState("");
  const [locations, setLocations] = useState("");
  const [limit, setLimit] = useState<number>(50);

  const { importFromExa, isImporting } = useExaIntegration();

  const handleImport = async () => {
    if (!query.trim()) {
      return;
    }

    try {
      await importFromExa({
        query: query.trim(),
        industries: industries
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        locations: locations
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        limit: limit || 50,
      });
      setDialogOpen(false);
    } catch (error) {
      // Error handled via toast in hook
      console.error("Failed to import from Exa", error);
    }
  };

  return (
    <div className="w-full px-6 md:px-8 lg:px-10 py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead</h1>
          <p className="text-muted-foreground">
            Initial outreach and qualification of potential opportunities
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canImportFromExa && (
            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                  <UploadCloud className="h-4 w-4" /> Import from Exa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import leads from Exa</DialogTitle>
                  <DialogDescription>
                    Provide a search query and optional filters to discover new leads. The import runs asynchronously and will
                    refresh once completed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="exa-query">Search query</Label>
                    <Input
                      id="exa-query"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="e.g. AI consultants in fintech"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exa-industries">Industries (comma separated)</Label>
                    <Input
                      id="exa-industries"
                      value={industries}
                      onChange={(event) => setIndustries(event.target.value)}
                      placeholder="Fintech, SaaS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exa-locations">Locations (comma separated)</Label>
                    <Input
                      id="exa-locations"
                      value={locations}
                      onChange={(event) => setLocations(event.target.value)}
                      placeholder="New York, Remote"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exa-limit">Result limit</Label>
                    <Input
                      id="exa-limit"
                      type="number"
                      min={1}
                      max={250}
                      value={limit}
                      onChange={(event) => setLimit(Number(event.target.value) || 0)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isImporting}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={isImporting || !query.trim()} className="gap-2">
                    {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Start import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <SyncControlTowerButton />
        </div>
      </div>

      <LastSyncDetails />

      <StagePipelineTable stage="prospecting" title="" description="" />
    </div>
  );
}

