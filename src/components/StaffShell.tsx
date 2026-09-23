import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import type { StaffRole } from "@/lib/roles";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as StaffRole[];
      const { data } = await supabase.from("staff_roles").select("role").eq("user_id", u.user.id);
      return (data ?? []).map((r) => r.role as StaffRole);
    },
  });
}

export function StaffShell({
  role,
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  role: StaffRole;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  const { data: roles, isLoading } = useMyRoles();
  const allowed = roles?.includes(role);
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="bg-gradient-deep text-deep-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-deep-foreground/15">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="text-sm opacity-80">{subtitle}</p>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : allowed ? (
          children
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-lg font-semibold">No access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account does not have the {title} role. Ask the admin to grant it.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Back home</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: "bg-accent text-accent-foreground",
    in_consultation: "bg-primary/15 text-primary",
    completed: "bg-muted text-muted-foreground",
    requested: "bg-accent text-accent-foreground",
    unpaid: "bg-destructive/15 text-destructive",
    paid: "bg-primary/15 text-primary",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] ?? "bg-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
