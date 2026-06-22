import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Trash2, Shield, UserCheck, UserX, Calendar, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Label } from '@/components/ui/label';
import { UserPermissionDialog } from '@/components/admin/UserPermissionDialog';
import { PasswordResetDialog } from '@/components/admin/PasswordResetDialog';
import { PageInstructions } from '@/components/admin/PageInstructions';
import { useAdminUsers, type AdminUser, type BrandAssignment, type CreateUserData } from '@/hooks/useAdminUsers';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePagination } from '@/hooks/usePagination';
// Brand assignments removed

// Extended interface for UI purposes
interface User extends AdminUser {
  name?: string; // Computed field
  brandAccess?: string[]; // Computed field for easier access
}

interface NewUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'manager' | 'project_manager' | 'team_member' | 'client' | 'bd_user';
  title: string;
  department: string;
  brandIds: string[];
}

const UserManagement = () => {
  const { users: rawUsers, loading, total, stats, error, fetchUsers, createUser, updateUser, deleteUser, resetUserPassword } = useAdminUsers();
  // Brand assignments removed
  const brands: any[] = [];
  const brandsLoading = false;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<User | null>(null);
  const pagination = usePagination(12);
  const { toast } = useToast();

  // Form state for creating users
  const [newUser, setNewUser] = useState<NewUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'team_member',
    title: '',
    department: '',
    brandIds: [],
  });

  // Field-level error tracking
  const [fieldErrors, setFieldErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
  });

  // Convert raw users to UI-friendly format
  const users: User[] = useMemo(() => {
    return rawUsers.map(user => ({
      ...user,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
      brandAccess: user.user_brands?.map(ub => ub.brand_name).filter(Boolean) || []
    }));
  }, [rawUsers]);


  // Load users on component mount
  useEffect(() => {
    fetchUsers({ page: pagination.currentPage, limit: pagination.pageSize });
  }, [pagination.currentPage, pagination.pageSize, fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterRole === "all" || user.role === filterRole;  
      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterRole]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-destructive text-destructive-foreground';
      case 'admin': return 'bg-orange-500 text-white';
      case 'manager': return 'bg-primary text-primary-foreground';
      case 'project_manager': return 'bg-blue-500 text-white';
      case 'team_member': return 'bg-secondary text-secondary-foreground';
      case 'client': return 'bg-purple-500 text-white';
      case 'bd_user': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'project_manager': return 'Project Manager';
      case 'team_member': return 'Team Member';
      case 'bd_user': return 'BD User';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    setIsPermissionDialogOpen(true);
  };

  const handleSavePermissions = async (
    userId: string,
    updates: {
      email: string;
      firstName: string;
      lastName: string;
      role: 'super_admin' | 'admin' | 'manager' | 'project_manager' | 'team_member' | 'client' | 'bd_user';
      status: 'active' | 'inactive' | 'pending';
      title: string | null;
      department: string | null;
      isMarketing: boolean;
      brandAssignments: BrandAssignment[];
    }
  ) => {
    try {
      await updateUser(userId, {
        email: updates.email,
        firstName: updates.firstName,
        lastName: updates.lastName,
        role: updates.role,
        status: updates.status,
        title: updates.title,
        department: updates.department,
        brandAssignments: updates.brandAssignments,
      });
      setIsPermissionDialogOpen(false);
    } catch (error) {
      // Error is surfaced via the updateUser hook toast handler
    }
  };


  const handleCreateUser = async () => {
    // Reset field errors
    const errors = {
      firstName: !newUser.firstName.trim(),
      lastName: !newUser.lastName.trim(),
      email: !newUser.email.trim(),
      password: !newUser.password.trim(),
    };

    // Validate email domain if email is provided
    const invalidEmailDomain = newUser.email.trim() && !newUser.email.toLowerCase().endsWith('@sjinnovation.com');
    if (invalidEmailDomain) {
      errors.email = true;
    }

    setFieldErrors(errors);

    // Check if any field has errors
    const hasErrors = Object.values(errors).some(error => error);
    if (hasErrors) {
      const missingFields = [];
      if (errors.firstName) missingFields.push('First Name');
      if (errors.lastName) missingFields.push('Last Name');
      if (errors.email && !invalidEmailDomain) missingFields.push('Email');
      if (errors.password) missingFields.push('Password');

      let description = '';
      if (missingFields.length > 0) {
        description = `Please fill in: ${missingFields.join(', ')}`;
      }
      if (invalidEmailDomain) {
        description = description 
          ? `${description}. Also, only @sjinnovation.com email addresses are allowed`
          : 'Only @sjinnovation.com email addresses are allowed';
      }

      toast({
        title: "Validation Error",
        description,
        variant: "destructive",
      });
      return;
    }

    try {
      const brandAssignments: BrandAssignment[] = newUser.brandIds.map((brandId) => ({
        brand_id: brandId,
        access_level: 'member',
      }));

      const userData: CreateUserData = {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        title: newUser.title.trim() || null,
        department: newUser.department.trim() || null,
        brandAssignments,
      };

      await createUser(userData);
      setIsAddDialogOpen(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'team_member',
        title: '',
        department: '',
        brandIds: [],
      });
      setFieldErrors({
        firstName: false,
        lastName: false,
        email: false,
        password: false,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
      } catch (error) {
        // Error is handled by the hook
      }
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await updateUser(user.id, {
        status: newStatus,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      await resetUserPassword(userId, newPassword);
      setIsPasswordResetDialogOpen(false);
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts, roles, and brand assignments</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold">Failed to Load Users</h3>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <Button onClick={() => fetchUsers({ page: pagination.currentPage, limit: pagination.pageSize })}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and brand assignments
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}>
            {viewMode === "cards" ? "Table View" : "Card View"}
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account and assign roles.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="first-name"
                      placeholder="Enter first name"
                      value={newUser.firstName}
                      onChange={(e) => {
                        setNewUser(prev => ({ ...prev, firstName: e.target.value }));
                        setFieldErrors(prev => ({ ...prev, firstName: false }));
                      }}
                      className={fieldErrors.firstName ? "border-destructive" : ""}
                    />
                    {fieldErrors.firstName && (
                      <p className="text-sm text-destructive">First name is required</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="last-name"
                      placeholder="Enter last name"
                      value={newUser.lastName}
                      onChange={(e) => {
                        setNewUser(prev => ({ ...prev, lastName: e.target.value }));
                        setFieldErrors(prev => ({ ...prev, lastName: false }));
                      }}
                      className={fieldErrors.lastName ? "border-destructive" : ""}
                    />
                    {fieldErrors.lastName && (
                      <p className="text-sm text-destructive">Last name is required</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-title">Title</Label>
                    <Input
                      id="user-title"
                      placeholder="e.g. Business Development Manager"
                      value={newUser.title}
                      onChange={(e) => setNewUser(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-department">Department</Label>
                    <Input
                      id="user-department"
                      placeholder="e.g. Business Development"
                      value={newUser.department}
                      onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="user@sjinnovation.com"
                    value={newUser.email}
                    onChange={(e) => {
                      setNewUser(prev => ({ ...prev, email: e.target.value }));
                      setFieldErrors(prev => ({ ...prev, email: false }));
                    }}
                    className={fieldErrors.email ? "border-destructive" : ""}
                  />
                  {fieldErrors.email && newUser.email.trim() && !newUser.email.toLowerCase().endsWith('@sjinnovation.com') ? (
                    <p className="text-sm text-destructive">Only @sjinnovation.com email addresses are allowed</p>
                  ) : fieldErrors.email ? (
                    <p className="text-sm text-destructive">Email is required</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Only @sjinnovation.com email addresses are allowed
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="user-password"
                    type="password"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => {
                      setNewUser(prev => ({ ...prev, password: e.target.value }));
                      setFieldErrors(prev => ({ ...prev, password: false }));
                    }}
                    className={fieldErrors.password ? "border-destructive" : ""}
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-destructive">Password is required</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value: NewUserForm['role']) => setNewUser(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="bd_user">BD User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign Brands</Label>
                  <ScrollArea className="max-h-40 rounded-md border p-3">
                    <div className="space-y-2">
                      {brandsLoading && (
                        <p className="text-sm text-muted-foreground">Loading brands…</p>
                      )}
                      {!brandsLoading && brands.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No brands available yet. Create a brand to assign access.
                        </p>
                      )}
                      {!brandsLoading && brands.map((brand) => {
                        const isSelected = newUser.brandIds.includes(brand.id);
                        return (
                          <div key={brand.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`brand-${brand.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                setNewUser(prev => ({
                                  ...prev,
                                  brandIds: checked === true
                                    ? Array.from(new Set([...prev.brandIds, brand.id]))
                                    : prev.brandIds.filter(id => id !== brand.id),
                                }))
                              }
                            />
                            <Label htmlFor={`brand-${brand.id}`} className="text-sm font-medium">
                              {brand.name}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    New users receive member-level access to selected brands.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={loading}>
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="project_manager">Project Manager</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="bd_user">BD User</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={String(pagination.pageSize)} 
          onValueChange={(value) => {
            pagination.setPageSize(Number(value));
            pagination.setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="20">20 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {(() => {
          const totalPages = Math.ceil(total / pagination.pageSize);
          return null;
        })()}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.managers ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      {viewMode === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Brands</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleEditPermissions(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {(user.first_name?.[0] || '?')}{(user.last_name?.[0] || '?')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.title ? user.title : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.department ? user.department : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleName(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? "default" : "destructive"}>
                      {user.status === 'active' ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.brandAccess?.slice(0, 2).map((brandName) => (
                        <Badge key={brandName} variant="outline" className="text-xs">
                          {brandName}
                        </Badge>
                      ))}
                      {(user.brandAccess?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(user.brandAccess?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditPermissions(user);
                        }}>
                          <Shield className="mr-2 h-4 w-4" />
                          Manage Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleToggleUserStatus(user);
                        }}>
                          {user.status === 'active' ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserForPasswordReset(user);
                            setIsPasswordResetDialogOpen(true);
                          }}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {(user.first_name?.[0] || '?')}{(user.last_name?.[0] || '?')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{user.name}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">{user.email}</CardDescription>
                      {(user.title || user.department) && (
                        <p className="text-xs text-muted-foreground">
                          {user.title}
                          {user.title && user.department ? ' • ' : ''}
                          {user.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPermissions(user)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Manage Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleUserStatus(user)}>
                        {user.status === 'active' ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUserForPasswordReset(user);
                          setIsPasswordResetDialogOpen(true);
                        }}
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(user.role)}>
                    {getRoleName(user.role)}
                  </Badge>
                  <Badge variant={user.status === 'active' ? "default" : "destructive"}>
                    {user.status === 'active' ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Brand Access ({user.brandAccess?.length || 0})</h4>
                  {user.brandAccess && user.brandAccess.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.brandAccess.slice(0, 3).map((brandName) => (
                        <Badge key={brandName} variant="outline" className="text-xs">
                          {brandName}
                        </Badge>
                      ))}
                      {user.brandAccess.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.brandAccess.length - 3} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No brand access assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {(() => {
        const totalPages = Math.ceil(total / pagination.pageSize);
        
        if (totalPages <= 1) return null;
        
        return (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => pagination.currentPage > 1 && pagination.setCurrentPage(pagination.currentPage - 1)}
                  className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => pagination.setCurrentPage(pageNum)}
                      isActive={pagination.currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => pagination.currentPage < totalPages && pagination.setCurrentPage(pagination.currentPage + 1)}
                  className={pagination.currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        );
      })()}

      {/* No users found */}
      {filteredUsers.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterRole !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first user"
                  }
                </p>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Dialog */}
      {selectedUser && (
        <UserPermissionDialog
          user={selectedUser}
          isOpen={isPermissionDialogOpen}
          onClose={() => setIsPermissionDialogOpen(false)}
          onSave={handleSavePermissions}
        />
      )}

      {/* Password Reset Dialog */}
      <PasswordResetDialog
        user={selectedUserForPasswordReset}
        isOpen={isPasswordResetDialogOpen}
        onClose={() => {
          setIsPasswordResetDialogOpen(false);
          setSelectedUserForPasswordReset(null);
        }}
        onResetPassword={handleResetPassword}
        users={users}
      />
    </div>
  );
};

export default UserManagement;