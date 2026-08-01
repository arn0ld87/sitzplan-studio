import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Nachbau des echten Aufrufmusters: Der Dialog steckt in einer Komponente mit
 * eigenem Zustand, und `onClose` ist — wie an **jeder** Aufrufstelle im Projekt
 * — eine Inline-Funktion. Damit ist sie bei jedem Rendern eine neue Identität.
 *
 * Genau daran hing der Fehler: Stand `onClose` in den Abhängigkeiten des
 * Fokus-Effekts, lief dieser nach jedem Tastendruck erneut und setzte den Fokus
 * zurück auf das erste Feld. Man kam über einen Buchstaben je Feld nicht hinaus.
 */
function Formular({ onClose = () => {} }: { onClose?: () => void }) {
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  return (
    <Modal
      open
      title="Schüler anlegen"
      onSubmit={() => {}}
      // Absichtlich inline und nicht mit useCallback stabilisiert.
      onClose={() => onClose()}
    >
      <input aria-label="Vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} />
      <input aria-label="Nachname" value={nachname} onChange={(e) => setNachname(e.target.value)} />
    </Modal>
  );
}

describe("Modal — Fokus beim Tippen", () => {
  it("lässt den Fokus im zweiten Feld, statt nach jedem Zeichen zurückzuspringen", async () => {
    const user = userEvent.setup();
    render(<Formular />);

    const vorname = screen.getByLabelText("Vorname");
    const nachname = screen.getByLabelText("Nachname");

    // Erst das Modal seinen Anfangsfokus setzen lassen — er läuft über ein
    // setTimeout(…, 0) und käme sonst mitten in die Eingabe.
    await waitFor(() => expect(vorname).toHaveFocus());

    await user.click(nachname);
    await user.keyboard("Berger");

    // Vor dem Fix stand hier "B" im Nachnamen und "erger" im Vornamen.
    expect(nachname).toHaveValue("Berger");
    expect(vorname).toHaveValue("");
    expect(nachname).toHaveFocus();
  });

  it("setzt den Anfangsfokus genau einmal auf das erste Feld", async () => {
    const user = userEvent.setup();
    render(<Formular />);

    const vorname = screen.getByLabelText("Vorname");
    const nachname = screen.getByLabelText("Nachname");
    await waitFor(() => expect(vorname).toHaveFocus());

    // Tippen im ersten Feld erzeugt Renderdurchläufe. Danach darf der Fokus
    // trotzdem frei ins zweite Feld wandern und dort bleiben.
    await user.keyboard("Anna");
    await user.click(nachname);
    await user.keyboard("Berger");

    expect(vorname).toHaveValue("Anna");
    expect(nachname).toHaveValue("Berger");
  });

  it("schließt weiterhin mit Escape — und ruft dabei das aktuelle onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Formular onClose={onClose} />);

    // Der Escape-Handler greift über eine Ref auf `onClose` zu. Diese Erwartung
    // sichert, dass die Ref auch nach Renderdurchläufen aktuell ist.
    await user.keyboard("Anna");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDialog — Fokus", () => {
  function Bestaetigung({ onCancel }: { onCancel: () => void }) {
    const [zaehler, setZaehler] = useState(0);
    return (
      <>
        <button onClick={() => setZaehler((z) => z + 1)}>rendern {zaehler}</button>
        <ConfirmDialog
          open
          title="Wirklich löschen?"
          description="Das lässt sich rückgängig machen."
          consequence="Der Eintrag landet im Papierkorb."
          confirmLabel="Löschen"
          onConfirm={() => {}}
          onCancel={() => onCancel()}
        />
      </>
    );
  }

  it("ruft bei Escape das aktuelle onCancel, auch nach Renderdurchläufen", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<Bestaetigung onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /rendern/ }));
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
