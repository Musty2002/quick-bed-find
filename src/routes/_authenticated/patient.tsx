import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { QrPass } from "@/components/QrPass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { claimRole, createBedRequest, listHospitals, listMyRequests } from "@/lib/beds.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient")({
  head: () => ({
    meta: [
      { title: "Book an ICU Bed — CritiCare Beds" },
      {
        name: "description",
        content:
          "Choose a hospital, answer a few emergency prompts and receive a QR reservation pass for hospital check-in.",
      },
      { property: "og:title", content: "Book an ICU Bed — CritiCare Beds" },
      {
        property: "og:description",
        content: "Reserve a critical-care bed in seconds and check in with a QR pass.",
      },
    ],
  }),
  component: PatientPage,
});

const severities = ["Critical", "Serious", "Stable"] as const;

function PatientPage() {
  const queryClient = useQueryClient();
  const runCreate = useServerFn(createBedRequest);
  const runClaim = useServerFn(claimRole);
  const fetchMine = useServerFn(listMyRequests);

  const hospitalsQuery = useQuery({ queryKey: ["hospitals"], queryFn: () => listHospitals() });
  const mineQuery = useQuery({ queryKey: ["my-requests"], queryFn: () => fetchMine(), retry: false });

  useEffect(() => {
    runClaim({ data: { role: "patient" } }).catch(() => {});
  }, [runClaim]);

  useEffect(() => {
    const channel = supabase
      .channel("patient-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "hospitals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bed_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("");
  const [severity, setSeverity] = useState<(typeof severities)[number]>("Critical");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const hospitals = hospitalsQuery.data ?? [];
  const chosen = hospitals.find((h) => h.id === hospitalId) ?? null;
  const results = hospitals.filter((h) =>
    (h.name + h.city).toLowerCase().includes(query.toLowerCase()),
  );
  const mine = (mineQuery.data ?? []) as any[];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hospitalId) return;
    setBusy(true);
    try {
      const row = await runCreate({
        data: {
          hospitalId,
          patientName: name,
          condition,
          severity,
          phone,
          age: age ? Number(age) : null,
        },
      });
      setNewCode((row as any).reservation_code);
      setStep(3);
      setName("");
      setCondition("");
      setPhone("");
      setAge("");
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      toast.success("Reservation sent to the hospital");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Book a critical-care bed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step} of 3 — {step === 1 ? "choose the hospital" : step === 2 ? "patient details" : "your pass"}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospital or city (Kano, Dutse, Azare)"
            />
            {results.map((h) => (
              <Card key={h.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium text-foreground">{h.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {h.city} · {h.distance_km} km · {h.ventilators} ventilators
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={h.icu_free > 0 ? "default" : "secondary"}>
                      {h.icu_free}/{h.icu_total} ICU free
                    </Badge>
                    <Button
                      size="sm"
                      disabled={h.icu_free === 0}
                      onClick={() => {
                        setHospitalId(h.id);
                        setStep(2);
                      }}
                    >
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {results.length === 0 && (
              <p className="text-sm text-muted-foreground">No hospital matches that search.</p>
            )}
          </div>
        )}

        {step === 2 && chosen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{chosen.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Patient name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. A. Musa" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="condition">What happened?</Label>
                    <Input id="condition" required value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Road accident" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="34" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>How urgent?</Label>
                  <div className="flex gap-2">
                    {severities.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={severity === s ? "default" : "outline"}
                        onClick={() => setSeverity(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? "Sending…" : "Reserve the bed"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && newCode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Show this at {chosen?.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <QrPass code={newCode} size={180} />
              <p className="text-center text-sm text-muted-foreground">
                Hospital staff will scan this pass to pull up the patient details on arrival.
              </p>
              <Button variant="outline" onClick={() => { setStep(1); setNewCode(null); }}>
                Make another booking
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your reservations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mine.length === 0 && <p className="text-sm text-muted-foreground">No reservations yet.</p>}
            {mine.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {r.patient_name} <span className="text-muted-foreground">· {r.condition}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.hospitals?.name} · {new Date(r.created_at).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "Approved" ? "default" : r.status === "Declined" ? "destructive" : "secondary"}>
                      {r.status}
                    </Badge>
                    {r.checked_in_at && <Badge variant="outline">Checked in</Badge>}
                  </div>
                </div>
                <QrPass code={r.reservation_code} size={110} />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
