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

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

async function assertHospitalAccess(supabase: any, userId: string, hospitalId: string) {
  if (await isAdmin(supabase, userId)) return;
  const { data } = await supabase.rpc("is_hospital_staff", {
    _user_id: userId,
    _hospital_id: hospitalId,
  });
  if (!data) throw new Error("You are not assigned to this hospital");
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

/**
 * Patients self-register. Staff roles are granted by an admin.
 * The very first account may claim admin so the network can be set up.
 */
export const claimRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: "patient" | "admin" }) => {
    if (!["patient", "admin"].includes(input?.role)) throw new Error("Invalid role");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (data.role === "admin") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) > 0 && !(await isAdmin(context.supabase, context.userId))) {
        throw new Error("An administrator already exists. Ask them to grant you access.");
      }
    }
    const { error } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: context.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const myHospitals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (await isAdmin(context.supabase, context.userId)) {
      const { data, error } = await context.supabase
        .from("hospitals")
        .select("id, name, city, icu_total, icu_free, ventilators")
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    }
    const { data, error } = await context.supabase
      .from("hospital_staff")
      .select("hospitals(id, name, city, icu_total, icu_free, ventilators)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.hospitals).filter(Boolean);
  });

export const createBedRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      patientName: string;
      condition: string;
      severity: string;
      phone?: string;
      age?: number | null;
      notes?: string;
    }) => {
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
        patient_phone: data.phone?.trim() || null,
        patient_age: data.age ?? null,
        notes: data.notes?.trim() || null,
      })
      .select("id, status, reservation_code")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const REQUEST_FIELDS =
  "id, patient_name, condition, severity, status, created_at, checked_in_at, reservation_code, patient_phone, patient_age, notes, hospital_id, hospitals(name, city)";

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bed_requests")
      .select(REQUEST_FIELDS)
      .eq("requester_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listHospitalRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string }) => {
    if (!input?.hospitalId) throw new Error("Choose a hospital");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertHospitalAccess(context.supabase, context.userId, data.hospitalId);
    const { data: rows, error } = await context.supabase
      .from("bed_requests")
      .select(REQUEST_FIELDS)
      .eq("hospital_id", data.hospitalId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAllRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("bed_requests")
      .select(REQUEST_FIELDS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
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
    const { data: req, error: fetchErr } = await context.supabase
      .from("bed_requests")
      .select("id, hospital_id, status")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    await assertHospitalAccess(context.supabase, context.userId, req.hospital_id);
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

/** Staff scans / types a reservation code to pull up the patient record. */
export const lookupReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string; code: string }) => {
    if (!input?.hospitalId || !input?.code?.trim()) throw new Error("Enter a reservation code");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertHospitalAccess(context.supabase, context.userId, data.hospitalId);
    const code = data.code.trim().toUpperCase().replace(/^CRITICARE:/, "");
    const { data: row, error } = await context.supabase
      .from("bed_requests")
      .select(REQUEST_FIELDS)
      .eq("hospital_id", data.hospitalId)
      .eq("reservation_code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No reservation with that code at this hospital");
    return row;
  });

export const checkInReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: req, error: fetchErr } = await context.supabase
      .from("bed_requests")
      .select("id, hospital_id")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    await assertHospitalAccess(context.supabase, context.userId, req.hospital_id);
    const { error } = await context.supabase
      .from("bed_requests")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adjustBeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string; delta: number }) => {
    if (!input?.hospitalId || typeof input?.delta !== "number") throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertHospitalAccess(context.supabase, context.userId, data.hospitalId);
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

/* ---------------- Admin ---------------- */

export const addHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      city: string;
      icuTotal: number;
      icuFree: number;
      ventilators: number;
      distanceKm: number;
    }) => {
      if (!input?.name?.trim() || !input?.city?.trim()) throw new Error("Name and city are required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase.from("hospitals").insert({
      name: data.name.trim(),
      city: data.city.trim(),
      icu_total: Math.max(0, data.icuTotal),
      icu_free: Math.max(0, Math.min(data.icuTotal, data.icuFree)),
      ventilators: Math.max(0, data.ventilators),
      distance_km: Math.max(0, data.distanceKm),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase.from("hospitals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStaffAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("hospital_staff")
      .select("id, user_id, created_at, hospitals(id, name, city)");
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return (data ?? []).map((row: any) => ({
      id: row.id as string,
      email: emails.get(row.user_id) ?? "unknown user",
      hospitalId: row.hospitals?.id as string,
      hospitalName: row.hospitals?.name as string,
      city: row.hospitals?.city as string,
    }));
  });

export const assignStaffToHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; hospitalId: string }) => {
    if (!input?.email?.trim() || !input?.hospitalId) throw new Error("Email and hospital required");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    if (!user) throw new Error("No account with that email yet — ask them to sign up first");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "staff" }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    const { error } = await context.supabase
      .from("hospital_staff")
      .insert({ user_id: user.id, hospital_id: data.hospitalId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const removeStaffAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase.from("hospital_staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Public (no sign-in) booking ---------------- */

export const createPublicBedRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      hospitalId: string;
      patientName: string;
      condition: string;
      severity: string;
      phone?: string;
      age?: number | null;
    }) => {
      if (!input?.hospitalId || !input?.patientName?.trim() || !input?.condition?.trim()) {
        throw new Error("Patient name and condition are required");
      }
      if (!["Critical", "Serious", "Stable"].includes(input.severity)) {
        throw new Error("Invalid severity");
      }
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("bed_requests")
      .insert({
        hospital_id: data.hospitalId,
        patient_name: data.patientName.trim().slice(0, 120),
        condition: data.condition.trim().slice(0, 300),
        severity: data.severity,
        patient_phone: data.phone?.trim().slice(0, 32) || null,
        patient_age: data.age ?? null,
      })
      .select("id, status, reservation_code, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Anyone holding a reservation code can check that reservation's status. */
export const lookupMyPass = createServerFn({ method: "POST" })
  .inputValidator((input: { codes: string[] }) => {
    if (!Array.isArray(input?.codes)) throw new Error("Invalid input");
    return { codes: input.codes.slice(0, 20).map((c) => String(c).toUpperCase().trim()) };
  })
  .handler(async ({ data }) => {
    if (data.codes.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bed_requests")
      .select(
        "id, patient_name, condition, severity, status, created_at, checked_in_at, reservation_code, hospitals(name, city)",
      )
      .in("reservation_code", data.codes)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
