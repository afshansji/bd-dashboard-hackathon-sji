import { useEffect, useState } from "react";
import { Globe, Loader2, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidUrl } from "@/lib/urlUtils";
import {
  useCompanyIntelligence,
  useResearchCompany,
} from "@/hooks/useCompanyIntelligence";
import { CompanyIntelligenceReportView } from "./CompanyIntelligenceReportView";

interface CompanyWebsiteFieldProps {
  jobId: string;
  onResearchStart?: () => void;
  compact?: boolean;
}

export function CompanyWebsiteField({
  jobId,
  onResearchStart,
  compact = false,
}: CompanyWebsiteFieldProps) {
  const { data: cached, isLoading } = useCompanyIntelligence(jobId);
  const research = useResearchCompany(jobId);
  const [website, setWebsite] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (cached?.companyWebsite) {
      setWebsite(cached.companyWebsite);
    }
  }, [cached?.companyWebsite]);

  const handleResearch = async (force = false) => {
    const trimmed = website.trim();
    if (!trimmed) {
      setValidationError("Enter a company website URL");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setValidationError("Enter a valid website URL (e.g. https://company.com)");
      return;
    }

    setValidationError(null);
    onResearchStart?.();
    await research.mutateAsync({ companyWebsite: trimmed, force });
  };

  const report = cached?.report ?? null;
  const researchedAt = cached?.researchedAt ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Company Website</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add the prospect&apos;s website to generate a Company Intelligence Report.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-website" className="sr-only">
            Company Website
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="company-website"
                type="url"
                placeholder="https://company.com"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="pl-9"
                disabled={research.isPending}
              />
            </div>
            <Button
              onClick={() => void handleResearch(Boolean(report))}
              disabled={research.isPending || !website.trim()}
            >
              {research.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {report ? "Re-research Company" : "Research Company"}
            </Button>
          </div>
          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}
        </div>

        {research.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {research.error instanceof Error
                ? research.error.message
                : "Company research failed"}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading company research...
        </div>
      ) : null}

      {!compact && research.isPending ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Researching company and generating intelligence report...
        </div>
      ) : null}

      {!compact && !research.isPending && report ? (
        <CompanyIntelligenceReportView report={report} researchedAt={researchedAt} />
      ) : null}

      {compact && report && !research.isPending ? (
        <p className="text-sm text-muted-foreground">
          Company research available — open the Company tab to view the full report.
        </p>
      ) : null}
    </div>
  );
}
