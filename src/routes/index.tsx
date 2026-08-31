import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { createBedRequest, listHospitals, listMyRequests } from "@/lib/beds.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["hospitals"],
      queryFn: () => listHospitals(),
    }),
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runCreateRequest = useServerFn(createBedRequest);
  const fetchMyRequests = useServerFn(listMyRequests);

  const hospitalsQuery = useSuspenseQuery({
    queryKey: ["hospitals"],
    queryFn: () => listHospitals(),
  });
  const hospitals = hospitalsQuery.data;

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const myRequestsQuery = useQuery({
    queryKey: ["my-requests"],
    queryFn: () => fetchMyRequests(),
    enabled: signedIn,
    retry: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel("home-live")
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

  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState("");
  const [condition, setCondition] = useState("");

  const results = hospitals.filter((h) =>
    (h.name + h.city).toLowerCase().includes(query.toLowerCase()),
  );

  async function request(hospitalId: string) {
    if (!patient.trim() || !condition.trim()) {
      toast.error("Enter patient name and condition first");
      return;
    }
    if (!signedIn) {
      navigate({ to: "/auth", search: { redirect: "/" } });
      return;
    }
    try {
      await runCreateRequest({
        data: { hospitalId, patientName: patient, condition, severity: "Critical" },
      });
      toast.success("Request sent to the hospital");
      setPatient("");
      setCondition("");
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send request");
    }
  }

  const myRequests = (myRequestsQuery.data ?? []) as any[];

  return (
    <div className="min-h-screen bg-background">
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
                    {h.city} · {h.distance_km} km · {h.ventilators} ventilators free
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={h.icu_free > 0 ? "default" : "secondary"}>
                    {h.icu_free}/{h.icu_total} ICU free
                  </Badge>
                  <Button size="sm" disabled={h.icu_free === 0} onClick={() => request(h.id)}>
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
            {!signedIn && (
              <p className="text-sm text-muted-foreground">Sign in to see your booking requests.</p>
            )}
            {signedIn && myRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            )}
            {myRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">
                  {r.patient_name} — {r.hospitals?.name}
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
