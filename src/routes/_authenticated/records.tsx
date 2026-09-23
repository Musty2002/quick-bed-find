import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Search, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { StaffShell, StatusBadge } from "@/components/StaffShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { listDoctors } from "@/lib/hms.functions";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({
    meta: [
      { title: "Records — CritiCare HMS" },
      { name: "description", content: "Register patients and send them to a doctor." },
      { property: "og:title", content: "Records — CritiCare HMS" },
      { property: "og:description", content: "Register patients and send them to a doctor." },
    ],
  }),
  component: () => (
    <StaffShell role="records" title="Records" subtitle="Register patients and send them to a doctor" icon={ClipboardList}>
      <RecordsPage />
    </StaffShell>
  ),
});

type Patient = { id: string; hospital_no: string; full_name: string; gender: string; age: number | null; phone: string | null };

function RecordsPage() {
  const qc = useQueryClient();
  const fetchDoctors = useServerFn(listDoctors);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [form, setForm] = useState({ full_name: "", gender: "Male", age: "", phone: "", address: "" });
  const [send, setSend] = useState({ doctor_id: "", complaint: "" });

  const patients = useQuery({
    queryKey: ["patients", q],
    queryFn: async () => {
      let query = supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(30);
      if (q.trim()) query = query.or(`full_name.ilike.%${q.trim()}%,hospital_no.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`);
      const { data } = await query;
      return (data ?? []) as Patient[];
    },
  });
  const doctors = useQuery({ queryKey: ["doctors"], queryFn: () => fetchDoctors() });
  const visits = useQuery({
    queryKey: ["visits-today"],
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, status, complaint, doctor_id, created_at, patients(full_name, hospital_no)")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });
  const docName = (id: string | null) => doctors.data?.find((d) => d.id === id)?.full_name ?? "—";

  async function register(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("patients")
      .insert({
        full_name: form.full_name.trim(),
        gender: form.gender,
        age: form.age ? Number(form.age) : null,
        phone: form.phone || null,
        address: form.address || null,
        created_by: u.user?.id,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success(`Registered ${data.full_name} (${data.hospital_no})`);
    setForm({ full_name: "", gender: "Male", age: "", phone: "", address: "" });
    setSelected(data as Patient);
    qc.invalidateQueries({ queryKey: ["patients"] });
  }

  async function sendToDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !send.doctor_id) return toast.error("Choose a patient and a doctor");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("visits").insert({
      patient_id: selected.id,
      doctor_id: send.doctor_id,
      complaint: send.complaint,
      created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`${selected.full_name} sent to ${docName(send.doctor_id)}`);
    setSend({ doctor_id: "", complaint: "" });
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["visits-today"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={register} className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display font-semibold"><UserPlus className="h-4 w-4" /> New patient</h2>
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Age</Label>
            <Input type="number" min={0} max={130} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <Button type="submit" className="w-full">Register patient</Button>
      </form>

      <div className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display font-semibold"><Send className="h-4 w-4" /> Send to doctor</h2>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, hospital no. or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="max-h-52 divide-y overflow-auto rounded-xl border">
          {patients.data?.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${selected?.id === p.id ? "bg-accent" : ""}`}
            >
              <span className="font-medium">{p.full_name}</span>
              <span className="text-xs text-muted-foreground">{p.hospital_no} · {p.gender}{p.age ? `, ${p.age}` : ""}</span>
            </button>
          ))}
          {patients.data?.length === 0 && <p className="p-3 text-sm text-muted-foreground">No patients found.</p>}
        </div>
        <form onSubmit={sendToDoctor} className="space-y-3">
          <p className="text-sm">Patient: <strong>{selected?.full_name ?? "none selected"}</strong></p>
          <select required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={send.doctor_id} onChange={(e) => setSend({ ...send, doctor_id: e.target.value })}>
            <option value="">Choose doctor…</option>
            {doctors.data?.map((d) => <option key={d.id} value={d.id}>{d.full_name || d.email}</option>)}
          </select>
          <Textarea placeholder="Complaint / reason for visit" value={send.complaint} onChange={(e) => setSend({ ...send, complaint: e.target.value })} />
          <Button type="submit" className="w-full" disabled={!selected}>Send to doctor</Button>
        </form>
      </div>

      <div className="rounded-2xl border bg-card lg:col-span-2">
        <h2 className="border-b p-4 font-display font-semibold">Recent visits</h2>
        <div className="divide-y">
          {visits.data?.map((v: any) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="font-medium">{v.patients?.full_name}</span>
              <span className="text-muted-foreground">{v.patients?.hospital_no}</span>
              <span className="text-muted-foreground">→ {docName(v.doctor_id)}</span>
              <span className="ml-auto"><StatusBadge status={v.status} /></span>
            </div>
          ))}
          {visits.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No visits yet.</p>}
        </div>
      </div>
    </div>
  );
}
