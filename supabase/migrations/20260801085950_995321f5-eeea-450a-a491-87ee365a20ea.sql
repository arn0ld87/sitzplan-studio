CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.klassen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  notizen text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klassen TO authenticated;
GRANT ALL ON public.klassen TO service_role;
ALTER TABLE public.klassen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "klassen_select" ON public.klassen FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "klassen_insert" ON public.klassen FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "klassen_update" ON public.klassen FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "klassen_delete" ON public.klassen FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER klassen_updated_at BEFORE UPDATE ON public.klassen FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.schueler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  klasse_id uuid NOT NULL REFERENCES public.klassen ON DELETE CASCADE,
  vorname text NOT NULL,
  nachname text NOT NULL,
  initialen text NOT NULL,
  farb_index int NOT NULL CHECK (farb_index >= 0 AND farb_index <= 7),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);
CREATE INDEX schueler_klasse_idx ON public.schueler (klasse_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schueler TO authenticated;
GRANT ALL ON public.schueler TO service_role;
ALTER TABLE public.schueler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schueler_select" ON public.schueler FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "schueler_insert" ON public.schueler FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "schueler_update" ON public.schueler FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "schueler_delete" ON public.schueler FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE TRIGGER schueler_updated_at BEFORE UPDATE ON public.schueler FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sitzregeln (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  klasse_id uuid NOT NULL REFERENCES public.klassen ON DELETE CASCADE,
  schueler_a uuid NOT NULL REFERENCES public.schueler ON DELETE CASCADE,
  schueler_b uuid NOT NULL REFERENCES public.schueler ON DELETE CASCADE,
  art text NOT NULL CHECK (art IN ('nicht_neben','muss_neben')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);
CREATE INDEX sitzregeln_klasse_idx ON public.sitzregeln (klasse_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitzregeln TO authenticated;
GRANT ALL ON public.sitzregeln TO service_role;
ALTER TABLE public.sitzregeln ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sitzregeln_select" ON public.sitzregeln FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "sitzregeln_insert" ON public.sitzregeln FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "sitzregeln_update" ON public.sitzregeln FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "sitzregeln_delete" ON public.sitzregeln FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE TRIGGER sitzregeln_updated_at BEFORE UPDATE ON public.sitzregeln FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.raeume (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  breite_cm numeric NOT NULL CHECK (breite_cm > 0),
  laenge_cm numeric NOT NULL CHECK (laenge_cm > 0),
  raster_cm numeric NOT NULL CHECK (raster_cm >= 5),
  canvas_document jsonb NOT NULL DEFAULT '{"objekte": [], "sitzplaetze": []}'::jsonb,
  dokument_version int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raeume TO authenticated;
GRANT ALL ON public.raeume TO service_role;
ALTER TABLE public.raeume ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raeume_select" ON public.raeume FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "raeume_insert" ON public.raeume FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "raeume_update" ON public.raeume FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "raeume_delete" ON public.raeume FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER raeume_updated_at BEFORE UPDATE ON public.raeume FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sitzplaene (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  klasse_id uuid NOT NULL REFERENCES public.klassen ON DELETE CASCADE,
  raum_id uuid NOT NULL REFERENCES public.raeume ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf','aktiv','archiv')),
  canvas_document jsonb NOT NULL,
  revision int NOT NULL DEFAULT 1,
  dokument_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);
CREATE INDEX sitzplaene_klasse_idx ON public.sitzplaene (klasse_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitzplaene TO authenticated;
GRANT ALL ON public.sitzplaene TO service_role;
ALTER TABLE public.sitzplaene ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sitzplaene_select" ON public.sitzplaene FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "sitzplaene_insert" ON public.sitzplaene FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "sitzplaene_update" ON public.sitzplaene FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE POLICY "sitzplaene_delete" ON public.sitzplaene FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.klassen k WHERE k.id = klasse_id AND k.user_id = auth.uid()));
CREATE TRIGGER sitzplaene_updated_at BEFORE UPDATE ON public.sitzplaene FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();