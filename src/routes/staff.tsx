import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adjustBeds, setRequestStatus, useStore } from "@/lib/store";

export const Route = createFileRoute("/staff")({
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
  const { hospitals, requests } = useStore();
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
                    {r.patient} <span className="text-muted-foreground">· {r.condition}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hospitals.find((h) => h.id === r.hospitalId)?.name} · {r.createdAt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{r.severity}</Badge>
                  <Button size="sm" onClick={() => setRequestStatus(r.id, "Approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => setRequestStatus(r.id, "Declined")}>Decline</Button>
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
                  <Button size="sm" variant="outline" onClick={() => adjustBeds(h.id, -1)}>−</Button>
                  <span className="w-20 text-center text-sm text-foreground">{h.icuFree}/{h.icuTotal} free</span>
                  <Button size="sm" variant="outline" onClick={() => adjustBeds(h.id, 1)}>+</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
