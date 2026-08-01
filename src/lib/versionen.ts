import { supabase } from "@/integrations/supabase/client";

/**
 * Zugriff auf benannte Sitzplan-Stände. Die generierten Datenbanktypen kennen
 * diese Tabelle noch nicht, deshalb wird hier eng typisiert gekapselt.
 */
export type PlanVersion = {
  id: string;
  name: string;
  created_at: string;
  canvas_document: { zuordnungen?: Record<string, string> } | null;
};

type LooseClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: PlanVersion[] | null; error: { message: string } | null }>;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

const db = supabase as unknown as LooseClient;

export async function ladeVersionen(sitzplanId: string) {
  return db
    .from("sitzplan_versionen")
    .select("id, name, created_at, canvas_document")
    .eq("sitzplan_id", sitzplanId)
    .order("created_at", { ascending: false });
}

export async function speichereVersion(
  sitzplanId: string,
  userId: string,
  name: string,
  zuordnungen: Record<string, string>,
) {
  return db.from("sitzplan_versionen").insert({
    sitzplan_id: sitzplanId,
    user_id: userId,
    name,
    canvas_document: { zuordnungen },
  });
}
