import { useParams, NavLink } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Building2, 
  Shield,
  Edit,
  ArrowLeft
} from "lucide-react";
import { getUserById, getBrandById } from "@/data/mockData";
import { UserPermissionDialog } from "@/components/admin/UserPermissionDialog";
import { AccountabilityChartEditor } from "@/components/AccountabilityChartEditor";
import { AccountabilityChartImporter } from "@/components/AccountabilityChartImporter";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const user = userId ? getUserById(userId) : null;
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

  if (!user) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <NavLink to="/adminpanel">Admin Panel</NavLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <NavLink to="/adminpanel/users">User Management</NavLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>User Not Found</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">User not found</h3>
            <p className="text-muted-foreground mb-4">The requested user could not be found.</p>
            <Button asChild>
              <NavLink to="/adminpanel/users">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to User Management
              </NavLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'manager': return 'bg-warning text-warning-foreground';
      case 'user': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUserBrandNames = () => {
    // Mock implementation - in real app this would use user.brand_access
    return ['Brand A', 'Brand B'].join(', ');
  };

  const handleSavePermissions = (userId: string, permissions: any) => {
    // Update user permissions in the data
    console.log('Saving permissions for user:', userId, permissions);
    setIsPermissionDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NavLink to="/adminpanel">Admin Panel</NavLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NavLink to="/adminpanel/users">User Management</NavLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{user.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <NavLink to="/adminpanel/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </NavLink>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Details</h1>
            <p className="text-muted-foreground">
              Manage user information and permissions
            </p>
          </div>
        </div>
        <Button onClick={() => setIsPermissionDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Permissions
        </Button>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                {user.email}
              </CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRoleColor(user.role)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Phone</p>
                <p className="text-sm text-muted-foreground">Not provided</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Brand Access</p>
                <p className="text-sm text-muted-foreground">
                  {getUserBrandNames() || 'No brands assigned'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Permissions</CardTitle>
          <CardDescription>
            Overview of user's current access levels and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Module Access */}
            <div>
              <h4 className="font-medium text-foreground mb-2">Module Access</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(user.permissions.modules).map(([module, hasAccess]) => (
                  <Badge 
                    key={module} 
                    variant={hasAccess ? "default" : "secondary"}
                  >
                    {module.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Brand Permissions */}
            <div>
              <h4 className="font-medium text-foreground mb-2">Brand Permissions</h4>
              <div className="space-y-2">
                {Object.entries(user.permissions.brands).map(([brandId, brandPerms]) => {
                  const brand = getBrandById(brandId);
                  return (
                    <div key={brandId} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{brand?.name || 'Unknown Brand'}</p>
                        <p className="text-sm text-muted-foreground">
                          Access Level: {brandPerms.level}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(brandPerms.permissions).map(([perm, hasAccess]) => 
                          hasAccess ? (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm.replace('_', ' ')}
                            </Badge>
                          ) : null
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accountability Chart Section */}
      <Tabs defaultValue="view" className="space-y-4">
        <TabsList>
          <TabsTrigger value="view">View Chart</TabsTrigger>
          <TabsTrigger value="import">Import from CSV</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view">
          <AccountabilityChartEditor userId={user.id} isEditable={false} />
        </TabsContent>
        
        <TabsContent value="import">
          <AccountabilityChartImporter />
        </TabsContent>
      </Tabs>

      {/* Permission Dialog */}
      <UserPermissionDialog
        user={user}
        isOpen={isPermissionDialogOpen}
        onClose={() => setIsPermissionDialogOpen(false)}
        onSave={handleSavePermissions}
      />
    </div>
  );
};

export default UserDetail;