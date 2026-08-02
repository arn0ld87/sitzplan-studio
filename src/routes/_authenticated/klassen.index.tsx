import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Users, ChevronRight, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/ui-kit/SearchField";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { KeineTreffer } from "@/components/ui-kit/KeineTreffer";
import { SortHeader, type SortRichtung } from "@/components/ui-kit/SortHeader";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/klassen/")({
  head: () => ({
    meta: [
      { title: "Klassen verwalten — Sitzplan" },
      {
        name: "description",
        content:
          "Alle Klassen mit Schülerzahl und Notiz. Klassen anlegen, bearbeiten und in den Papierkorb legen.",
      },
      { property: "og:title", content: "Klassen verwalten — Sitzplan" },
      { property: "og:description", content: "Klassen anlegen, bearbeiten und Schüler pflegen." },
    ],
  }),
  component: Klassen,
});

function Klassen() {
  const { data, dispatch } = useStore();
  const [q, setQ] = useState("");
  const [neu, setNeu] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<string | null>(null);
  const [sortSpalte, setSortSpalte] = useState<"name" | "students">("name");
  const [sortRichtung, setSortRichtung] = useState<SortRichtung>("auf");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [fehler, setFehler] = useState("");
  const [loeschen, setLoeschen] = useState<string | null>(null);

  const gefiltert = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data.classes;
    return data.classes.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        c.note.toLowerCase().includes(t) ||
        c.students.some((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(t)),
    );
  }, [data.classes, q]);

  const sortiert = useMemo(() => {
    const vz = sortRichtung === "auf" ? 1 : -1;
    return [...gefiltert].sort((a, b) =>
      sortSpalte === "name"
        ? a.name.localeCompare(b.name, "de", { numeric: true }) * vz
        : (a.students.length - b.students.length) * vz,
    );
  }, [gefiltert, sortSpalte, sortRichtung]);

  function sortieren(spalte: "name" | "students") {
    if (spalte === sortSpalte) setSortRichtung((r) => (r === "auf" ? "ab" : "auf"));
    else {
      setSortSpalte(spalte);
      setSortRichtung("auf");
    }
  }

  const inBearbeitung = data.classes.find((c) => c.id === bearbeiten);

  function speichern() {
    if (!inBearbeitung) return;
    const n = name.trim();
    if (!n) return setFehler("Bitte einen Namen angeben.");
    if (
      data.classes.some(
        (c) => c.id !== inBearbeitung.id && c.name.toLowerCase() === n.toLowerCase(),
      )
    )
      return setFehler("Diesen Klassennamen gibt es bereits.");
    dispatch({
      type: "class/update",
      id: inBearbeitung.id,
      name: n,
      note: note.trim().slice(0, 120),
    });
    setBearbeiten(null);
    setName("");
    setNote("");
    setFehler("");
  }

  const zuLoeschen = data.classes.find((c) => c.id === loeschen);
  const planZahl = zuLoeschen ? data.plans.filter((p) => p.classId === zuLoeschen.id).length : 0;

  function anlegen() {
    const n = name.trim();
    if (!n) return setFehler("Bitte einen Namen angeben.");
    if (n.length > 40) return setFehler("Höchstens 40 Zeichen.");
    if (data.classes.some((c) => c.name.toLowerCase() === n.toLowerCase()))
      return setFehler("Diesen Klassennamen gibt es bereits.");
    dispatch({ type: "class/add", name: n, note: note.trim().slice(0, 120) });
    setNeu(false);
    setName("");
    setNote("");
    setFehler("");
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Klassen" }]}
        title="Klassen"
        subtitle="Jede Klasse hat eine eigene Farbe. Schüler werden innerhalb der Klasse gepflegt."
        actions={
          <>
            {data.classes.length > 0 && (
              <SearchField value={q} onChange={setQ} label="Klasse suchen" />
            )}
            <Button
              variant="primary"
              onClick={() => {
                setName("");
                setNote("");
                setFehler("");
                setNeu(true);
              }}
            >
              <Plus size={16} strokeWidth={1.5} />
              Klasse anlegen
            </Button>
          </>
        }
      />

      <div className="px-5 py-7 md:px-8">
        {data.classes.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Noch keine Klasse angelegt"
            text="Eine Klasse ist der Ausgangspunkt: Sie enthält die Schülerinnen und Schüler, die später auf die Plätze verteilt werden."
            action={
              <Button variant="primary" onClick={() => setNeu(true)}>
                <Plus size={16} strokeWidth={1.5} />
                Erste Klasse anlegen
              </Button>
            }
          />
        ) : sortiert.length === 0 ? (
          <KeineTreffer suche={q} onReset={() => setQ("")} />
        ) : (
          <ul className="overflow-hidden rounded-[8px] border border-line bg-panel">
            <li className="flex items-center gap-3 border-b border-line bg-sunken px-4 py-2">
              <span className="w-8 shrink-0" />
              <span className="min-w-0 flex-1">
                <SortHeader
                  spalte="name"
                  label="Klasse"
                  aktiv={sortSpalte}
                  richtung={sortRichtung}
                  onSort={sortieren}
                />
              </span>
              <SortHeader
                spalte="students"
                label="Schüler"
                aktiv={sortSpalte}
                richtung={sortRichtung}
                onSort={sortieren}
              />
              {/* Platzhalter für Bearbeiten, Löschen und den Pfeil — letzterer
                  fehlt unter `sm`, darum dort schmaler. */}
              <span className="w-[76px] shrink-0 sm:w-[104px]" />
            </li>
            {sortiert.map((c, i) => (
              <li
                key={c.id}
                className={`relative flex items-center gap-3 px-4 py-3 transition-colors duration-[160ms] ease-out hover:bg-sunken ${i > 0 ? "border-t border-line" : ""}`}
              >
                <ClassDot name={c.name} colorIndex={c.colorIndex} />
                <Link
                  to="/klassen/$id"
                  params={{ id: c.id }}
                  className="min-w-0 flex-1 before:absolute before:inset-0 before:content-['']"
                >
                  <span className="block truncate text-[14px] font-medium">{c.name}</span>
                  <span className="block truncate text-[13px] text-ink-3">
                    {c.note || "Ohne Notiz"}
                  </span>
                </Link>
                {/* Auf schmalen Schirmen nur die Zahl: das Wort kostete 50 px,
                    die dem Klassennamen fehlten. */}
                <span className="num shrink-0 text-[13px] text-ink-2">
                  {String(c.students.length).padStart(2, "0")}
                  <span className="hidden sm:inline"> Schüler</span>
                </span>
                <Button
                  variant="quiet"
                  size="iconSm"
                  className="relative"
                  aria-label={`${c.name} bearbeiten`}
                  onClick={() => {
                    setBearbeiten(c.id);
                    setName(c.name);
                    setNote(c.note);
                    setFehler("");
                  }}
                >
                  <Pencil size={16} strokeWidth={1.5} />
                </Button>
                <Button
                  variant="quiet"
                  size="iconSm"
                  className="relative"
                  aria-label={`${c.name} löschen`}
                  onClick={() => setLoeschen(c.id)}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </Button>
                <Link
                  to="/klassen/$id"
                  params={{ id: c.id }}
                  aria-label={`${c.name} öffnen`}
                  // Unter `sm` weggelassen: die ganze Zeile ist über das
                  // Pseudoelement des Namenslinks klickbar, der Pfeil wäre nur
                  // ein Platzfresser vor dem Namen.
                  className="relative hidden h-6 w-6 shrink-0 place-items-center rounded-[5px] text-ink-3 hover:text-ink sm:grid"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={neu}
        title="Neue Klasse"
        description="Name und optional eine kurze Notiz, etwa Fach oder Jahrgang."
        submitLabel="Klasse anlegen"
        onSubmit={anlegen}
        onClose={() => {
          setNeu(false);
          setFehler("");
        }}
      >
        <Field label="Name" hint="z. B. 7a oder Kurs Deutsch" error={fehler}>
          <input
            className={inputClass}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="7a"
          />
        </Field>
        <Field label="Notiz" hint="Optional, höchstens 120 Zeichen">
          <input
            className={inputClass}
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Klassenleitung, Fach, Halbjahr"
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(inBearbeitung)}
        title={`${inBearbeitung?.name ?? ""} bearbeiten`}
        description="Name und Notiz der Klasse ändern."
        submitLabel="Änderungen speichern"
        onSubmit={speichern}
        onClose={() => {
          setBearbeiten(null);
          setFehler("");
        }}
      >
        <Field label="Name" error={fehler}>
          <input
            className={inputClass}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Notiz" hint="Optional, höchstens 120 Zeichen">
          <input
            className={inputClass}
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(zuLoeschen)}
        title={`${zuLoeschen?.name ?? ""} in den Papierkorb legen?`}
        description="Die Klasse verschwindet aus der Liste, bleibt aber im Papierkorb wiederherstellbar."
        consequence={
          planZahl > 0
            ? `${zuLoeschen?.students.length ?? 0} Schüler und ${planZahl} zugehörige Sitzpläne wandern mit in den Papierkorb.`
            : `${zuLoeschen?.students.length ?? 0} Schüler wandern mit in den Papierkorb.`
        }
        confirmLabel="In den Papierkorb"
        onConfirm={() => {
          if (loeschen) dispatch({ type: "class/delete", id: loeschen });
          setLoeschen(null);
        }}
        onCancel={() => setLoeschen(null)}
      />
    </>
  );
}
