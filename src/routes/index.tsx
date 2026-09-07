import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Activity,
  BedDouble,
  Building2,
  ClipboardList,
  MapPin,
  QrCode,
  ShieldCheck,
  Wind,
  Zap,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listHospitals } from "@/lib/beds.functions";
import heroImage from "@/assets/hero-icu.jpg";

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
          "Book a critical-care bed in seconds, no sign-up needed. Live ICU availability across hospitals in Kano, Dutse (Jigawa) and Azare, with a QR pass for fast check-in.",
      },
      { property: "og:title", content: "CritiCare Beds — Emergency ICU Bed Booking" },
      {
        property: "og:description",
        content:
          "Live ICU availability across Kano, Dutse and Azare hospitals. Reserve a bed with no sign-up and check in with a QR pass.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Building2, title: "Pick the hospital", body: "See live ICU beds and ventilators nearby, then tap select." },
  { icon: ClipboardList, title: "Answer 3 prompts", body: "Name, what happened, how urgent. Nothing else." },
  { icon: QrCode, title: "Arrive with a QR pass", body: "The ward scans it and pulls up the patient instantly." },
];

const roles = [
  {
    key: "patient",
    icon: Zap,
    title: "Patient / Responder",
    blurb: "Reserve a bed in under a minute. No account, no waiting.",
    to: "/book" as const,
    cta: "Book a bed now",
    auth: false,
  },
  {
    key: "staff",
    icon: ShieldCheck,
    title: "Hospital staff",
    blurb: "Manage your hospital's requests, bed counts, QR check-in and records.",
    to: "/staff" as const,
    cta: "Staff sign in",
    auth: true,
  },
  {
    key: "admin",
    icon: Activity,
    title: "Administrator",
    blurb: "Add hospitals, assign staff and watch the whole network.",
    to: "/admin" as const,
    cta: "Admin sign in",
    auth: true,
  },
];

function Landing() {
  const navigate = useNavigate();
  const hospitals = useSuspenseQuery({
    queryKey: ["hospitals"],
    queryFn: () => listHospitals(),
  }).data;

  const freeBeds = hospitals.reduce((s, h) => s + h.icu_free, 0);
  const totalBeds = hospitals.reduce((s, h) => s + h.icu_total, 0);
  const ventilators = hospitals.reduce((s, h) => s + h.ventilators, 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden bg-gradient-deep text-deep-foreground">
          <img
            src={heroImage}
            alt="Intensive care unit bed with monitoring equipment in a hospital ward"
            width={1600}
            height={1008}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <div className="max-w-2xl">
              <Badge className="gap-1.5 border-0 bg-vital text-vital-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vital-foreground" />
                {freeBeds} ICU beds free right now
              </Badge>
              <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
                Emergency critical-care beds, booked in seconds
              </h1>
              <p className="mt-4 max-w-xl text-sm text-deep-foreground/80 sm:text-lg">
                Live ICU availability across hospitals in Kano, Dutse (Jigawa) and Azare. Choose a
                hospital, answer three prompts, arrive with a QR pass the ward can scan — no sign-up
                required.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" className="bg-vital text-vital-foreground hover:bg-vital/90" onClick={() => navigate({ to: "/book" })}>
                  Book a bed now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-deep-foreground/30 bg-transparent text-deep-foreground hover:bg-deep-foreground/10 hover:text-deep-foreground"
                  onClick={() => navigate({ to: "/auth", search: { redirect: "/staff" } })}
                >
                  I work at a hospital
                </Button>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  { label: "Hospitals live", value: hospitals.length },
                  { label: "ICU beds tracked", value: totalBeds },
                  { label: "Ventilators", value: ventilators },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-deep-foreground/10 p-3 backdrop-blur-sm">
                    <dt className="text-xs text-deep-foreground/70">{s.label}</dt>
                    <dd className="font-display text-2xl font-bold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Three taps between the emergency and a bed
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.title} className="border-border/70 shadow-soft">
                <CardContent className="space-y-3 pt-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <p className="font-display font-semibold text-foreground">
                    {i + 1}. {s.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <h2 className="text-center font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Continue as
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {roles.map((r) => (
                <Card
                  key={r.key}
                  className="flex flex-col justify-between border-border/70 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <CardContent className="space-y-3 pt-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-deep text-deep-foreground">
                      <r.icon className="h-5 w-5" />
                    </span>
                    <p className="font-display font-semibold text-foreground">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.blurb}</p>
                  </CardContent>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant={r.key === "patient" ? "default" : "outline"}
                      onClick={() =>
                        r.auth
                          ? navigate({ to: "/auth", search: { redirect: r.to } })
                          : navigate({ to: r.to })
                      }
                    >
                      {r.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="grid gap-3 sm:flex sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Live availability</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Updated the moment a ward changes its bed count.
              </p>
            </div>
            <Badge variant="secondary" className="w-fit gap-1.5">
              <BedDouble className="h-3.5 w-3.5" /> {freeBeds} of {totalBeds} free
            </Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {hospitals.map((h) => (
              <Card key={h.id} className="border-border/70 shadow-soft">
                <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5">
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate font-display font-semibold text-foreground">{h.name}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {h.city}
                      </span>
                      <span>{h.distance_km} km</span>
                      <span className="inline-flex items-center gap-1">
                        <Wind className="h-3.5 w-3.5" /> {h.ventilators}
                      </span>
                    </p>
                  </div>
                  <Badge variant={h.icu_free > 0 ? "default" : "secondary"} className="shrink-0">
                    {h.icu_free}/{h.icu_total} ICU
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={() => navigate({ to: "/book" })}>
              Book a bed now
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
          CritiCare Beds — emergency critical-care bed coordination for Kano, Dutse (Jigawa) and Azare.
          In a life-threatening emergency, always call your local emergency line as well.
        </div>
      </footer>
    </div>
  );
}
