import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Löscht das Konto samt aller daran hängenden Daten unwiderruflich. */
export const kontoLoeschen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const t of ["sitzplaene", "sitzregeln", "schueler", "raeume", "klassen"] as const) {
      const { error } = await supabaseAdmin.from(t).delete().eq("user_id", context.userId);
      if (error) throw new Error(`${t}: ${error.message}`);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
