import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import coverImg from "@/assets/login-cover.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/app" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            data: { display_name: name },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className={cn("flex flex-col gap-6")}>
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form onSubmit={submit} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="font-display text-3xl">
                      {mode === "signin" ? "Welcome back" : "Create your account"}
                    </h1>
                    <p className="text-balance text-sm text-muted-foreground">
                      {mode === "signin"
                        ? "Login to your CashLens AI account"
                        : "Start spending with clarity today"}
                    </p>
                  </div>

                  {mode === "signup" && (
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <a
                          href="#"
                          className="ml-auto text-sm underline-offset-2 hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            toast.info("Password reset coming soon.");
                          }}
                        >
                          Forgot your password?
                        </a>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Please wait…" : mode === "signin" ? "Login" : "Create account"}
                  </Button>

                  <div className="relative text-center text-sm">
                    <div className="absolute inset-0 top-1/2 h-px bg-border" />
                    <span className="relative bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>

                  <Button variant="outline" type="button" className="w-full" onClick={google}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    >
                      {mode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>
              </form>

              <div className="relative hidden bg-muted md:block">
                <img
                  src={coverImg}
                  alt="CashLens AI — spend with clarity"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  width={1024}
                  height={1280}
                />
              </div>
            </CardContent>
          </Card>

          <p className="px-6 text-center text-xs text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← Back home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
