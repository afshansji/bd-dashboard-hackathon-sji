import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { getValidUrl, isValidUrl } from "@/lib/urlUtils";

interface CompanyDataDebugProps {
  contact: {
    contact_company?: string | null;
    company_website?: string | null;
    company_linkedin_url?: string | null;
    company_description?: string | null;
    company_industry?: string | null;
    company_size?: string | null;
    company_headquarters?: string | null;
    last_enriched_at?: string | null;
  };
}

export function CompanyDataDebug({ contact }: CompanyDataDebugProps) {
  const websiteIsValid = isValidUrl(contact.company_website);
  const validUrl = getValidUrl(contact.company_website);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Company Data Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">Company Name:</span>
            <span className="text-muted-foreground">
              {contact.contact_company || '❌ Not set'}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">Raw Website Value:</span>
            <code className="text-xs bg-white px-2 py-1 rounded">
              {contact.company_website ? `"${contact.company_website}"` : 'null'}
            </code>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">Website Valid:</span>
            {websiteIsValid ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Valid
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Invalid or Missing
              </Badge>
            )}
          </div>

          {validUrl && (
            <div className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Validated URL:</span>
              <a 
                href={validUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                {validUrl}
              </a>
            </div>
          )}

          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">Description:</span>
            <span className="text-muted-foreground text-xs">
              {contact.company_description ? '✅ Set' : '❌ Not set'}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">Industry:</span>
            <span className="text-muted-foreground">
              {contact.company_industry || '❌ Not set'}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">Size:</span>
            <span className="text-muted-foreground">
              {contact.company_size || '❌ Not set'}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">LinkedIn:</span>
            <span className="text-muted-foreground text-xs">
              {contact.company_linkedin_url ? '✅ Set' : '❌ Not set'}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-medium min-w-[140px]">Last Enriched:</span>
            <span className="text-muted-foreground text-xs">
              {contact.last_enriched_at 
                ? new Date(contact.last_enriched_at).toLocaleString()
                : '❌ Never'
              }
            </span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs font-medium">🔍 Troubleshooting:</p>
          <ul className="text-xs space-y-1 text-muted-foreground pl-4">
            {!contact.last_enriched_at && (
              <li>• Click "Run Research" button to fetch company data</li>
            )}
            {contact.last_enriched_at && !contact.company_website && (
              <li>• ⚠️ Research ran but didn't find website</li>
            )}
            {contact.company_website && !websiteIsValid && (
              <li>• ⚠️ Website found but invalid: "{contact.company_website}"</li>
            )}
            {!contact.company_website && contact.last_enriched_at && (
              <>
                <li>• The research function may need to be redeployed</li>
                <li>• Check Supabase Edge Function logs for errors</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}














