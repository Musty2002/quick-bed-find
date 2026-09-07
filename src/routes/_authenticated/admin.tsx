import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  addHospital,
  assignStaffToHospital,
  claimRole,
  deleteHospital,
  getMyRoles,
  listAllRequests,
  listHospitals,
  listStaffAssignments,
  removeStaffAssignment,
} from "@/lib/beds.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Network Admin — CritiCare Beds" },
      {
        name: "description",
        content:
          "Add hospitals, assign staff to a hospital and monitor ICU capacity and emergency bookings across the network.",
      },
      { property: "og:title", content: "Network Admin — CritiCare Beds" },
      {
        property: "og:description",
        content: "Manage hospitals, staff assignments and network-wide ICU capacity.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchRoles = useServerFn(getMyRoles);
  const fetchRequests = useServerFn(listAllRequests);
  const fetchStaff = useServerFn(listStaffAssignments);
  const runClaim = useServerFn(claimRole);
  const runAddHospital = useServerFn(addHospital);
  const runDeleteHospital = useServerFn(deleteHospital);
  const runAssignStaff = useServerFn(assignStaffToHospital);
  const runRemoveStaff = useServerFn(removeStaffAssignment);

  const rolesQuery = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const isAdmin = (rolesQuery.data ?? []).includes("admin");

  const hospitalsQuery = useQuery({ queryKey: ["hospitals"], queryFn: () => listHospitals() });
  const requestsQuery = useQuery({
    queryKey: ["all-requests"],
    queryFn: () => fetchRequests(),
    enabled: isAdmin,
    retry: false,
  });
  const staffQuery = useQuery({
    queryKey: ["staff-assignments"],
    queryFn: () => fetchStaff(),
    enabled: isAdmin,
    retry: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bed_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-requests"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hospitals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const [form, setForm] = useState({ name: "", city: "", icuTotal: "10", icuFree: "10", ventilators: "4", distanceKm: "5" });
  const [staffEmail, setStaffEmail] = useState("");
  const [staffHospital, setStaffHospital] = useState("");

  const hospitals = hospitalsQuery.data ?? [];
  const requests = (requestsQuery.data ?? []) as any[];
  const staff = (staffQuery.data ?? []) as any[];

  async function claimAdmin() {
    try {
      await runClaim({ data: { role: "admin" } });
      await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
      toast.success("You are now an administrator");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not grant admin access");
    }
  }

  async function submitHospital(e: React.FormEvent) {
    e.preventDefault();
    try {
      await runAddHospital({
        data: {
          name: form.name,
          city: form.city,
          icuTotal: Number(form.icuTotal),
          icuFree: Number(form.icuFree),
          ventilators: Number(form.ventilators),
          distanceKm: Number(form.distanceKm),
        },
      });
      setForm({ ...form, name: "", city: "" });
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast.success("Hospital added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add hospital");
    }
  }

  async function submitStaff(e: React.FormEvent) {
    e.preventDefault();
    try {
      await runAssignStaff({ data: { email: staffEmail, hospitalId: staffHospital } });
      setStaffEmail("");
      queryClient.invalidateQueries({ queryKey: ["staff-assignments"] });
      toast.success("Staff member assigned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign staff");
    }
  }

  if (rolesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">Loading…</main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Administrator access required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Only administrators can manage hospitals and staff. If no administrator exists yet,
                you can claim the first account.
              </p>
              <Button onClick={claimAdmin}>Claim administrator access</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const total = hospitals.reduce((s, h) => s + h.icu_total, 0);
  const free = hospitals.reduce((s, h) => s + h.icu_free, 0);
  const occupancy = total ? Math.round(((total - free) / total) * 100) : 0;
  const stats = [
    { label: "Hospitals", value: hospitals.length },
    { label: "ICU beds", value: total },
    { label: "Beds free", value: free },
    { label: "Occupancy", value: `${occupancy}%` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Network administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hospitals, staff and live activity.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a hospital</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitHospital} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-name">Hospital name</Label>
                <Input id="h-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-city">City</Label>
                <Input id="h-city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Kano" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-total">ICU beds</Label>
                <Input id="h-total" type="number" min={0} value={form.icuTotal} onChange={(e) => setForm({ ...form, icuTotal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-free">Beds free</Label>
                <Input id="h-free" type="number" min={0} value={form.icuFree} onChange={(e) => setForm({ ...form, icuFree: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-vent">Ventilators</Label>
                <Input id="h-vent" type="number" min={0} value={form.ventilators} onChange={(e) => setForm({ ...form, ventilators: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-dist">Distance (km)</Label>
                <Input id="h-dist" type="number" min={0} step="0.1" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
              </div>
              <div className="flex items-end sm:col-span-2">
                <Button type="submit">Add hospital</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hospitals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hospitals.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">
                  {h.name} <span className="text-muted-foreground">· {h.city}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={h.icu_free > 0 ? "default" : "destructive"}>
                    {h.icu_free}/{h.icu_total} free
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await runDeleteHospital({ data: { id: h.id } });
                        queryClient.invalidateQueries({ queryKey: ["hospitals"] });
                        toast.success("Hospital removed");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not remove");
                      }
                    }}
                  >
                    Remove
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitStaff} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-email">Staff email (must have signed up)</Label>
                <Input id="s-email" type="email" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="nurse@hospital.org" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-hospital">Hospital</Label>
                <select
                  id="s-hospital"
                  required
                  value={staffHospital}
                  onChange={(e) => setStaffHospital(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Select…</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end sm:col-span-3">
                <Button type="submit">Assign staff</Button>
              </div>
            </form>

            <div className="space-y-2">
              {staff.length === 0 && <p className="text-sm text-muted-foreground">No staff assigned yet.</p>}
              {staff.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                  <span className="text-foreground">
                    {s.email} <span className="text-muted-foreground">· {s.hospitalName}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await runRemoveStaff({ data: { id: s.id } });
                        queryClient.invalidateQueries({ queryKey: ["staff-assignments"] });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not remove");
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All booking activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">
                  {new Date(r.created_at).toLocaleString()} · {r.patient_name} → {r.hospitals?.name}
                </span>
                <Badge variant={r.status === "Approved" ? "default" : r.status === "Declined" ? "destructive" : "secondary"}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
