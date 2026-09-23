import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, HeartPulse } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useMyRoles } from "@/components/StaffShell";
import { ROLES } from "@/lib/roles";
import heroImage from "@/assets/hero-icu.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CritiCare HMS — Hospital Management System" },
      {
        name: "description",
        content:
          "Hospital management for records, doctors, laboratory, accounts and admin: register patients, consult, test, prescribe and bill in one place.",
      },
      { property: "og:title", content: "CritiCare HMS — Hospital Management System" },
      {
        property: "og:description",
        content: "One system for records, doctors, laboratory, accounts and administration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const flow = ["Records registers patient", "Doctor consults", "Lab runs tests", "Accountant bills"];

function Home() {
  const navigate = useNavigate();
  const { data: roles } = useMyRoles();

  function go(role: string, to: string) {
    if (roles?.includes(role as never)) navigate({ to });
    else navigate({ to: "/auth", search: { redirect: to } });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <section className="relative overflow-hidden">
        <img src={heroImage} alt="Hospital ward" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-deep opacity-90" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-deep-foreground sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-deep-foreground/15 px-3 py-1 text-xs font-semibold">
            <HeartPulse className="h-3.5 w-3.5" /> Hospital Management System
          </span>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            Every patient, from front desk to final payment.
          </h1>
          <p className="mt-4 max-w-xl text-base opacity-85">
            Choose your desk below and sign in to start work.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            {flow.map((f, i) => (
              <span key={f} className="flex items-center gap-2">
                <span className="rounded-full bg-deep-foreground/15 px-3 py-1.5 font-medium">
                  {i + 1}. {f}
                </span>
                {i < flow.length - 1 && <ArrowRight className="h-4 w-4 opacity-70" />}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold">Where are you working today?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((r) => (
            <button
              key={r.role}
              onClick={() => go(r.role, r.to)}
              className="group flex flex-col rounded-2xl border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <r.icon className="h-5 w-5" />
              </span>
              <span className="mt-4 font-display text-lg font-semibold">{r.label}</span>
              <span className="mt-1 flex-1 text-sm text-muted-foreground">{r.desc}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        CritiCare HMS · Federal University Dutse project
      </footer>
    </div>
  );
}
