import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Cross, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import heroImage from "@/assets/hero-icu.jpg";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign In — HospitalManagement System" },
      { name: "description", content: "Sign in to access your hospital desk." },
      { property: "og:title", content: "Sign In — HospitalManagement System" },
      { property: "og:description", content: "Sign in to access your hospital desk." },
    ],
  }),
  component: AuthPage,
});

function sanitizeRedirect(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const target = sanitizeRedirect(redirect);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      if (target !== "/") sessionStorage.setItem("postAuthRedirect", target);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: target });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-stretch lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <img src={heroImage} alt="Modern hospital care team" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-deep/90" />
          <div className="motion-enter relative flex h-full max-w-xl flex-col justify-end p-12 text-deep-foreground">
            <span className="mb-auto grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lift"><Cross className="h-6 w-6" /></span>
            <ShieldCheck className="mb-5 h-8 w-8 text-primary" />
            <h1 className="font-display text-4xl font-bold">One secure workspace for every hospital team.</h1>
            <p className="mt-4 text-base text-deep-foreground/75">Access patient records, consultations, laboratory requests, payments, and administration from your assigned desk.</p>
          </div>
        </section>
        <section className="motion-enter flex items-center justify-center px-4 py-12 sm:px-8">
        <Card className="w-full max-w-md border-primary/10">
          <CardHeader>
            <span className="mb-3 w-fit rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase text-primary">Staff access</span>
            <CardTitle className="text-2xl">{mode === "signin" ? "Welcome back" : "Create account"}</CardTitle>
            <p className="text-sm text-muted-foreground">{mode === "signin" ? "Sign in to open your hospital workspace." : "Create your secure staff account."}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmail} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signin" ? "Sign in" : "Sign up"}
              </Button>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <p className="relative bg-card px-2 text-center text-xs text-muted-foreground w-fit mx-auto">
                or
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
              Continue with Google
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
        </section>
      </main>
    </div>
  );
}
