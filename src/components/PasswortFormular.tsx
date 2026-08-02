import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui-kit/Button";
import { Field, inputClass } from "@/components/ui-kit/Modal";
import { supabase } from "@/integrations/supabase/client";
import { PASSWORT_MINDESTLAENGE, pruefePasswort } from "@/lib/passwort";

/**
 * Neues Passwort setzen — zweimal eingeben, einmal speichern.
 *
 * Dieselbe Maske dient zwei Wegen: dem freiwilligen Wechsel in den
 * Einstellungen und dem Rücklauf eines Wiederherstellungslinks. Beide rufen
 * `updateUser` auf derselben Sitzung auf; nur der Rahmen ringsherum
 * unterscheidet sich, und der kommt von außen.
 */
export function PasswortFormular({
  submitLabel = "Passwort ändern",
  onErfolg,
}: {
  submitLabel?: string;
  onErfolg?: () => void;
}) {
  const [neu, setNeu] = useState("");
  const [wiederholung, setWiederholung] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    const meckern = pruefePasswort(neu, wiederholung);
    if (meckern) return setFehler(meckern);

    setFehler(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: neu });
      if (error) throw error;
      setNeu("");
      setWiederholung("");
      toast.success("Passwort geändert.");
      onErfolg?.();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Ändern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={absenden} className="mt-4 flex flex-col gap-3">
      <Field label="Neues Passwort" hint={`Mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.`}>
        <input
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
          value={neu}
          onChange={(e) => {
            setNeu(e.target.value);
            setFehler(null);
          }}
        />
      </Field>
      {/* Das Prop wird weggelassen statt auf `undefined` gesetzt — der Typ ist
          unter `exactOptionalPropertyTypes` optional, nicht nullbar. */}
      <Field label="Neues Passwort wiederholen" {...(fehler ? { error: fehler } : {})}>
        <input
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
          value={wiederholung}
          onChange={(e) => {
            setWiederholung(e.target.value);
            setFehler(null);
          }}
        />
      </Field>
      <Button type="submit" variant="secondary" className="mt-1 self-start" disabled={busy}>
        {busy ? "Wird gespeichert …" : submitLabel}
      </Button>
    </form>
  );
}
