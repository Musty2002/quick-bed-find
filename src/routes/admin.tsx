import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin")({
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
  const { hospitals, requests } = useStore();
  const total = hospitals.reduce((s, h) => s + h.icuTotal, 0);
  const free = hospitals.reduce((s, h) => s + h.icuFree, 0);
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
                <Badge variant={h.icuFree > 0 ? "default" : "destructive"}>{h.icuFree}/{h.icuTotal} free</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All booking requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">
                  {r.createdAt} · {r.patient} → {hospitals.find((h) => h.id === r.hospitalId)?.name}
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
