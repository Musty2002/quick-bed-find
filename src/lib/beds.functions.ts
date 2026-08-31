import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AppRole = "admin" | "staff" | "patient";

// Public, read-only client for SSR-safe hospital availability reads.
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listHospitals = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("hospitals")
    .select("id, name, city, icu_total, icu_free, ventilators, distance_km")
    .order("distance_km", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
});

async function hasAnyRole(
  supabase: any,
  userId: string,
  roles: AppRole[],
): Promise<boolean> {
  for (const role of roles) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data) return true;
  }
  return false;
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { role: string }) => r.role as AppRole);
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: AppRole }) => {
    if (!["admin", "staff", "patient"].includes(input?.role)) {
      throw new Error("Invalid role");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: context.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createBedRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { hospitalId: string; patientName: string; condition: string; severity: string }) => {
      if (!input?.hospitalId || !input?.patientName?.trim() || !input?.condition?.trim()) {
        throw new Error("Patient name and condition are required");
      }
      if (!["Critical", "Serious", "Stable"].includes(input.severity)) {
        throw new Error("Invalid severity");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bed_requests")
      .insert({
        hospital_id: data.hospitalId,
        requester_id: context.userId,
        patient_name: data.patientName.trim(),
        condition: data.condition.trim(),
        severity: data.severity,
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bed_requests")
      .select("id, patient_name, condition, severity, status, created_at, hospitals(name)")
      .eq("requester_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const listAllRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await hasAnyRole(context.supabase, context.userId, ["staff", "admin"]))) {
      throw new Error("Forbidden");
    }
    const { data, error } = await context.supabase
      .from("bed_requests")
      .select("id, patient_name, condition, severity, status, created_at, hospitals(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const setRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "Approved" | "Declined" }) => {
    if (!input?.id || !["Approved", "Declined"].includes(input?.status)) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await hasAnyRole(context.supabase, context.userId, ["staff", "admin"]))) {
      throw new Error("Forbidden");
    }
    const { data: req, error: fetchErr } = await context.supabase
      .from("bed_requests")
      .select("id, hospital_id, status")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (req.status !== "Pending") throw new Error("Request already handled");

    const { error } = await context.supabase
      .from("bed_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.status === "Approved") {
      const { data: hosp } = await context.supabase
        .from("hospitals")
        .select("icu_free")
        .eq("id", req.hospital_id)
        .single();
      if (hosp && hosp.icu_free > 0) {
        await context.supabase
          .from("hospitals")
          .update({ icu_free: hosp.icu_free - 1 })
          .eq("id", req.hospital_id);
      }
    }
    return { ok: true };
  });

export const adjustBeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string; delta: number }) => {
    if (!input?.hospitalId || typeof input?.delta !== "number") {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await hasAnyRole(context.supabase, context.userId, ["staff", "admin"]))) {
      throw new Error("Forbidden");
    }
    const { data: hosp, error: fetchErr } = await context.supabase
      .from("hospitals")
      .select("icu_total, icu_free")
      .eq("id", data.hospitalId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    const next = Math.max(0, Math.min(hosp.icu_total, hosp.icu_free + data.delta));
    const { error } = await context.supabase
      .from("hospitals")
      .update({ icu_free: next })
      .eq("id", data.hospitalId);
    if (error) throw new Error(error.message);
    return { ok: true, icu_free: next };
  });
