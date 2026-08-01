-- Protokoll der KI-Aufrufe. Grundlage für die Deckel je Konto und global.
--
-- Bewusste Abweichung von Regel 3 in AGENTS.md: kein `updated_at`, kein
-- `deleted_at`, kein `set_updated_at`-Trigger, keine UPDATE- und keine
-- DELETE-Policy. Diese Tabelle ist ein Protokoll, keine Nutzdatentabelle.
-- Wer seine eigenen Zeilen ändern oder weich löschen darf, setzt damit sein
-- eigenes Limit zurück — die vier Policies der Regel wären hier genau die
-- Lücke, die sie sonst schließen. Begründung: docs/plaene/0001.

CREATE TABLE IF NOT EXISTS public.ki_aufrufe (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sitzplan_id uuid NULL REFERENCES public.sitzplaene(id) ON DELETE SET NULL,
  modus       text NOT NULL CHECK (modus IN ('erzeugen', 'pruefen')),
  token_ein   int  NOT NULL DEFAULT 0,
  token_aus   int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Der erste Index bedient die nutzerbezogenen Deckel (Tag und Minute), der
-- zweite den globalen Zähler unten.
CREATE INDEX IF NOT EXISTS ki_aufrufe_nutzer_zeit_idx
  ON public.ki_aufrufe (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ki_aufrufe_zeit_idx
  ON public.ki_aufrufe (created_at DESC);

ALTER TABLE public.ki_aufrufe ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.ki_aufrufe TO authenticated;
GRANT ALL    ON public.ki_aufrufe TO service_role;

DROP POLICY IF EXISTS ki_aufrufe_select ON public.ki_aufrufe;
CREATE POLICY ki_aufrufe_select ON public.ki_aufrufe
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ki_aufrufe_insert ON public.ki_aufrufe;
CREATE POLICY ki_aufrufe_insert ON public.ki_aufrufe
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Der globale Deckel lässt sich nicht mit dem JWT des Nutzers zählen: die
-- Policy oben zeigt jedem nur die eigenen Zeilen, eine Abfrage über alle
-- Konten liefert damit systematisch zu kleine Zahlen und der Deckel griffe
-- nie. Diese Funktion umgeht RLS gezielt und gibt **nur eine Zahl** zurück —
-- keine Zeile, keine Kennung, keinen fremden Sitzplan.
--
-- Gezählt wird ein gleitendes 24-Stunden-Fenster, nicht der Kalendertag: ein
-- Mitternachtssprung würde den Deckel sonst planbar zurücksetzen.
--
-- Ausführbar ist sie **nur** für `service_role`, also allein aus der Edge
-- Function heraus. Ein angemeldeter Nutzer hat keinen Grund, die Auslastung
-- aller Konten zu erfahren; der Supabase-Linter meldet ein EXECUTE-Recht für
-- `authenticated` auf einer SECURITY-DEFINER-Funktion sonst zu Recht an.
CREATE OR REPLACE FUNCTION public.ki_aufrufe_heute_global()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.ki_aufrufe
  WHERE created_at > now() - interval '1 day';
$$;

REVOKE ALL ON FUNCTION public.ki_aufrufe_heute_global() FROM public;
REVOKE ALL ON FUNCTION public.ki_aufrufe_heute_global() FROM anon;
REVOKE ALL ON FUNCTION public.ki_aufrufe_heute_global() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ki_aufrufe_heute_global() TO service_role;
