import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Settings, ArrowLeft } from "lucide-react";

type AuthView = "login" | "signup" | "forgot" | "reset";

interface AuthFormProps {
  onOpenSettings: () => void;
}

export const AuthForm = ({ onOpenSettings }: AuthFormProps) => {
  const { supabaseClient } = useApp();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Detect password recovery token in URL hash (Supabase puts it there after redirect)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setView("reset");
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) {
      toast({
        title: "Not configured",
        description: "Please configure Supabase in Settings first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (view === "login") {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "You've successfully signed in." });

      } else if (view === "signup") {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: "https://jain-arham-hsr.github.io/recap/" },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "You can now start creating cheatsheets." });

      } else if (view === "forgot") {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: "https://jain-arham-hsr.github.io/recap/",
        });
        if (error) throw error;
        toast({
          title: "Reset email sent!",
          description: "Check your inbox for the password reset link.",
        });
        setView("login");

      } else if (view === "reset") {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        // Clear the hash so the reset view doesn't persist on reload
        window.history.replaceState(null, "", window.location.pathname);
        toast({ title: "Password updated!", description: "You can now sign in with your new password." });
        setView("login");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const viewMeta: Record<AuthView, { description: string; submitLabel: string }> = {
    login:  { description: "Sign in to your account",                        submitLabel: "Sign In" },
    signup: { description: "Create an account to get started",               submitLabel: "Sign Up" },
    forgot: { description: "Enter your email and we'll send a reset link",   submitLabel: "Send Reset Link" },
    reset:  { description: "Choose a strong new password",                   submitLabel: "Update Password" },
  };

  const { description, submitLabel } = viewMeta[view];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE0YzAtMS4xLS45LTItMi0yaC04Yy0xLjEgMC0yIC45LTIgMnY4YzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMnYtOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>

      <Card className="w-full max-w-md shadow-2xl border-border bg-card/90 backdrop-blur relative z-10 animate-fade-in">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <div className="relative rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 shadow-lg">
                <BookOpen className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          <div>
            <CardTitle className="text-4xl font-bold text-primary">recap.</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Your Personal Reference Builder</p>
          </div>
          <CardDescription className="text-foreground/70">{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email — shown for all views except reset */}
            {view !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Password — login and signup only */}
            {(view === "login" || view === "signup") && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {/* New password — reset only */}
            {view === "reset" && (
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : submitLabel}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-3">
            {view === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-muted-foreground hover:text-foreground transition-colors block w-full"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => setView("signup")}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}

            {view === "signup" && (
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Already have an account? Sign in
              </button>
            )}

            {(view === "forgot" || view === "reset") && (
              <button
                type="button"
                onClick={() => setView("login")}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </button>
            )}

            <div className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
                className="text-muted-foreground"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure Backend
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
