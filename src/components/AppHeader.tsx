import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Cross, LogOut, Menu, X } from "lucide-react";
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
    let mounted = true;
    const loadEmail = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setEmail(data.user?.email ?? null);
    };
    void loadEmail();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void loadEmail();
      queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const links = email ? ROLES.filter((r) => myRoles?.includes(r.role)) : [];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className={email ? "sticky top-0 z-40 border-b bg-card/95 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r lg:border-sidebar-border lg:bg-sidebar" : "sticky top-0 z-40 border-b bg-card/95 backdrop-blur"}>
      <div className={email ? "flex h-16 items-center justify-between gap-3 px-4 lg:h-full lg:flex-col lg:items-stretch lg:px-4 lg:py-6" : "mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"}>
        <Link to="/" className="flex min-w-0 items-center gap-3 lg:px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
            <Cross className="h-5 w-5" strokeWidth={2.8} />
          </span>
          <span className={email ? "min-w-0 text-foreground lg:text-sidebar-foreground" : "min-w-0 text-foreground"}>
            <span className="block truncate font-display text-sm font-bold">HospitalManagement</span>
            <span className="block text-[10px] font-bold uppercase text-primary">System</span>
          </span>
        </Link>
        <div className={email ? "flex items-center gap-1 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:items-stretch lg:pt-8" : "flex items-center gap-1"}>
          <nav className={email ? "hidden gap-1 lg:flex lg:flex-col" : "hidden"}>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" }}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </nav>
          {email ? (
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:mt-auto lg:ml-0 lg:justify-start lg:text-sidebar-foreground lg:hover:bg-sidebar-accent lg:hover:text-sidebar-accent-foreground" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Button size="sm" className="ml-1" onClick={() => navigate({ to: "/auth", search: { redirect: "/" } })}>
              Staff sign in
            </Button>
          )}
          {links.length > 0 && (
            <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>
      {open && (
        <nav className="motion-enter grid gap-1 border-t border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground" }}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
