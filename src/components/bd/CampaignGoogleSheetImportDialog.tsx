import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Download, FileSpreadsheet, Loader2, CheckCircle2, RefreshCw, Upload } from "lucide-react";
import type { BDCampaign } from "@/hooks/useBDCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSheetPicker } from "./GoogleSheetPicker";
import { FieldMappingTable } from "./FieldMappingTable";
import { ImportPreviewTable } from "./ImportPreviewTable";

interface CampaignGoogleSheetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: BDCampaign;
  onImportComplete: () => void;
}

type ImportStep = 'select' | 'map' | 'validate' | 'confirm' | 'importing' | 'complete';

interface ValidationResult {
  total: number;
  valid: number;
  invalid: number;
  duplicateInSheet: number;
  alreadyExists: number;
  validContacts: Array<{
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    company: string;
    phone?: string;
    linkedinUrl?: string;
    companyWebsite?: string;
    companyIndustry?: string;
    companySize?: string;
    companyLinkedinUrl?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    rowNumber: number;
  }>;
  errors: Array<{
    rowNumber: number;
    field: string;
    message: string;
  }>;
}

const REQUIRED_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'company', label: 'Company' },
];

const OPTIONAL_FIELDS = [
  { key: 'phone', label: 'Phone' },
  { key: 'linkedinUrl', label: 'LinkedIn URL' },
  { key: 'companyWebsite', label: 'Company Domain' },
  { key: 'companyIndustry', label: 'Industry' },
  { key: 'companySize', label: 'Company Size' },
  { key: 'companyLinkedinUrl', label: 'Company LinkedIn' },
  { key: 'streetAddress', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zipCode', label: 'Zip Code' },
  { key: 'country', label: 'Country' },
];

export function CampaignGoogleSheetImportDialog({
  open,
  onOpenChange,
  campaign,
  onImportComplete,
}: CampaignGoogleSheetImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('select');
  const [importMode, setImportMode] = useState<'create' | 'update'>('create');
  const [importSource, setImportSource] = useState<'google-sheets' | 'csv'>('google-sheets');
  const [selectedSheet, setSelectedSheet] = useState<{ id: string; name: string; url: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [customTag, setCustomTag] = useState("");
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported?: number;
    skipped?: number;
    failed?: number;
    matched?: number;
    updated?: number;
    created?: number;
    tags: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const campaignTag = `campaign-${campaign.name.toLowerCase().replace(/\s+/g, '-')}`;

  useEffect(() => {
    if (!open) {
      resetDialog();
    }
  }, [open]);

  const resetDialog = () => {
    setStep('select');
    setImportMode('create');
    setImportSource('google-sheets');
    setSelectedSheet(null);
    setSelectedFile(null);
    setSheetData([]);
    setCustomTag("");
    setFieldMapping({});
    setValidationResult(null);
    setIsValidating(false);
    setIsImporting(false);
    setIsUploadingCSV(false);
    setImportResult(null);
    setError(null);
  };

  // Parse CSV file
  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n');
    const result: string[][] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const row: string[] = [];
      let currentField = '';
      let insideQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      row.push(currentField.trim());
      result.push(row);
    }
    
    return result;
  };

  // Handle CSV file upload
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setSelectedFile(file);
    setIsUploadingCSV(true);
    setError(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);
      
      if (data.length === 0) {
        throw new Error('CSV file is empty');
      }

      if (data.length === 1) {
        throw new Error('CSV file only contains headers, no data rows');
      }

      setSheetData(data);
      
      // Auto-detect field mapping from headers
      if (data.length > 0) {
        const headers = data[0].map(h => h.toLowerCase().trim());
        const mapping: Record<string, string> = {};
        
        // Define alternative names for each field to improve auto-detection
        const fieldAliases: Record<string, string[]> = {
          companyWebsite: ['company domain', 'company website', 'website', 'domain', 'company url', 'company site'],
          companyLinkedinUrl: ['company linkedin', 'company linkedin url', 'company li', 'company li url', 'company linkedin profile'],
          linkedinUrl: ['linkedin', 'linkedin url', 'li url', 'profile url', 'linkedin profile'],
          phone: ['phone', 'phone number', 'mobile', 'contact number', 'telephone'],
          companyIndustry: ['industry', 'company industry', 'sector', 'business sector'],
          companySize: ['company size', 'size', 'employee count', 'employees', 'number of employees'],
          zipCode: ['zip code', 'zipcode', 'zip', 'postal code', 'postal', 'post code', 'postcode'],
        };
        
        [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
          const fieldLower = field.label.toLowerCase();
          const aliases = fieldAliases[field.key] || [fieldLower];
          
          const matchIndex = headers.findIndex(h => {
            // Check against field label, aliases, and field key
            return aliases.some(alias => 
              h === alias || 
              h.replace(/\s+/g, '') === alias.replace(/\s+/g, '')
            ) || h === field.key.toLowerCase();
          });
          
          if (matchIndex !== -1) {
            mapping[field.key] = data[0][matchIndex];
          }
        });
        
        setFieldMapping(mapping);
      }
      
      setStep('map');
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
    } finally {
      setIsUploadingCSV(false);
    }
  };

  const handleSheetSelected = (sheet: { id: string; name: string; url: string }, data: string[][]) => {
    setSelectedSheet(sheet);
    setSheetData(data);
    setError(null);
    
    // Auto-detect field mapping from headers
    if (data.length > 0) {
      const headers = data[0].map(h => h.toLowerCase().trim());
      const mapping: Record<string, string> = {};
      
      // Define alternative names for each field to improve auto-detection
      const fieldAliases: Record<string, string[]> = {
        companyWebsite: ['company domain', 'company website', 'website', 'domain', 'company url', 'company site'],
        companyLinkedinUrl: ['company linkedin', 'company linkedin url', 'company li', 'company li url', 'company linkedin profile'],
        linkedinUrl: ['linkedin', 'linkedin url', 'li url', 'profile url', 'linkedin profile'],
        phone: ['phone', 'phone number', 'mobile', 'contact number', 'telephone'],
        companyIndustry: ['industry', 'company industry', 'sector', 'business sector'],
        companySize: ['company size', 'size', 'employee count', 'employees', 'number of employees'],
        zipCode: ['zip code', 'zipcode', 'zip', 'postal code', 'postal', 'post code', 'postcode'],
      };
      
      [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
        const fieldLower = field.label.toLowerCase();
        const aliases = fieldAliases[field.key] || [fieldLower];
        
        const matchIndex = headers.findIndex(h => {
          // Check against field label, aliases, and field key
          return aliases.some(alias => 
            h === alias || 
            h.replace(/\s+/g, '') === alias.replace(/\s+/g, '')
          ) || h === field.key.toLowerCase();
        });
        
        if (matchIndex !== -1) {
          mapping[field.key] = data[0][matchIndex];
        }
      });
      
      setFieldMapping(mapping);
    }
    
    setStep('map');
  };

  const handleMappingComplete = () => {
    // Validate that all required fields are mapped
    const missingFields = REQUIRED_FIELDS.filter(f => !fieldMapping[f.key]);
    if (missingFields.length > 0) {
      setError(`Please map all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }
    
    setStep('validate');
    validateSheet();
  };

  const validateSheet = async () => {
    setIsValidating(true);
    setError(null);

    try {
      const { data, error: validateError } = await supabase.functions.invoke('campaign-google-sheet-import', {
        body: {
          action: 'validate',
          campaignId: campaign.id,
          sheetData,
          fieldMapping,
        },
      });

      if (validateError) throw validateError;
      
      setValidationResult(data.validation);
      setStep('confirm');
    } catch (err: any) {
      console.error('Validation error:', err);
      setError(err.message || 'Failed to validate sheet data');
      setStep('map');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult) return;

    setIsImporting(true);
    setError(null);

    try {
      const tags = [campaignTag];
      if (customTag.trim()) {
        tags.push(customTag.trim());
      }

      const action = importMode === 'update' ? 'update' : 'import';
      
      const { data, error: importError } = await supabase.functions.invoke('campaign-google-sheet-import', {
        body: {
          action,
          campaignId: campaign.id,
          contacts: validationResult.validContacts,
          tags,
        },
      });

      if (importError) throw importError;

      setImportResult(data.result);
      setStep('complete');
      
      // Call onImportComplete after a short delay to allow user to see the success message
      setTimeout(() => {
        onImportComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to ' + (importMode === 'update' ? 'update' : 'import') + ' contacts');
    } finally {
      setIsImporting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Import Campaign Contacts</AlertTitle>
              <AlertDescription>
                Import contacts from Google Sheets or upload a CSV file. Make sure your data includes the required columns.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label>Import Mode</Label>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as 'create' | 'update')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="create" id="mode-create" />
                  <Label htmlFor="mode-create" className="font-normal cursor-pointer">
                    <span className="font-medium">Import New Contacts</span>
                    <p className="text-sm text-muted-foreground">Add contacts with unique emails (skips duplicates)</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="mode-update" />
                  <Label htmlFor="mode-update" className="font-normal cursor-pointer flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <div>
                      <span className="font-medium">Update Existing Contacts</span>
                      <p className="text-sm text-muted-foreground">Match by Name + Company, update emails and other fields</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Required Columns</Label>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_FIELDS.map(field => (
                  <Badge key={field.key} variant="default">{field.label}</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Optional Columns</Label>
              <div className="flex flex-wrap gap-2">
                {OPTIONAL_FIELDS.map(field => (
                  <Badge key={field.key} variant="outline">{field.label}</Badge>
                ))}
              </div>
            </div>

            <Separator />

            <Tabs value={importSource} onValueChange={(v) => setImportSource(v as 'google-sheets' | 'csv')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="google-sheets">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Google Sheets
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="google-sheets" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Select Google Sheet</Label>
                  <p className="text-sm text-muted-foreground">
                    Connect to a Google Sheet containing your campaign contacts.
                  </p>
                </div>
                <GoogleSheetPicker onSheetSelected={handleSheetSelected} />
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Label>Upload CSV File</Label>
                      <p className="text-sm text-muted-foreground">
                        Upload a CSV file from your computer. The first row should contain column headers.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/lead-import-template.csv';
                        link.download = 'lead-import-template.csv';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download CSV sample format
                    </Button>
                  </div>

                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold">Upload CSV File</h3>
                        <p className="text-sm text-muted-foreground">
                          Click to browse and select a CSV file
                        </p>
                      </div>

                      <div className="relative">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="cursor-pointer"
                          disabled={isUploadingCSV}
                        />
                      </div>

                      {selectedFile && !isUploadingCSV && (
                        <div className="mt-4 p-3 bg-muted rounded-md w-full">
                          <p className="text-sm font-medium">Selected: {selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      )}

                      {isUploadingCSV && (
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing CSV file...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Alert>
                    <Download className="h-4 w-4" />
                    <AlertTitle>CSV Format Requirements</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                        <li>First row must contain column headers</li>
                        <li className="text-base">
                          <span className="font-bold text-red-600 text-base">
                            Required columns: First Name, Last Name, Email, Job Title, Company
                          </span>
                        </li>
                        <li>Optional: Phone, LinkedIn URL, Company Website, Industry, etc.</li>
                        <li>Use comma (,) as separator</li>
                        <li>UTF-8 encoding recommended</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'map':
        return (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Map Your Columns</AlertTitle>
              <AlertDescription>
                Match your sheet columns to the required contact fields. We've auto-detected some mappings.
              </AlertDescription>
            </Alert>

            {(selectedSheet || selectedFile) && (
              <div className="space-y-2">
                <Label>{importSource === 'csv' ? 'Selected File' : 'Selected Sheet'}</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">{selectedFile ? selectedFile.name : selectedSheet?.name}</p>
                  <p className="text-sm text-muted-foreground">{sheetData.length - 1} rows (excluding header)</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Custom Tag (Optional)</Label>
              <Input
                placeholder="e.g., Q1-2024, HighValue"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                All contacts will be tagged with: <Badge variant="outline">{campaignTag}</Badge>
                {customTag && <> and <Badge variant="outline">{customTag}</Badge></>}
              </p>
            </div>

            <Separator />

            <FieldMappingTable
              sheetHeaders={sheetData[0] || []}
              requiredFields={REQUIRED_FIELDS}
              optionalFields={OPTIONAL_FIELDS}
              mapping={fieldMapping}
              onMappingChange={setFieldMapping}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'validate':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Validating sheet data...</p>
            <p className="text-sm text-muted-foreground">Checking for duplicates and validating required fields</p>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            {validationResult && (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Validation Complete</AlertTitle>
                  <AlertDescription>
                    Review the validation results below and proceed with import.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-2xl font-bold">{validationResult.total}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-md">
                    <p className="text-2xl font-bold text-green-700">{validationResult.valid}</p>
                    <p className="text-sm text-green-700">Valid to Import</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-md">
                    <p className="text-2xl font-bold text-yellow-700">{validationResult.duplicateInSheet}</p>
                    <p className="text-sm text-yellow-700">Duplicates in Sheet</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-md">
                    <p className="text-2xl font-bold text-orange-700">{validationResult.alreadyExists}</p>
                    <p className="text-sm text-orange-700">Already Exist</p>
                  </div>
                </div>

                {validationResult.invalid > 0 && (
                  <div className="p-4 bg-red-50 rounded-md">
                    <p className="text-sm font-medium text-red-700 mb-2">
                      {validationResult.invalid} Invalid Rows
                    </p>
                    <ImportPreviewTable errors={validationResult.errors.slice(0, 5)} />
                    {validationResult.errors.length > 5 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Showing first 5 of {validationResult.errors.length} errors
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tags to Apply</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{campaignTag}</Badge>
                    {customTag && <Badge>{customTag}</Badge>}
                  </div>
                </div>
              </>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'importing':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">{importMode === 'update' ? 'Updating' : 'Importing'} contacts...</p>
            <p className="text-sm text-muted-foreground">Please wait while we process your contacts</p>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{importMode === 'update' ? 'Update' : 'Import'} Complete!</AlertTitle>
              <AlertDescription>
                Your contacts have been successfully {importMode === 'update' ? 'updated' : 'imported'}.
              </AlertDescription>
            </Alert>

            {importResult && (
              <div className="grid grid-cols-3 gap-4">
                {importMode === 'update' ? (
                  <>
                    <div className="p-4 bg-green-50 rounded-md">
                      <p className="text-2xl font-bold text-green-700">{importResult.updated || 0}</p>
                      <p className="text-sm text-green-700">Updated</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-md">
                      <p className="text-2xl font-bold text-blue-700">{importResult.created || 0}</p>
                      <p className="text-sm text-blue-700">Created</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-md">
                      <p className="text-2xl font-bold text-red-700">{importResult.failed || 0}</p>
                      <p className="text-sm text-red-700">Failed</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-green-50 rounded-md">
                      <p className="text-2xl font-bold text-green-700">{importResult.imported || 0}</p>
                      <p className="text-sm text-green-700">Imported</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-md">
                      <p className="text-2xl font-bold text-yellow-700">{importResult.skipped || 0}</p>
                      <p className="text-sm text-yellow-700">Skipped</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-md">
                      <p className="text-2xl font-bold text-red-700">{importResult.failed || 0}</p>
                      <p className="text-sm text-red-700">Failed</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {importResult && importResult.tags.length > 0 && (
              <div className="space-y-2">
                <Label>Applied Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {importResult.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  const renderFooter = () => {
    switch (step) {
      case 'select':
        return (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        );

      case 'map':
        return (
          <>
            <Button variant="outline" onClick={() => setStep('select')}>
              Back
            </Button>
            <Button onClick={handleMappingComplete}>
              Continue to Validation
            </Button>
          </>
        );

      case 'validate':
        return null;

      case 'confirm':
        return (
          <>
            <Button variant="outline" onClick={() => setStep('map')}>
              Back
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!validationResult || validationResult.valid === 0 || isImporting}
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importMode === 'update' 
                ? `Update ${validationResult?.valid || 0} Contacts`
                : `Import ${validationResult?.valid || 0} Contacts`
              }
            </Button>
          </>
        );

      case 'importing':
        return null;

      case 'complete':
        return (
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads from Google Sheets</DialogTitle>
          <DialogDescription>
            Import campaign contacts from a Google Sheet with automatic validation and deduplication
          </DialogDescription>
        </DialogHeader>

        {renderStepContent()}

        <DialogFooter>
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
