import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SAVE_STATES, SaveStatus, type SaveState } from "./SaveStatus";

describe("SaveStatus", () => {
  it.each(SAVE_STATES)("zeigt für '%s' einen lesbaren Text — nicht nur Farbe", (state) => {
    const { container } = render(<SaveStatus state={state} />);
    expect(container.textContent?.trim()).not.toBe("");
    // Das Designsystem verlangt Form vor Farbe: zu jedem Zustand ein Symbol.
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("meldet Zustandswechsel an Screenreader", () => {
    const { container } = render(<SaveStatus state="gespeichert" />);
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it("deckt alle Zustände des Datenmodells ab", () => {
    expect(SAVE_STATES).toHaveLength(6);
    expect(new Set(SAVE_STATES).size).toBe(SAVE_STATES.length);
  });

  it("benennt den Fehlerfall unmissverständlich", () => {
    render(<SaveStatus state="ungespeichert" />);
    expect(screen.getByText("Nicht gespeichert")).toBeInTheDocument();
  });

  it("bietet nur im Fehlerfall einen erneuten Versuch an", async () => {
    const onRetry = vi.fn();
    render(<SaveStatus state="ungespeichert" onRetry={onRetry} />);

    const button = screen.getByRole("button", { name: "Erneut versuchen" });
    await userEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("zeigt ohne Rückruf keine Schaltfläche", () => {
    render(<SaveStatus state="ungespeichert" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("zeigt in unkritischen Zuständen keine Schaltfläche, auch mit Rückruf", () => {
    const zustaende: SaveState[] = SAVE_STATES.filter((s) => s !== "ungespeichert");
    for (const state of zustaende) {
      const { unmount } = render(<SaveStatus state={state} onRetry={vi.fn()} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      unmount();
    }
  });
});
