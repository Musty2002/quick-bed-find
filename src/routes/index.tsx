import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addRequest, useStore } from "@/lib/store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Find an ICU Bed — CritiCare Beds" },
      { name: "description", content: "Search live critical-care bed availability nearby and request an emergency booking in seconds." },
      { property: "og:title", content: "Find an ICU Bed — CritiCare Beds" },
      { property: "og:description", content: "Search live critical-care bed availability nearby and request an emergency booking in seconds." },
    ],
  }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const { hospitals, requests } = useStore();
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState("");
  const [condition, setCondition] = useState("");

  const results = hospitals.filter((h) =>
    (h.name + h.city).toLowerCase().includes(query.toLowerCase()),
  );

  function request(hospitalId: string) {
    if (!patient.trim() || !condition.trim()) {
      toast.error("Enter patient name and condition first");
      return;
    }
    addRequest({ patient, condition, hospitalId, severity: "Critical" });
    toast.success("Request sent to the hospital");
    setPatient("");
    setCondition("");
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Find a critical care bed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live ICU availability. Send a booking request straight to the hospital.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="patient">Patient name</Label>
              <Input id="patient" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="e.g. A. Musa" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="condition">Condition</Label>
              <Input id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Cardiac arrest" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hospital or city" />
          {results.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium text-foreground">{h.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {h.city} · {h.distanceKm} km · {h.ventilators} ventilators free
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={h.icuFree > 0 ? "default" : "secondary"}>
                    {h.icuFree}/{h.icuTotal} ICU free
                  </Badge>
                  <Button size="sm" disabled={h.icuFree === 0} onClick={() => request(h.id)}>
                    Request bed
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">
                  {r.patient} — {hospitals.find((h) => h.id === r.hospitalId)?.name}
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
