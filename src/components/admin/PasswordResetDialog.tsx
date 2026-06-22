import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface PasswordResetDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  users?: User[];
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  allValid: boolean;
}

const validatePassword = (password: string): PasswordValidation => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
    allValid:
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password),
  };
};

export const PasswordResetDialog = ({
  user,
  isOpen,
  onClose,
  onResetPassword,
  users = [],
}: PasswordResetDialogProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const passwordValidation = useMemo(
    () => validatePassword(newPassword),
    [newPassword]
  );

  // Set selected user when dialog opens with a pre-selected user
  useEffect(() => {
    if (isOpen && user) {
      setSelectedUserId(user.id);
    }
  }, [isOpen, user]);

  // Validate password match
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordMatch(false);
    } else {
      setPasswordMatch(true);
    }
  }, [newPassword, confirmPassword]);

  const handleReset = async () => {
    if (!selectedUserId) {
      return;
    }

    if (!passwordValidation.allValid) {
      return;
    }

    if (!passwordMatch) {
      return;
    }

    setLoading(true);
    try {
      await onResetPassword(selectedUserId, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setSelectedUserId(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      onClose();
    } catch (error) {
      // Error is handled by the hook (toast already shown)
      console.error("Password reset failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setSelectedUserId(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const selectedUserDisplay = users.find((u) => u.id === selectedUserId) || user;
  const selectedUserName = selectedUserDisplay
    ? [selectedUserDisplay.first_name, selectedUserDisplay.last_name]
        .filter(Boolean)
        .join(" ") || selectedUserDisplay.email
    : "Select a user";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Reset User Password
          </DialogTitle>
          <DialogDescription>
            Enter a new password for the selected user. The user will be able
            to log in with the new password immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user-select">User</Label>
            {users.length > 0 ? (
              <Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Select a user to reset password" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-64">
                    {users.map((u) => {
                      const displayName =
                        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                        u.email;
                      return (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex flex-col">
                            <span>{displayName}</span>
                            <span className="text-xs text-muted-foreground">
                              {u.email}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </ScrollArea>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-center rounded-md border border-dashed border-input bg-background/50 py-4 text-sm text-muted-foreground">
                {selectedUserName}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                disabled={loading}
                className={cn(
                  "pr-10",
                  confirmPassword &&
                    !passwordMatch &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword && !passwordMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Passwords do not match
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Password Requirements</Label>
            <div className="space-y-1">
              <ValidationItem
                valid={passwordValidation.minLength}
                label="At least 8 characters"
              />
              <ValidationItem
                valid={passwordValidation.hasUppercase}
                label="One uppercase letter (A-Z)"
              />
              <ValidationItem
                valid={passwordValidation.hasLowercase}
                label="One lowercase letter (a-z)"
              />
              <ValidationItem
                valid={passwordValidation.hasNumbers}
                label="One number (0-9)"
              />
            </div>
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={
              loading ||
              !selectedUserId ||
              !passwordValidation.allValid ||
              !passwordMatch
            }
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Validation Item Component
 */
interface ValidationItemProps {
  valid: boolean;
  label: string;
}

const ValidationItem = ({ valid, label }: ValidationItemProps) => {
  return (
    <div className="flex items-center gap-2 text-xs">
      {valid ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={valid ? "text-green-700" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
};
