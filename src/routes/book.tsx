import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, BedDouble, Building2, CheckCircle2, MapPin, Search, Wind } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { QrPass } from "@/components/QrPass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { createPublicBedRequest, listHospitals, lookupMyPass } from "@/lib/beds.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an ICU Bed in Seconds — CritiCare Beds" },
      {
        name: "description",
        content:
          "No sign-up needed. Pick a hospital in Kano, Dutse or Azare, answer three quick prompts and get a QR pass for instant hospital check-in.",
      },
      { property: "og:title", content: "Book an ICU Bed in Seconds — CritiCare Beds" },
      {
        property: "og:description",
        content: "Reserve a critical-care bed with no sign-up and check in with a QR pass.",
      },
    ],
  }),
  component: BookPage,
});

const severities = [
  { key: "Critical", hint: "Unresponsive, severe bleeding, breathing failure" },
  { key: "Serious", hint: "Conscious but unstable, needs urgent care" },
  { key: "Stable", hint: "Stable, needs a monitored bed" },
] as const;

const STORE_KEY = "criticare.passes";

function readCodes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function BookPage() {
  const queryClient = useQueryClient();
  const runCreate = useServerFn(createPublicBedRequest);
  const runLookup = useServerFn(lookupMyPass);

  const hospitalsQuery = useQuery({ queryKey: ["hospitals"], queryFn: () => listHospitals() });
  const [codes, setCodes] = useState<string[]>([]);
  useEffect(() => setCodes(readCodes()), []);

  const passesQuery = useQuery({
    queryKey: ["my-passes", codes],
    queryFn: () => runLookup({ data: { codes } }),
    enabled: codes.length > 0,
  });

  useEffect(() => {
    const channel = supabase
      .channel("public-book-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "hospitals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bed_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-passes"] });
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
  const [severity, setSeverity] = useState<(typeof severities)[number]["key"]>("Critical");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const hospitals = hospitalsQuery.data ?? [];
  const chosen = hospitals.find((h) => h.id === hospitalId) ?? null;
  const results = useMemo(
    () => hospitals.filter((h) => (h.name + h.city).toLowerCase().includes(query.toLowerCase())),
    [hospitals, query],
  );
  const passes = (passesQuery.data ?? []) as any[];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hospitalId) return;
    setBusy(true);
    try {
      const row: any = await runCreate({
        data: {
          hospitalId,
          patientName: name,
          condition,
          severity,
          phone,
          age: age ? Number(age) : null,
        },
      });
      const next = [row.reservation_code, ...readCodes().filter((c) => c !== row.reservation_code)].slice(0, 20);
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      setCodes(next);
      setNewCode(row.reservation_code);
      setStep(3);
      setName("");
      setCondition("");
      setPhone("");
      setAge("");
      toast.success("Reservation sent to the hospital");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request");
    } finally {
      setBusy(false);
    }
  }

  const stepLabel = step === 1 ? "Choose the hospital" : step === 2 ? "Patient details" : "Your QR pass";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:py-12">
        <header className="space-y-3">
          <Badge variant="secondary" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> No sign-up needed
          </Badge>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Book a critical-care bed</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  n <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Step {step} of 3 — {stepLabel}
          </p>
        </header>

        {step === 1 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 pl-9"
                placeholder="Search hospital or city (Kano, Dutse, Azare)"
              />
            </div>
            {results.map((h) => (
              <Card key={h.id} className="overflow-hidden border-border/70 shadow-soft transition-shadow hover:shadow-lift">
                <CardContent className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0 space-y-1.5">
                    <p className="flex items-center gap-2 font-display font-semibold text-foreground">
                      <Building2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{h.name}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {h.city}
                      </span>
                      <span>{h.distance_km} km</span>
                      <span className="inline-flex items-center gap-1">
                        <Wind className="h-3.5 w-3.5" /> {h.ventilators} ventilators
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <Badge
                      variant={h.icu_free > 0 ? "default" : "secondary"}
                      className="gap-1.5 px-2.5 py-1"
                    >
                      <BedDouble className="h-3.5 w-3.5" />
                      {h.icu_free}/{h.icu_total} free
                    </Badge>
                    <Button
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
          <Card className="border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">
                {chosen.name} · <span className="text-muted-foreground">{chosen.city}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Patient name</Label>
                    <Input id="name" required className="h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. A. Musa" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="condition">What happened?</Label>
                    <Input id="condition" required className="h-11" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Road accident" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" className="h-11" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" min={0} max={120} className="h-11" value={age} onChange={(e) => setAge(e.target.value)} placeholder="34" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>How urgent?</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {severities.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSeverity(s.key)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          severity === s.key
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <span className="block text-sm font-semibold">{s.key}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="lg" disabled={busy}>
                    {busy ? "Sending…" : "Reserve the bed"}
                  </Button>
                  <Button type="button" size="lg" variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && newCode && (
          <Card className="border-primary/30 shadow-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-vital" />
                Show this at {chosen?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <QrPass code={newCode} size={190} />
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                Hospital staff scan this pass to pull up the patient details on arrival. Keep this page
                or take a screenshot.
              </p>
              <Button variant="outline" onClick={() => { setStep(1); setNewCode(null); }}>
                Make another booking
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Your passes on this device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {passes.length === 0 && (
              <p className="text-sm text-muted-foreground">No reservations yet.</p>
            )}
            {passes.map((r) => (
              <div
                key={r.id}
                className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate font-medium text-foreground">
                    {r.patient_name} <span className="text-muted-foreground">· {r.condition}</span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {r.hospitals?.name} · {new Date(r.created_at).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        r.status === "Approved" ? "default" : r.status === "Declined" ? "destructive" : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                    {r.checked_in_at && <Badge variant="outline">Checked in</Badge>}
                  </div>
                </div>
                <QrPass code={r.reservation_code} size={112} />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
