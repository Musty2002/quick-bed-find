import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { StaffShell } from "@/components/StaffShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { createStaff, deleteStaff, listStaff, setStaffRoles } from "@/lib/hms.functions";
import { ROLES, naira, type StaffRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — CritiCare HMS" },
      { name: "description", content: "Add hospital staff and manage their roles." },
      { property: "og:title", content: "Admin — CritiCare HMS" },
      { property: "og:description", content: "Add hospital staff and manage their roles." },
    ],
  }),
  component: () => (
    <StaffShell role="admin" title="Admin" subtitle="Manage staff accounts and roles" icon={ShieldCheck}>
      <AdminPage />
    </StaffShell>
  ),
});

function AdminPage() {
  const qc = useQueryClient();
  const fetchStaff = useServerFn(listStaff);
  const runCreate = useServerFn(createStaff);
  const runSet = useServerFn(setStaffRoles);
  const runDelete = useServerFn(deleteStaff);
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => fetchStaff() });
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [p, v, l, c] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("visits").select("id", { count: "exact", head: true }).neq("status", "completed"),
        supabase.from("lab_tests").select("id", { count: "exact", head: true }).eq("status", "requested"),
        supabase.from("charges").select("amount").eq("status", "paid"),
      ]);
      return {
        patients: p.count ?? 0,
        active: v.count ?? 0,
        lab: l.count ?? 0,
        revenue: (c.data ?? []).reduce((s, x) => s + Number(x.amount), 0),
      };
    },
  });

  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [roles, setRoles] = useState<StaffRole[]>(["records"]);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await runCreate({ data: { ...form, roles } });
      toast.success("Staff account created");
      setForm({ full_name: "", email: "", password: "" });
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(userId: string, current: string[], role: StaffRole) {
    const next = (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]) as StaffRole[];
    try {
      await runSet({ data: { userId, roles: next } });
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Patients", stats.data?.patients],
          ["Active visits", stats.data?.active],
          ["Pending lab tests", stats.data?.lab],
          ["Revenue collected", naira(stats.data?.revenue ?? 0)],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 font-display text-2xl font-bold">{v ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={add} className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <UserPlus className="h-4 w-4" /> Add staff
          </h2>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            {ROLES.map((r) => (
              <label key={r.role} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={roles.includes(r.role)}
                  onCheckedChange={() =>
                    setRoles((cur) => (cur.includes(r.role) ? cur.filter((x) => x !== r.role) : [...cur, r.role]))
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={busy || roles.length === 0}>
            Create account
          </Button>
        </form>

        <div className="rounded-2xl border bg-card">
          <h2 className="border-b p-4 font-display font-semibold">Staff ({staff.data?.length ?? 0})</h2>
          <div className="divide-y">
            {staff.data?.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.full_name || s.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((r) => {
                    const on = s.roles.includes(r.role);
                    return (
                      <button
                        key={r.role}
                        onClick={() => toggle(s.id, s.roles, r.role)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete staff"
                  onClick={async () => {
                    if (!confirm(`Delete ${s.email}?`)) return;
                    try {
                      await runDelete({ data: { userId: s.id } });
                      qc.invalidateQueries({ queryKey: ["staff"] });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
