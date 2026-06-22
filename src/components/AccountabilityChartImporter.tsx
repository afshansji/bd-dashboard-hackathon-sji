import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export function AccountabilityChartImporter() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsProcessing(true);
    try {
      // Placeholder for CSV processing logic
      toast.info("CSV import feature coming soon");
    } catch (error) {
      toast.error("Failed to process CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import Accountability Chart
        </CardTitle>
        <CardDescription>
          Upload a CSV file to bulk import accountability chart data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Upload CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">
              CSV should contain: Type of Work, Responsibilities
            </p>
          </div>
          <label htmlFor="csv-upload">
            <Button variant="outline" disabled={isProcessing} asChild>
              <span>
                {isProcessing ? "Processing..." : "Choose File"}
              </span>
            </Button>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
