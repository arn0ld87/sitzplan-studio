import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, UserPlus, Grid2x2, Link2Off, Link2 } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/ui-kit/SearchField";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { SaveStatus } from "@/components/ui-kit/SaveStatus";
import { KeineTreffer } from "@/components/ui-kit/KeineTreffer";
import { StatusChip } from "@/components/ui-kit/StatusChip";
import { relativeZeit } from "@/lib/zeit";
import { seatCount } from "@/data/types";
import type { RuleKind } from "@/data/types";
import { studentColor, initials, studentName } from "@/data/types";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/klassen/$id")({
  head: () => ({
    meta: [
      { title: "Klasse bearbeiten — Sitzplan" },
      {
        name: "description",
        content: "Schülerliste einer Klasse pflegen: Namen hinzufügen, ändern und entfernen.",
      },
      { property: "og:title", content: "Klasse bearbeiten — Sitzplan" },
      { property: "og:description", content: "Schülerliste einer Klasse pflegen." },
    ],
  }),
  component: KlassenDetail,
});

type StudentForm = { id?: string; firstName: string; lastName: string };

function KlassenDetail() {
  const { id } = Route.useParams();
  const { data, dispatch, saveState, retry } = useStore();
  const navigate = useNavigate();
  const cls = data.classes.find((c) => c.id === id);

  const [q, setQ] = useState("");
  const [form, setForm] = useState<StudentForm | null>(null);
  const [fehler, setFehler] = useState("");
  const [klasseForm, setKlasseForm] = useState<{ name: string; note: string } | null>(null);
  const [entfernen, setEntfernen] = useState<string | null>(null);
  const [tab, setTab] = useState<"schueler" | "regeln" | "plaene">("schueler");
  const [regelForm, setRegelForm] = useState<{ a: string; b: string; kind: RuleKind } | null>(null);
  const [regelLoeschen, setRegelLoeschen] = useState<string | null>(null);

  const gefiltert = useMemo(() => {
    if (!cls) return [];
    const t = q.trim().toLowerCase();
    if (!t) return cls.students;
    return cls.students.filter((s) => studentName(s).toLowerCase().includes(t));
  }, [cls, q]);

  if (!cls) {
    return (
      <div className="px-5 py-10 md:px-8">
        <h1 className="page-title">Klasse nicht gefunden</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          Diese Klasse wurde gelöscht oder es liegen keine Daten in diesem Browser.
        </p>
        <Button className="mt-5" variant="secondary" asChild>
          <Link to="/klassen">Zurück zu den Klassen</Link>
        </Button>
      </div>
    );
  }

  const plaene = data.plans.filter((p) => p.classId === cls.id);
  const regeln = data.rules.filter((r) => r.classId === cls.id);
  const nameVon = (sid: string) => {
    const s = cls?.students.find((x) => x.id === sid);
    return s ? studentName(s) : "Unbekannt";
  };

  function speichereRegel() {
    if (!regelForm || !cls) return;
    if (!regelForm.a || !regelForm.b) return setFehler("Bitte zwei Schüler wählen.");
    if (regelForm.a === regelForm.b) return setFehler("Bitte zwei verschiedene Schüler wählen.");
    const doppelt = regeln.some(
      (r) =>
        (r.a === regelForm.a && r.b === regelForm.b) || (r.a === regelForm.b && r.b === regelForm.a),
    );
    if (doppelt) return setFehler("Für dieses Paar gibt es bereits eine Regel.");
    dispatch({ type: "rule/add", classId: cls.id, a: regelForm.a, b: regelForm.b, kind: regelForm.kind });
    setRegelForm(null);
    setFehler("");
  }
  const zuEntfernen = cls.students.find((s) => s.id === entfernen);

  function speichereSchueler() {
    if (!form || !cls) return;
    const vor = form.firstName.trim();
    const nach = form.lastName.trim();
    if (!vor) return setFehler("Bitte mindestens einen Vornamen angeben.");
    if (form.id) {
      dispatch({ type: "student/update", classId: cls.id, id: form.id, firstName: vor, lastName: nach });
    } else {
      dispatch({ type: "student/add", classId: cls.id, firstName: vor, lastName: nach });
    }
    setForm(null);
    setFehler("");
  }

  function speichereKlasse() {
    if (!klasseForm || !cls) return;
    const n = klasseForm.name.trim();
    if (!n) return setFehler("Bitte einen Namen angeben.");
    dispatch({ type: "class/update", id: cls.id, name: n, note: klasseForm.note.trim() });
    setKlasseForm(null);
    setFehler("");
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Sitzplan", to: "/" },
          { label: "Klassen", to: "/klassen" },
          { label: cls.name },
        ]}
        title={cls.name}
        subtitle={cls.note || "Ohne Notiz"}
        actions={
          <>
            <SaveStatus state={saveState} onRetry={retry} />
            <Button
              variant="secondary"
              onClick={() => setKlasseForm({ name: cls.name, note: cls.note })}
            >
              <Pencil size={16} strokeWidth={1.5} />
              Klasse bearbeiten
            </Button>
            <Button variant="primary" onClick={() => setForm({ firstName: "", lastName: "" })}>
              <UserPlus size={16} strokeWidth={1.5} />
              Schüler hinzufügen
            </Button>
          </>
        }
      />

      <div className="border-b border-line px-5 md:px-8">
        <div role="tablist" aria-label="Bereiche der Klasse" className="flex gap-1">
          {(
            [
              ["schueler", `Schüler (${cls.students.length})`],
              ["regeln", `Sitzregeln (${regeln.length})`],
              ["plaene", `Sitzpläne (${plaene.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors duration-[160ms] ease-out ${
                tab === key
                  ? "border-[color:var(--action)] font-medium text-ink"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-7 md:px-8">
        {tab === "schueler" && (
          <section aria-labelledby="schueler">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="schueler" className="section-title">
                Schülerliste
                <span className="num ml-2 text-ink-3">
                  {String(cls.students.length).padStart(2, "0")}
                </span>
              </h2>
              {cls.students.length > 0 && (
                <SearchField value={q} onChange={setQ} label="Name suchen" width={180} />
              )}
            </div>

            {cls.students.length === 0 ? (
              <div className="mt-3 rounded-[8px] border border-dashed border-line-control bg-panel px-5 py-10 text-center">
                <p className="text-[14px] font-medium">Diese Klasse hat noch keine Schüler</p>
                <p className="prose-measure mx-auto mt-1 text-[13px] text-ink-2">
                  Initialen und Farbe werden beim Hinzufügen automatisch vergeben.
                </p>
                <Button
                  className="mt-4"
                  variant="primary"
                  onClick={() => setForm({ firstName: "", lastName: "" })}
                >
                  <Plus size={16} strokeWidth={1.5} />
                  Ersten Schüler hinzufügen
                </Button>
              </div>
            ) : gefiltert.length === 0 ? (
              <div className="mt-3">
                <KeineTreffer suche={q} onReset={() => setQ("")} />
              </div>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-[8px] border border-line bg-panel">
                {gefiltert.map((s, i) => (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <span
                      aria-hidden
                      style={{ background: studentColor(s.colorIndex), color: "#15110D" }}
                      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                    >
                      {initials(studentName(s))}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{studentName(s)}</span>
                    <Button
                      variant="quiet"
                      size="iconSm"
                      aria-label={`${studentName(s)} bearbeiten`}
                      onClick={() =>
                        setForm({ id: s.id, firstName: s.firstName, lastName: s.lastName })
                      }
                    >
                      <Pencil size={16} strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="quiet"
                      size="iconSm"
                      aria-label={`${studentName(s)} entfernen`}
                      onClick={() => setEntfernen(s.id)}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "regeln" && (
          <section aria-labelledby="regeln">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="regeln" className="section-title">
                Sitzregeln
              </h2>
              <Button
                variant="secondary"
                size="sm"
                disabled={cls.students.length < 2}
                onClick={() => {
                  setRegelForm({ a: "", b: "", kind: "nicht_neben" });
                  setFehler("");
                }}
              >
                <Plus size={16} strokeWidth={1.5} />
                Regel anlegen
              </Button>
            </div>
            <p className="prose-measure mt-1 text-[13px] text-ink-2">
              Regeln bestimmen, welche Schüler nebeneinander sitzen sollen und welche nicht. Der
              Sitzplaneditor weist auf Verstöße hin.
            </p>
            {regeln.length === 0 ? (
              <p className="mt-4 rounded-[8px] border border-dashed border-line-control bg-panel px-5 py-8 text-center text-[13px] text-ink-2">
                {cls.students.length < 2
                  ? "Für Regeln braucht die Klasse mindestens zwei Schüler."
                  : "Noch keine Sitzregel angelegt."}
              </p>
            ) : (
              <ul className="mt-4 overflow-hidden rounded-[8px] border border-line bg-panel">
                {regeln.map((r, i) => (
                  <li
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    {r.kind === "nicht_neben" ? (
                      <Link2Off size={16} strokeWidth={1.5} className="shrink-0 text-warn" />
                    ) : (
                      <Link2 size={16} strokeWidth={1.5} className="shrink-0 text-ink-3" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[14px]">
                      {nameVon(r.a)}{" "}
                      <span className="text-ink-3">
                        {r.kind === "nicht_neben" ? "nicht neben" : "muss neben"}
                      </span>{" "}
                      {nameVon(r.b)}
                    </span>
                    <Button
                      variant="quiet"
                      size="iconSm"
                      aria-label="Regel löschen"
                      onClick={() => setRegelLoeschen(r.id)}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "plaene" && (
          <section aria-labelledby="plaene">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="plaene" className="section-title">
                Sitzpläne dieser Klasse
              </h2>
              <Button
                variant="secondary"
                size="sm"
                disabled={data.rooms.length === 0 || cls.students.length === 0}
                onClick={() => navigate({ to: "/sitzplaene", search: { neu: cls.id } })}
              >
                <Grid2x2 size={16} strokeWidth={1.5} />
                Sitzplan erstellen
              </Button>
            </div>
            {plaene.length === 0 ? (
              <p className="mt-4 rounded-[8px] border border-dashed border-line-control bg-panel px-5 py-8 text-center text-[13px] text-ink-2">
                {data.rooms.length === 0
                  ? "Zeichnen Sie zuerst einen Raum, dann lässt sich ein Sitzplan erstellen."
                  : cls.students.length === 0
                    ? "Tragen Sie zuerst Schüler in diese Klasse ein."
                    : "Noch kein Sitzplan für diese Klasse."}
              </p>
            ) : (
              <ul className="mt-4 overflow-hidden rounded-[8px] border border-line bg-panel">
                {plaene.map((p, i) => (
                  <li key={p.id} className={i > 0 ? "border-t border-line" : ""}>
                    <Link
                      to="/sitzplaene/$id"
                      params={{ id: p.id }}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-[160ms] ease-out hover:bg-sunken"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{p.title}</span>
                        <span className="block truncate text-[13px] text-ink-3">
                          {p.room.name} · geändert {relativeZeit(p.updated)}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[13px] text-ink-2">
                        {Object.keys(p.assignments).length}/{seatCount(p.room)}
                      </span>
                      <StatusChip status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <Modal
        open={Boolean(form)}
        title={form?.id ? "Schüler bearbeiten" : "Schüler hinzufügen"}
        description="Farbe und Initialen ergeben sich automatisch aus der Position in der Liste."
        submitLabel={form?.id ? "Änderungen speichern" : "Hinzufügen"}
        onSubmit={speichereSchueler}
        onClose={() => {
          setForm(null);
          setFehler("");
        }}
      >
        <Field label="Vorname" error={fehler}>
          <input
            className={inputClass}
            value={form?.firstName ?? ""}
            maxLength={40}
            onChange={(e) => setForm((f) => (f ? { ...f, firstName: e.target.value } : f))}
          />
        </Field>
        <Field label="Nachname" hint="Optional">
          <input
            className={inputClass}
            value={form?.lastName ?? ""}
            maxLength={40}
            onChange={(e) => setForm((f) => (f ? { ...f, lastName: e.target.value } : f))}
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(klasseForm)}
        title="Klasse bearbeiten"
        submitLabel="Änderungen speichern"
        onSubmit={speichereKlasse}
        onClose={() => {
          setKlasseForm(null);
          setFehler("");
        }}
      >
        <Field label="Name" error={fehler}>
          <input
            className={inputClass}
            value={klasseForm?.name ?? ""}
            maxLength={40}
            onChange={(e) => setKlasseForm((f) => (f ? { ...f, name: e.target.value } : f))}
          />
        </Field>
        <Field label="Notiz" hint="Optional">
          <input
            className={inputClass}
            value={klasseForm?.note ?? ""}
            maxLength={120}
            onChange={(e) => setKlasseForm((f) => (f ? { ...f, note: e.target.value } : f))}
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(regelForm)}
        title="Sitzregel anlegen"
        description="Zwei Schüler wählen und festlegen, ob sie nebeneinander sitzen dürfen."
        submitLabel="Regel anlegen"
        onSubmit={speichereRegel}
        onClose={() => {
          setRegelForm(null);
          setFehler("");
        }}
      >
        <Field label="Schüler A" error={fehler}>
          <select
            className={inputClass}
            value={regelForm?.a ?? ""}
            onChange={(e) => setRegelForm((f) => (f ? { ...f, a: e.target.value } : f))}
          >
            <option value="">Bitte wählen</option>
            {cls.students.map((s) => (
              <option key={s.id} value={s.id}>
                {studentName(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Schüler B">
          <select
            className={inputClass}
            value={regelForm?.b ?? ""}
            onChange={(e) => setRegelForm((f) => (f ? { ...f, b: e.target.value } : f))}
          >
            <option value="">Bitte wählen</option>
            {cls.students.map((s) => (
              <option key={s.id} value={s.id}>
                {studentName(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Art der Regel">
          <select
            className={inputClass}
            value={regelForm?.kind ?? "nicht_neben"}
            onChange={(e) =>
              setRegelForm((f) => (f ? { ...f, kind: e.target.value as RuleKind } : f))
            }
          >
            <option value="nicht_neben">Nicht nebeneinander</option>
            <option value="muss_neben">Muss nebeneinander</option>
          </select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(regelLoeschen)}
        title="Sitzregel löschen?"
        description="Die Regel wird entfernt und im Sitzplaneditor nicht mehr geprüft."
        confirmLabel="Regel löschen"
        onConfirm={() => {
          if (regelLoeschen) dispatch({ type: "rule/remove", id: regelLoeschen });
          setRegelLoeschen(null);
        }}
        onCancel={() => setRegelLoeschen(null)}
      />

      <ConfirmDialog
        open={Boolean(zuEntfernen)}
        title={`${zuEntfernen ? studentName(zuEntfernen) : ""} entfernen?`}
        description="Der Name wird endgültig aus der Klassenliste gestrichen."
        consequence="Belegte Sitzplätze dieser Person werden in allen Sitzplänen der Klasse frei."
        confirmLabel="Entfernen"
        onConfirm={() => {
          if (entfernen) dispatch({ type: "student/remove", classId: cls.id, id: entfernen });
          setEntfernen(null);
        }}
        onCancel={() => setEntfernen(null)}
      />
    </>
  );
}
