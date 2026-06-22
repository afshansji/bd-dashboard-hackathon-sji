import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Lock } from "lucide-react";
import { AccountabilityChartEditor } from "@/components/AccountabilityChartEditor";
import { AccountabilityChartImporter } from "@/components/AccountabilityChartImporter";

export default function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    timezone: 'utc-5',
    language: 'en'
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSave = () => {
    // Here you would typically save to a backend
    console.log('Saving profile:', formData);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmNewPassword) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    
    setIsUpdatingPassword(true);
    
    try {
      // Optional: Verify current password first
      if (currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: currentPassword
        });
        
        if (signInError) {
          throw new Error("Current password is incorrect");
        }
      }
      
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully!"
      });
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update password",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <User className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your personal information and settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Personal Information</TabsTrigger>
          <TabsTrigger value="accountability">Accountability Chart</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {/* Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                Keep your profile information up to date.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input 
                    id="full-name" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={formData.timezone}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc-8">UTC-8 (PST)</SelectItem>
                      <SelectItem value="utc-5">UTC-5 (EST)</SelectItem>
                      <SelectItem value="utc+0">UTC+0 (GMT)</SelectItem>
                      <SelectItem value="utc+1">UTC+1 (CET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={formData.language}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} className="bg-gradient-primary">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accountability">
          <div className="space-y-6">
            <AccountabilityChartEditor userId={user?.id || ''} isEditable={true} />
            <AccountabilityChartImporter />
          </div>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your password to keep your account secure
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password (Optional)</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your current password to verify your identity
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isUpdatingPassword}
                  className="bg-gradient-primary"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
