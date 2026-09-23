import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Cross, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/roles";
import { useMyRoles } from "@/components/StaffShell";

export function AppHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { data: myRoles } = useMyRoles();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
      queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const links = email ? ROLES.filter((r) => myRoles?.includes(r.role)) : [];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-deep text-deep-foreground shadow-soft">
            <Cross className="h-4 w-4" strokeWidth={2.6} />
          </span>
          <span className="truncate font-display text-base font-semibold text-foreground">CritiCare HMS</span>
        </Link>
        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          {email ? (
            <Button size="sm" variant="outline" className="ml-1" onClick={handleSignOut}>
              Sign out
            </Button>
          ) : (
            <Button size="sm" className="ml-1" onClick={() => navigate({ to: "/auth", search: { redirect: "/" } })}>
              Staff sign in
            </Button>
          )}
          {links.length > 0 && (
            <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen((v) => !v)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      {open && (
        <nav className="grid gap-1 border-t border-border/70 px-4 py-2 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
