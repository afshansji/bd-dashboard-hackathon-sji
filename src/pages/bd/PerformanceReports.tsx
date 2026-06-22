import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileBarChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PerformanceReports() {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Reports & Exports</h1>
        <p className="text-muted-foreground mt-1">
          Performance reports and data exports
        </p>
      </div>
      
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-muted p-4">
                <FileBarChart className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground">
              Performance reports and analytics will be available here soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
