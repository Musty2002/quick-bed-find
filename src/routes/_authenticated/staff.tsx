import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient, useServerFn } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  adjustBeds,
  assignRole,
  getMyRoles,
  listAllRequests,
  listHospitals,
  setRequestStatus,
} from "@/lib/beds.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Hospital Staff Dashboard — CritiCare Beds" },
      { name: "description", content: "Update ICU bed availability and approve or decline incoming emergency bed requests." },
      { property: "og:title", content: "Hospital Staff Dashboard — CritiCare Beds" },
      { property: "og:description", content: "Update ICU bed availability and approve or decline incoming emergency bed requests." },
    ],
  }),
  component: StaffDashboard,
});

function StaffDashboard() {
  const queryClient = useQueryClient();
  const fetchRoles = useServerFn(getMyRoles);
  const fetchRequests = useServerFn(listAllRequests);
  const fetchHospitals = useServerFn(listHospitals);
  const runSetStatus = useServerFn(setRequestStatus);
  const runAdjustBeds = useServerFn(adjustBeds);
  const runAssignRole = useServerFn(assignRole);

  const rolesQuery = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const roles = rolesQuery.data ?? [];
  const isStaff = roles.includes("staff") || roles.includes("admin");

  const requestsQuery = useQuery({
    queryKey: ["all-requests"],
    queryFn: () => fetchRequests(),
    enabled: isStaff,
    retry: false,
  });
  const hospitalsQuery = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => fetchHospitals(),
  });

  useEffect(() => {
    const channel = supabase
      .channel("staff-live")
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

  async function claimRole(role: "staff" | "admin") {
    try {
      await runAssignRole({ data: { role } });
      await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
      toast.success(`You now have the ${role} role`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign role");
    }
  }

  async function handleStatus(id: string, status: "Approved" | "Declined") {
    try {
      await runSetStatus({ data: { id, status } });
      queryClient.invalidateQueries({ queryKey: ["all-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast.success(`Request ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function handleAdjust(hospitalId: string, delta: number) {
    try {
      await runAdjustBeds({ data: { hospitalId, delta } });
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
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

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Staff access required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This dashboard is for hospital staff. Choose a role to continue (demo).
              </p>
              <div className="flex gap-2">
                <Button onClick={() => claimRole("staff")}>I'm hospital staff</Button>
                <Button variant="outline" onClick={() => claimRole("admin")}>I'm an admin</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const requests = (requestsQuery.data ?? []) as any[];
  const hospitals = hospitalsQuery.data ?? [];
  const pending = requests.filter((r) => r.status === "Pending");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hospital staff dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep bed counts current and respond to requests.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incoming requests ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">
                    {r.patient_name} <span className="text-muted-foreground">· {r.condition}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.hospitals?.name} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{r.severity}</Badge>
                  <Button size="sm" onClick={() => handleStatus(r.id, "Approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, "Declined")}>Decline</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bed availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hospitals.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">{h.name}</p>
                  <p className="text-sm text-muted-foreground">{h.city}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAdjust(h.id, -1)}>−</Button>
                  <span className="w-20 text-center text-sm text-foreground">{h.icu_free}/{h.icu_total} free</span>
                  <Button size="sm" variant="outline" onClick={() => handleAdjust(h.id, 1)}>+</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
