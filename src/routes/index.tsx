import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listHospitals } from "@/lib/beds.functions";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["hospitals"],
      queryFn: () => listHospitals(),
    }),
  head: () => ({
    meta: [
      { title: "CritiCare Beds — Emergency ICU Bed Booking in Kano, Dutse & Azare" },
      {
        name: "description",
        content:
          "Book a critical-care bed in seconds. Live ICU availability across hospitals in Kano, Dutse (Jigawa) and Azare, with a QR pass for fast hospital check-in.",
      },
      { property: "og:title", content: "CritiCare Beds — Emergency ICU Bed Booking" },
      {
        property: "og:description",
        content:
          "Live ICU availability across Kano, Dutse and Azare hospitals. Reserve a bed and check in with a QR pass.",
      },
    ],
  }),
  component: Landing,
});

const roles = [
  {
    key: "patient",
    title: "Patient / Responder",
    blurb: "Pick a hospital, answer a few quick prompts, get a QR pass.",
    to: "/patient" as const,
    cta: "Book a bed",
  },
  {
    key: "staff",
    title: "Hospital staff",
    blurb: "Manage your hospital: requests, bed counts, QR check-in, records.",
    to: "/staff" as const,
    cta: "Staff sign in",
  },
  {
    key: "admin",
    title: "Administrator",
    blurb: "Add hospitals, assign staff to hospitals, watch the whole network.",
    to: "/admin" as const,
    cta: "Admin sign in",
  },
];

function Landing() {
  const navigate = useNavigate();
  const hospitals = useSuspenseQuery({
    queryKey: ["hospitals"],
    queryFn: () => listHospitals(),
  }).data;

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

  const freeBeds = hospitals.reduce((s, h) => s + h.icu_free, 0);

  function go(to: "/patient" | "/staff" | "/admin") {
    if (signedIn) navigate({ to });
    else navigate({ to: "/auth", search: { redirect: to } });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              ER
            </span>
            <span className="text-sm font-semibold text-foreground">CritiCare Beds</span>
          </Link>
          {signedIn ? (
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/patient" })}>
              Go to my dashboard
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/auth", search: { redirect: "/" } })}>
              Sign in
            </Button>
          )}
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <Badge variant="secondary" className="mb-4">
              {freeBeds} ICU beds free right now
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Emergency critical-care beds, booked in seconds
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Live ICU availability across hospitals in Kano, Dutse (Jigawa) and Azare. Choose a
              hospital, answer three prompts, and arrive with a QR pass the ward can scan.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button size="lg" onClick={() => go("/patient")}>
                Book a bed now
              </Button>
              <Button size="lg" variant="outline" onClick={() => go("/staff")}>
                I work at a hospital
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Continue as
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {roles.map((r) => (
              <Card key={r.key} className="flex flex-col justify-between transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 pt-6">
                  <p className="font-semibold text-foreground">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.blurb}</p>
                </CardContent>
                <CardContent>
                  <Button className="w-full" variant={r.key === "patient" ? "default" : "outline"} onClick={() => go(r.to)}>
                    {r.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Live availability
          </h2>
          <div className="mt-4 space-y-2">
            {hospitals.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.city} · {h.distance_km} km · {h.ventilators} ventilators
                  </p>
                </div>
                <Badge variant={h.icu_free > 0 ? "default" : "secondary"}>
                  {h.icu_free}/{h.icu_total} ICU free
                </Badge>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
