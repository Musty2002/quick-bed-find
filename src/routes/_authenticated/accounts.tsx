import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StaffShell, StatusBadge } from "@/components/StaffShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — CritiCare HMS" },
      { name: "description", content: "Bill patients for consultations and lab tests and record payments." },
      { property: "og:title", content: "Accounts — CritiCare HMS" },
      { property: "og:description", content: "Bill patients and record payments." },
    ],
  }),
  component: () => (
    <StaffShell role="accountant" title="Accounts" subtitle="Patient billing and payments" icon={Banknote}>
      <AccountsPage />
    </StaffShell>
  ),
});

function AccountsPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visits = useQuery({
    queryKey: ["acct-visits"],
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, status, created_at, patients(full_name, hospital_no), charges(amount, status)")
        .order("created_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
    refetchInterval: 15000,
  });
  const all = (visits.data ?? []).flatMap((v: any) => v.charges ?? []);
  const paid = all.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const owed = all.filter((c: any) => c.status === "unpaid").reduce((s: number, c: any) => s + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Collected</p><p className="font-display text-2xl font-bold text-primary">{naira(paid)}</p></div>
        <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-display text-2xl font-bold text-destructive">{naira(owed)}</p></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="divide-y rounded-2xl border bg-card">
          {visits.data?.map((v: any) => {
            const due = (v.charges ?? []).filter((c: any) => c.status === "unpaid").reduce((s: number, c: any) => s + Number(c.amount), 0);
            return (
              <button key={v.id} onClick={() => setActiveId(v.id)} className={`block w-full p-3 text-left hover:bg-accent ${activeId === v.id ? "bg-accent" : ""}`}>
                <div className="flex items-center justify-between"><span className="font-medium">{v.patients?.full_name}</span>{due > 0 && <span className="text-xs font-semibold text-destructive">{naira(due)} due</span>}</div>
                <p className="text-xs text-muted-foreground">{v.patients?.hospital_no} · {new Date(v.created_at).toLocaleDateString()}</p>
              </button>
            );
          })}
          {visits.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No visits yet.</p>}
        </div>
        {activeId ? <Bill visitId={activeId} /> : <div className="grid place-items-center rounded-2xl border border-dashed p-10 text-sm text-muted-foreground">Choose a visit to bill.</div>}
      </div>
    </div>
  );
}

function Bill({ visitId }: { visitId: string }) {
  const qc = useQueryClient();
  const [item, setItem] = useState({ description: "", amount: "" });
  const bill = useQuery({
    queryKey: ["bill", visitId],
    queryFn: async () => {
      const [v, c, l] = await Promise.all([
        supabase.from("visits").select("*, patients(*)").eq("id", visitId).single(),
        supabase.from("charges").select("*").eq("visit_id", visitId).order("created_at"),
        supabase.from("lab_tests").select("test_name").eq("visit_id", visitId),
      ]);
      return { visit: v.data as any, charges: c.data ?? [], labs: l.data ?? [] };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["bill", visitId] }); qc.invalidateQueries({ queryKey: ["acct-visits"] }); };
  if (!bill.data?.visit) return <p className="text-muted-foreground">Loading…</p>;
  const { visit, charges, labs } = bill.data;
  const billed = new Set(charges.map((c: any) => c.description));
  const suggestions = [{ d: "Consultation fee", a: 5000 }, { d: "Registration / card", a: 1000 }, ...labs.map((l: any) => ({ d: `Lab: ${l.test_name}`, a: 3000 }))].filter((s) => !billed.has(s.d));

  async function add(description: string, amount: number) {
    const { error } = await supabase.from("charges").insert({ visit_id: visitId, patient_id: visit.patient_id, description, amount });
    if (error) return toast.error(error.message);
    setItem({ description: "", amount: "" });
    refresh();
  }
  async function pay(id: string, method: string) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("charges").update({ status: "paid", method, received_by: u.user?.id, paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    refresh();
  }
  const total = charges.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const due = charges.filter((c: any) => c.status === "unpaid").reduce((s: number, c: any) => s + Number(c.amount), 0);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="font-display text-xl font-bold">{visit.patients.full_name}</h2>
        <p className="text-sm text-muted-foreground">{visit.patients.hospital_no} · visit on {new Date(visit.created_at).toLocaleString()}</p>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s.d} onClick={() => add(s.d, s.a)} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent">
              <Plus className="h-3 w-3" /> {s.d} ({naira(s.a)})
            </button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); add(item.description, Number(item.amount)); }} className="flex flex-wrap gap-2">
        <Input required className="min-w-40 flex-1" placeholder="Item" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
        <Input required type="number" min={0} className="w-32" placeholder="Amount ₦" value={item.amount} onChange={(e) => setItem({ ...item, amount: e.target.value })} />
        <Button type="submit">Add</Button>
      </form>
      <div className="divide-y rounded-xl border">
        {charges.map((c: any) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="flex-1 font-medium">{c.description}</span>
            <span className="font-semibold">{naira(c.amount)}</span>
            <StatusBadge status={c.status} />
            {c.status === "unpaid" ? (
              <>
                <Button size="sm" onClick={() => pay(c.id, "Cash")}>Cash</Button>
                <Button size="sm" variant="outline" onClick={() => pay(c.id, "Transfer")}>Transfer</Button>
                <Button size="icon" variant="ghost" aria-label="Remove" onClick={async () => { await supabase.from("charges").delete().eq("id", c.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">{c.method}</span>
            )}
          </div>
        ))}
        {charges.length === 0 && <p className="p-3 text-sm text-muted-foreground">No items billed yet.</p>}
      </div>
      <div className="flex justify-between border-t pt-3 text-sm">
        <span>Total {naira(total)}</span>
        <strong className={due > 0 ? "text-destructive" : "text-primary"}>{due > 0 ? `${naira(due)} outstanding` : "Fully paid"}</strong>
      </div>
    </div>
  );
}
