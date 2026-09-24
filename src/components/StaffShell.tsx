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
    <div className="min-h-screen bg-background lg:pl-64">
      <AppHeader />
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <span className="ml-auto hidden rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase text-primary sm:inline">{title} role</span>
        </div>
      </div>
      <main className="motion-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : allowed ? (
          children
        ) : (
          <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center shadow-soft">
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
