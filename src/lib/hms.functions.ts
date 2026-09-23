import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["admin", "doctor", "lab", "accountant", "records"]);

async function assertRole(supabase: any, userId: string, role: string) {
  const { data } = await supabase.rpc("has_staff_role", { _user_id: userId, _role: role });
  if (!data) throw new Error("You do not have permission for this action");
}

export const listDoctors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!ok) throw new Error("Staff only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("staff_roles").select("user_id").eq("role", "doctor");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids);
    return data ?? [];
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email, created_at").order("created_at"),
      supabaseAdmin.from("staff_roles").select("user_id, role"),
    ]);
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
    }));
  });

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(72),
        roles: z.array(roleEnum).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id, email: data.email, full_name: data.full_name });
    await supabaseAdmin.from("staff_roles").insert(data.roles.map((role) => ({ user_id: id, role })));
    return { id };
  });

export const setStaffRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), roles: z.array(roleEnum) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, "admin");
    if (data.userId === context.userId && !data.roles.includes("admin"))
      throw new Error("You cannot remove your own admin role");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("staff_roles").delete().eq("user_id", data.userId);
    if (data.roles.length)
      await supabaseAdmin.from("staff_roles").insert(data.roles.map((role) => ({ user_id: data.userId, role })));
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, "admin");
    if (data.userId === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("staff_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });
