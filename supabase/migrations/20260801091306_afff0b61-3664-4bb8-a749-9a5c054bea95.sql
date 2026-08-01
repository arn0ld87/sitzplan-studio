CREATE TABLE IF NOT EXISTS public.sitzplan_versionen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sitzplan_id uuid NOT NULL REFERENCES public.sitzplaene(id) ON DELETE CASCADE,
  name text NOT NULL,
  canvas_document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitzplan_versionen TO authenticated;
GRANT ALL ON public.sitzplan_versionen TO service_role;

ALTER TABLE public.sitzplan_versionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versionen_select" ON public.sitzplan_versionen FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "versionen_insert" ON public.sitzplan_versionen FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.sitzplaene s WHERE s.id = sitzplan_id AND s.user_id = auth.uid()));
CREATE POLICY "versionen_update" ON public.sitzplan_versionen FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "versionen_delete" ON public.sitzplan_versionen FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS sitzplan_versionen_plan_idx ON public.sitzplan_versionen (sitzplan_id, created_at DESC);

CREATE TRIGGER sitzplan_versionen_updated_at BEFORE UPDATE ON public.sitzplan_versionen
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();