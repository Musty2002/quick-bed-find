import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Pill, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StaffShell, StatusBadge } from "@/components/StaffShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor — CritiCare HMS" },
      { name: "description", content: "See your patients, request lab tests and write prescriptions." },
      { property: "og:title", content: "Doctor — CritiCare HMS" },
      { property: "og:description", content: "See your patients, request lab tests and write prescriptions." },
    ],
  }),
  component: () => (
    <StaffShell role="doctor" title="Doctor" subtitle="Your patient queue" icon={Stethoscope}>
      <DoctorPage />
    </StaffShell>
  ),
});

function DoctorPage() {
  const [showDone, setShowDone] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const queue = useQuery({
    queryKey: ["doctor-queue", showDone],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      let q = supabase
        .from("visits")
        .select("id, status, complaint, created_at, patients(full_name, hospital_no, gender, age)")
        .eq("doctor_id", u.user!.id)
        .order("created_at", { ascending: false });
      q = showDone ? q.eq("status", "completed") : q.neq("status", "completed");
      const { data } = await q;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border bg-card">
        <div className="flex gap-1 border-b p-2">
          {[false, true].map((d) => (
            <button key={String(d)} onClick={() => setShowDone(d)} className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${showDone === d ? "bg-accent" : "text-muted-foreground"}`}>
              {d ? "Completed" : "Waiting"}
            </button>
          ))}
        </div>
        <div className="divide-y">
          {queue.data?.map((v: any) => (
            <button key={v.id} onClick={() => setActiveId(v.id)} className={`block w-full p-3 text-left hover:bg-accent ${activeId === v.id ? "bg-accent" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{v.patients?.full_name}</span>
                <StatusBadge status={v.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.patients?.hospital_no} · {v.complaint || "No complaint noted"}</p>
            </button>
          ))}
          {queue.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No patients here.</p>}
        </div>
      </div>
      {activeId ? <Consultation visitId={activeId} /> : (
        <div className="grid place-items-center rounded-2xl border border-dashed p-10 text-sm text-muted-foreground">Choose a patient from the queue.</div>
      )}
    </div>
  );
}

function Consultation({ visitId }: { visitId: string }) {
  const qc = useQueryClient();
  const visit = useQuery({
    queryKey: ["visit", visitId],
    queryFn: async () => {
      const [v, l, r] = await Promise.all([
        supabase.from("visits").select("*, patients(*)").eq("id", visitId).single(),
        supabase.from("lab_tests").select("*").eq("visit_id", visitId).order("created_at"),
        supabase.from("prescriptions").select("*").eq("visit_id", visitId).order("created_at"),
      ]);
      return { visit: v.data as any, labs: l.data ?? [], rx: r.data ?? [] };
    },
    refetchInterval: 15000,
  });
  const [diag, setDiag] = useState({ diagnosis: "", notes: "" });
  const [test, setTest] = useState("");
  const [rx, setRx] = useState({ drug: "", dosage: "", frequency: "", duration: "" });

  useEffect(() => {
    const v = visit.data?.visit;
    if (v) setDiag({ diagnosis: v.diagnosis ?? "", notes: v.notes ?? "" });
  }, [visit.data?.visit?.id]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["visit", visitId] });
    qc.invalidateQueries({ queryKey: ["doctor-queue"] });
  };
  const v = visit.data?.visit;
  if (!v) return <p className="text-muted-foreground">Loading…</p>;
  const p = v.patients;

  async function save(status?: string) {
    const { error } = await supabase.from("visits").update({ ...diag, status: status ?? (v.status === "waiting" ? "in_consultation" : v.status) }).eq("id", visitId);
    if (error) return toast.error(error.message);
    toast.success(status === "completed" ? "Visit completed" : "Saved");
    refresh();
  }
  async function requestTest(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("lab_tests").insert({ visit_id: visitId, patient_id: p.id, test_name: test, requested_by: u.user?.id });
    if (error) return toast.error(error.message);
    setTest("");
    toast.success("Sent to laboratory");
    refresh();
  }
  async function addRx(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("prescriptions").insert({ ...rx, visit_id: visitId, patient_id: p.id, created_by: u.user?.id });
    if (error) return toast.error(error.message);
    setRx({ drug: "", dosage: "", frequency: "", duration: "" });
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-bold">{p.full_name}</h2>
          <StatusBadge status={v.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {p.hospital_no} · {p.gender}{p.age ? `, ${p.age} yrs` : ""}{p.phone ? ` · ${p.phone}` : ""}
        </p>
        <p className="mt-3 rounded-xl bg-muted p-3 text-sm"><strong>Complaint:</strong> {v.complaint || "—"}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Diagnosis</Label><Textarea value={diag.diagnosis} onChange={(e) => setDiag({ ...diag, diagnosis: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea value={diag.notes} onChange={(e) => setDiag({ ...diag, notes: e.target.value })} /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save()}>Save notes</Button>
          {v.status !== "completed" && <Button onClick={() => save("completed")}>Complete visit</Button>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="flex items-center gap-2 font-display font-semibold"><FlaskConical className="h-4 w-4" /> Lab tests</h3>
          <form onSubmit={requestTest} className="mt-3 flex gap-2">
            <Input required placeholder="e.g. Full blood count, Malaria parasite" value={test} onChange={(e) => setTest(e.target.value)} />
            <Button type="submit">Request</Button>
          </form>
          <div className="mt-3 space-y-2">
            {visit.data.labs.map((l: any) => (
              <div key={l.id} className="rounded-xl border p-3 text-sm">
                <div className="flex items-center justify-between"><strong>{l.test_name}</strong><StatusBadge status={l.status} /></div>
                {l.result && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{l.result}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="flex items-center gap-2 font-display font-semibold"><Pill className="h-4 w-4" /> Prescriptions</h3>
          <form onSubmit={addRx} className="mt-3 grid grid-cols-2 gap-2">
            <Input required className="col-span-2" placeholder="Drug" value={rx.drug} onChange={(e) => setRx({ ...rx, drug: e.target.value })} />
            <Input placeholder="Dosage (500mg)" value={rx.dosage} onChange={(e) => setRx({ ...rx, dosage: e.target.value })} />
            <Input placeholder="Frequency (2x daily)" value={rx.frequency} onChange={(e) => setRx({ ...rx, frequency: e.target.value })} />
            <Input placeholder="Duration (5 days)" value={rx.duration} onChange={(e) => setRx({ ...rx, duration: e.target.value })} />
            <Button type="submit">Add</Button>
          </form>
          <div className="mt-3 space-y-2">
            {visit.data.rx.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span><strong>{r.drug}</strong> <span className="text-muted-foreground">{[r.dosage, r.frequency, r.duration].filter(Boolean).join(" · ")}</span></span>
                <Button size="icon" variant="ghost" aria-label="Remove" onClick={async () => { await supabase.from("prescriptions").delete().eq("id", r.id); refresh(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
