import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-sji-login.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for access token in URL hash (from password reset link)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    // If this is a recovery link, verify session
    if (type === 'recovery' || accessToken) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          toast({
            title: "Invalid or Expired Link",
            description: "This password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          navigate("/login");
        }
      });
    } else {
      // No token in URL, check if there's an existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          toast({
            title: "Access Denied",
            description: "Please use the password reset link from your email.",
            variant: "destructive",
          });
          navigate("/login");
        }
      });
    }
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Success",
        description: "Your password has been reset successfully!",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError((err as Error).message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Password Reset Successful!</h2>
              <p className="text-muted-foreground">
                Redirecting you to the login page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center justify-center mb-4">
            <img src={logo} alt="SJ Innovation" className="h-20 w-auto mb-3" />
            <p className="text-white/90 text-sm">Intelligence Dashboard + AI Task Hub</p>
          </div>
        </div>

        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
