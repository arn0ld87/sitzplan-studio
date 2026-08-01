-- Besonderheiten und eine freie Notiz je Schüler.
--
-- Beide Spalten sind NOT NULL mit Vorgabewert. Oberfläche und `mapping.ts`
-- rechnen mit einer Liste und einer Zeichenkette, nie mit NULL; bestehende
-- Zeilen bekommen damit ohne weiteres Zutun leere, gültige Werte.
--
-- Kein neues RLS nötig, und das ist kein Versehen: Die vier Policies auf
-- public.schueler liegen auf der Tabelle, nicht auf einzelnen Spalten, und
-- gelten für die neuen Felder unverändert weiter.
--
-- `merkmale` hält Schlüssel aus der Konstante MERKMALE in src/data/types.ts
-- **oder** frei eingegebenen Text. Bewusst keine Fremdschlüssel und kein
-- CHECK auf die Werte: der Katalog ist eine Vorschlagsliste, keine Schranke.

ALTER TABLE public.schueler
  ADD COLUMN IF NOT EXISTS merkmale text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notiz    text   NOT NULL DEFAULT '';

-- NULL-Elemente in der Liste wären für den Client nicht darstellbar und
-- kämen nur aus einem fehlerhaften Schreibzugriff. Hier abfangen, nicht erst
-- im Browser.
ALTER TABLE public.schueler
  DROP CONSTRAINT IF EXISTS schueler_merkmale_ohne_null;
ALTER TABLE public.schueler
  ADD CONSTRAINT schueler_merkmale_ohne_null
  CHECK (array_position(merkmale, NULL) IS NULL);
