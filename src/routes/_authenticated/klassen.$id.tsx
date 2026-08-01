import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, UserPlus, Grid2x2 } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/ui-kit/SearchField";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { SaveStatus } from "@/components/ui-kit/SaveStatus";
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
  const { data, dispatch, saveState } = useStore();
  const navigate = useNavigate();
  const cls = data.classes.find((c) => c.id === id);

  const [q, setQ] = useState("");
  const [form, setForm] = useState<StudentForm | null>(null);
  const [fehler, setFehler] = useState("");
  const [klasseForm, setKlasseForm] = useState<{ name: string; note: string } | null>(null);
  const [entfernen, setEntfernen] = useState<string | null>(null);

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
            <SaveStatus state={saveState} />
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

      <div className="grid gap-8 px-5 py-7 md:px-8 lg:grid-cols-[minmax(0,1fr)_260px]">
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
            <p className="mt-3 text-[14px] text-ink-2">Kein Name passt zu „{q}“.</p>
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
                    onClick={() => setForm({ id: s.id, firstName: s.firstName, lastName: s.lastName })}
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

        <aside className="space-y-5">
          <div className="rounded-[8px] border border-line bg-panel p-4">
            <h2 className="section-title">Sitzpläne dieser Klasse</h2>
            {plaene.length === 0 ? (
              <>
                <p className="mt-1.5 text-[13px] text-ink-2">
                  {data.rooms.length === 0
                    ? "Zeichnen Sie zuerst einen Raum, dann lässt sich ein Sitzplan erstellen."
                    : "Noch kein Sitzplan für diese Klasse."}
                </p>
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  disabled={data.rooms.length === 0 || cls.students.length === 0}
                  onClick={() => navigate({ to: "/sitzplaene", search: { neu: cls.id } })}
                >
                  <Grid2x2 size={16} strokeWidth={1.5} />
                  Sitzplan erstellen
                </Button>
              </>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {plaene.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/sitzplaene/$id"
                      params={{ id: p.id }}
                      className="block truncate rounded-[6px] px-2 py-1.5 text-[13px] hover:bg-sunken"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
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
