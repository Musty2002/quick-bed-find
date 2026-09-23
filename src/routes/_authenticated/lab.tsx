import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { StaffShell, StatusBadge } from "@/components/StaffShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/lab")({
  head: () => ({
    meta: [
      { title: "Laboratory — CritiCare HMS" },
      { name: "description", content: "Receive lab test requests from doctors and enter results." },
      { property: "og:title", content: "Laboratory — CritiCare HMS" },
      { property: "og:description", content: "Receive lab test requests from doctors and enter results." },
    ],
  }),
  component: () => (
    <StaffShell role="lab" title="Laboratory" subtitle="Test requests from doctors" icon={FlaskConical}>
      <LabPage />
    </StaffShell>
  ),
});

function LabPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"requested" | "completed">("requested");
  const [results, setResults] = useState<Record<string, string>>({});
  const tests = useQuery({
    queryKey: ["lab", tab],
    queryFn: async () => {
      const { data } = await supabase
        .from("lab_tests")
        .select("*, patients(full_name, hospital_no, gender, age)")
        .eq("status", tab)
        .order("created_at", { ascending: tab === "requested" })
        .limit(50);
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  async function submit(id: string) {
    const result = results[id]?.trim();
    if (!result) return toast.error("Enter the result first");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("lab_tests")
      .update({ result, status: "completed", completed_by: u.user?.id, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Result sent to doctor");
    qc.invalidateQueries({ queryKey: ["lab"] });
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-xl border bg-card p-1">
        {(["requested", "completed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-accent" : "text-muted-foreground"}`}>
            {t === "requested" ? "Pending" : "Completed"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tests.data?.map((t: any) => (
          <div key={t.id} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold">{t.test_name}</h3>
              <StatusBadge status={t.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.patients?.full_name} · {t.patients?.hospital_no} · {t.patients?.gender}{t.patients?.age ? `, ${t.patients.age}` : ""}
            </p>
            {t.status === "requested" ? (
              <div className="mt-3 space-y-2">
                <Textarea placeholder="Enter result" value={results[t.id] ?? ""} onChange={(e) => setResults({ ...results, [t.id]: e.target.value })} />
                <Button onClick={() => submit(t.id)}>Submit result</Button>
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{t.result}</p>
            )}
          </div>
        ))}
        {tests.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      </div>
    </div>
  );
}
