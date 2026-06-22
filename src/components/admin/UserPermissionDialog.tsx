import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { AdminUser, BrandAssignment } from "@/hooks/useAdminUsers";
// Brand assignments removed

interface UserPermissionDialogProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    userId: string,
    updates: {
      email: string;
      firstName: string;
      lastName: string;
      role: 'super_admin' | 'admin' | 'manager' | 'project_manager' | 'team_member' | 'client' | 'bd_user';
      status: 'active' | 'inactive' | 'pending';
      title: string | null;
      department: string | null;
      brandAssignments: BrandAssignment[];
    }
  ) => Promise<void> | void;
}

type AccessLevel = BrandAssignment['access_level'];

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'manager' | 'project_manager' | 'team_member' | 'client' | 'bd_user';
  status: 'active' | 'inactive' | 'pending';
  title: string;
  department: string;
  brandAssignments: BrandAssignment[];
};

const defaultState: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'team_member',
  status: 'active',
  title: '',
  department: '',
  brandAssignments: [],
};

const getInitialState = (user: UserPermissionDialogProps['user']): FormState => {
  if (!user) return defaultState;

  return {
    email: user.email ?? '',
    firstName: user.first_name ?? '',
    lastName: user.last_name ?? '',
    role: user.role,
    status: user.status,
    title: user.title ?? '',
    department: user.department ?? '',
    brandAssignments:
      user.user_brands?.map((assignment) => ({
        brand_id: assignment.brand_id,
        access_level: (assignment.access_level as AccessLevel) || 'member',
      })) || [],
  };
};

export const UserPermissionDialog = ({
  user,
  isOpen,
  onClose,
  onSave,
}: UserPermissionDialogProps) => {
  // Brand assignments removed - no brands to manage
  const brands: any[] = [];
  const brandsLoading = false;
  const [formState, setFormState] = useState<FormState>(() => getInitialState(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormState(getInitialState(user));
    }
  }, [user, isOpen]);

  const assignedBrandIds = useMemo(
    () => new Set(formState.brandAssignments.map((assignment) => assignment.brand_id)),
    [formState.brandAssignments]
  );

  const handleBrandToggle = (brandId: string, checked: boolean) => {
    setFormState((prev) => {
      if (checked) {
        if (prev.brandAssignments.some((assignment) => assignment.brand_id === brandId)) {
          return prev;
        }

        return {
          ...prev,
          brandAssignments: [
            ...prev.brandAssignments,
            { brand_id: brandId, access_level: 'member' },
          ],
        };
      }

      return {
        ...prev,
        brandAssignments: prev.brandAssignments.filter(
          (assignment) => assignment.brand_id !== brandId
        ),
      };
    });
  };

  const handleBrandLevelChange = (brandId: string, level: AccessLevel) => {
    setFormState((prev) => ({
      ...prev,
      brandAssignments: prev.brandAssignments.map((assignment) =>
        assignment.brand_id === brandId
          ? { ...assignment, access_level: level }
          : assignment
      ),
    }));
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await onSave(user.id, {
        email: formState.email.trim(),
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        role: formState.role,
        status: formState.status,
        title: formState.title.trim() || null,
        department: formState.department.trim() || null,
        brandAssignments: formState.brandAssignments,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage User Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formState.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="user@sjinnovation.com"
              />
            </div>
            <div>
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={formState.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={formState.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
                placeholder="Enter last name"
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="e.g. Business Development Manager"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formState.department}
                onChange={(event) => updateField('department', event.target.value)}
                placeholder="e.g. Business Development"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formState.role}
                  onValueChange={(value: FormState['role']) => updateField('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value: FormState['status']) => updateField('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Brand assignments</Label>
              {user?.user_brands && user.user_brands.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {user.user_brands.length} current
                </Badge>
              )}
            </div>
            <ScrollArea className="h-64 rounded-md border p-3">
              <div className="space-y-3">
                {brandsLoading && (
                  <p className="text-sm text-muted-foreground">Loading brands…</p>
                )}
                {!brandsLoading && brands.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No brands available. Create a brand first from the Brands tab.
                  </p>
                )}
                {brands.map((brand) => {
                  const isAssigned = assignedBrandIds.has(brand.id);
                  const assignment = formState.brandAssignments.find(
                    (item) => item.brand_id === brand.id
                  );

                  return (
                    <div
                      key={brand.id}
                      className="flex flex-col gap-3 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`brand-${brand.id}`}
                            checked={isAssigned}
                            onCheckedChange={(checked) =>
                              handleBrandToggle(brand.id, checked === true)
                            }
                          />
                          <Label htmlFor={`brand-${brand.id}`} className="font-medium">
                            {brand.name}
                          </Label>
                        </div>
                        {isAssigned && (
                          <Select
                            value={assignment?.access_level || 'member'}
                            onValueChange={(value: AccessLevel) =>
                              handleBrandLevelChange(brand.id, value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {isAssigned && (
                        <p className="text-xs text-muted-foreground">
                          Owners can manage settings and team. Members can collaborate on
                          content, and viewers have read-only access.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
