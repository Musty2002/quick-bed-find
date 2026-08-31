import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles, listAllRequests, listHospitals } from "@/lib/beds.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Network Admin Overview — CritiCare Beds" },
      { name: "description", content: "Network-wide view of ICU capacity, occupancy and emergency booking activity across hospitals." },
      { property: "og:title", content: "Network Admin Overview — CritiCare Beds" },
      { property: "og:description", content: "Network-wide view of ICU capacity, occupancy and emergency booking activity across hospitals." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const queryClient = useQueryClient();
  const fetchRoles = useServerFn(getMyRoles);
  const fetchRequests = useServerFn(listAllRequests);
  const fetchHospitals = useServerFn(listHospitals);

  const rolesQuery = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const roles = rolesQuery.data ?? [];
  const isStaff = roles.includes("staff") || roles.includes("admin");

  const requestsQuery = useQuery({
    queryKey: ["all-requests"],
    queryFn: () => fetchRequests(),
    enabled: isStaff,
    retry: false,
  });
  const hospitalsQuery = useQuery({ queryKey: ["hospitals"], queryFn: () => fetchHospitals() });

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

  const hospitals = hospitalsQuery.data ?? [];
  const requests = (requestsQuery.data ?? []) as any[];

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
          <h1 className="text-2xl font-semibold text-foreground">Network overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Capacity and booking activity across all connected hospitals.</p>
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
            <CardTitle className="text-base">Hospitals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hospitals.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">{h.name} <span className="text-muted-foreground">· {h.city}</span></span>
                <Badge variant={h.icu_free > 0 ? "default" : "destructive"}>{h.icu_free}/{h.icu_total} free</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All booking requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isStaff && <p className="text-sm text-muted-foreground">Staff or admin role required to view requests.</p>}
            {isStaff && requests.length === 0 && (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            )}
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0 last:pb-0">
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
