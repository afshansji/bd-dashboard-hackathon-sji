import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ControlTowerConfig } from "@/components/admin/ControlTowerConfig";
import AutomationSettings from "./AutomationSettings";

const AdminSettings = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "control-tower");
  const [companyName, setCompanyName] = useState("Business Development Intelligence Co.");
  const { toast } = useToast();

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Company information has been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings and integrations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="control-tower">Control Tower</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="control-tower" className="space-y-4">
          <ControlTowerConfig />
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <AutomationSettings />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic company details displayed throughout the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Globe className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 2MB. Recommended: 200x200px
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;