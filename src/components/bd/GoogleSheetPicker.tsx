import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleSheetPickerProps {
  onSheetSelected: (sheet: { id: string; name: string; url: string }, data: string[][]) => void;
}

export function GoogleSheetPicker({ onSheetSelected }: GoogleSheetPickerProps) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL");
      return;
    }

    // Extract sheet ID from URL
    const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      setError("Invalid Google Sheets URL. Please provide a valid shareable link.");
      return;
    }

    const sheetId = sheetIdMatch[1];

    // Extract gid (tab ID) from URL if present - can be in fragment (#gid=) or query (?gid= or &gid=)
    const gidMatch = sheetUrl.match(/[#?&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : undefined;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('campaign-google-sheet-import', {
        body: {
          action: 'fetch',
          sheetId,
          sheetUrl,
          gid,
        },
      });

      if (fetchError) throw fetchError;

      if (!data.sheetData || data.sheetData.length === 0) {
        throw new Error('Sheet is empty or could not be read');
      }

      onSheetSelected(
        {
          id: sheetId,
          name: data.sheetName || 'Untitled Sheet',
          url: sheetUrl,
        },
        data.sheetData
      );
    } catch (err: any) {
      console.error('Error fetching sheet:', err);
      setError(err.message || 'Failed to fetch Google Sheet. Make sure the sheet is shared publicly or "Anyone with the link can view".');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sheet-url">Google Sheets URL</Label>
        <div className="flex gap-2">
          <Input
            id="sheet-url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => {
              setSheetUrl(e.target.value);
              setError(null);
            }}
            disabled={isLoading}
          />
          <Button onClick={handleFetchSheet} disabled={isLoading || !sheetUrl.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Load Sheet
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Make sure your Google Sheet is shared as "Anyone with the link can view"
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          <strong>How to share your sheet:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Open your Google Sheet</li>
            <li>Click "Share" in the top-right corner</li>
            <li>Click "Anyone with the link" and set to "Viewer"</li>
            <li>Copy the sheet URL and paste it above</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
