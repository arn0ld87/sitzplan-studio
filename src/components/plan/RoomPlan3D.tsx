// Client-Grenze der 3D-Ansicht.
//
// Three.js und der Renderer hängen ausschließlich an `room3d/Szene` und werden
// erst geladen, wenn jemand tatsächlich auf 3D umschaltet. Auf dem Server wird
// nichts davon ausgeführt: gerendert wird erst, wenn die Komponente im Browser
// montiert ist und ein WebGL-Kontext zustande kommt.
//
// Bearbeitet werden Möbel weiterhin in der 2D-Ansicht. Diese Ansicht zeigt nur.

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Maximize2, Square, SquareCheckBig, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { FURNITURE_SPECS, seatCount, type RoomGeometry } from "@/data/types";
import type { Ansichtsmodus } from "./room3d/Kamerasteuerung";

const Szene = lazy(() => import("./room3d/Szene"));

/**
 * Determines whether the browser can create a WebGL rendering context.
 *
 * @returns `true` if a WebGL2 or WebGL context can be created, `false` otherwise.
 */
function webglVerfuegbar(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Creates an accessible description of the room, including its dimensions, furnishings, and seating capacity.
 *
 * @param raum - The room geometry to describe
 * @returns A localized textual description of the room
 */
function raumBeschreiben(raum: RoomGeometry): string {
  const anzahl = new Map<string, number>();
  for (const f of raum.furniture) {
    const label = FURNITURE_SPECS[f.kind].label;
    anzahl.set(label, (anzahl.get(label) ?? 0) + 1);
  }
  const teile = [...anzahl].map(([label, n]) => `${n} × ${label}`);
  const inhalt = teile.length > 0 ? teile.join(", ") : "keine Einrichtung";
  return `Räumliche Ansicht von ${raum.name}, ${raum.width} × ${raum.height} cm: ${inhalt}. ${seatCount(raum)} Sitzplätze.`;
}

/**
 * Renders a warning message with a title, description, and optional action.
 *
 * @param titel - The warning title
 * @param text - The warning description
 * @param aktion - An optional action element
 */
function Hinweiskasten({
  titel,
  text,
  aktion,
}: {
  titel: string;
  text: string;
  aktion?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <TriangleAlert size={20} strokeWidth={1.5} className="text-warning" aria-hidden />
      <p className="text-[14px] font-medium text-ink">{titel}</p>
      <p className="max-w-[42ch] text-[13px] leading-[1.5] text-ink-2">{text}</p>
      {aktion}
    </div>
  );
}

/**
 * Fängt Fehler aus dem Renderer ab. Ein verlorener Grafikkontext soll die
 * Raumansicht nicht mitreißen — die 2D-Bearbeitung bleibt erreichbar.
 */
class SzeneGrenze extends Component<
  { children: ReactNode; ersatz: ReactNode },
  { fehler: boolean }
> {
  override state = { fehler: false };

  static getDerivedStateFromError() {
    return { fehler: true };
  }

  override render() {
    return this.state.fehler ? this.props.ersatz : this.props.children;
  }
}

/**
 * Displays a loading state while the 3D view is being loaded.
 */
function Ladeflaeche() {
  return (
    <div className="flex h-full items-center justify-center" role="status">
      <div className="w-full max-w-[280px] animate-pulse space-y-2 px-6">
        <div className="h-2.5 w-2/3 rounded-[3px] bg-sunken" />
        <div className="h-2.5 w-full rounded-[3px] bg-sunken" />
        <div className="h-2.5 w-1/2 rounded-[3px] bg-sunken" />
        <p className="pt-1 text-[13px] text-ink-2">3D-Ansicht wird geladen …</p>
      </div>
    </div>
  );
}

/**
 * Displays an interactive 3D view of a room with selection, grid, camera controls, and fallback content.
 *
 * @param room - The room geometry to display
 * @param selectedId - The identifier of the currently selected furniture item
 * @param onSelect - Handles changes to the selected furniture item
 * @param showGrid - Whether to display the floor grid
 * @param onZurueckZu2D - Handles returning to the 2D view when the 3D view is unavailable
 * @returns The room view with loading and error fallbacks
 */
export function RoomPlan3D({
  room,
  selectedId,
  onSelect,
  showGrid = true,
  onZurueckZu2D,
}: {
  room: RoomGeometry;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showGrid?: boolean;
  /** Rückweg, wenn die Szene nicht dargestellt werden kann. */
  onZurueckZu2D: () => void;
}) {
  const [imBrowser, setImBrowser] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [modus, setModus] = useState<Ansichtsmodus>("perspektive");
  const [zuruecksetzen, setZuruecksetzen] = useState(0);

  useEffect(() => {
    setImBrowser(true);
    setWebgl(webglVerfuegbar());
  }, []);

  const zurueckAktion = (
    <Button className="mt-1" variant="secondary" size="sm" onClick={onZurueckZu2D}>
      Zur 2D-Ansicht wechseln
    </Button>
  );

  const rahmen =
    "relative h-[420px] overflow-hidden rounded-[8px] border border-line bg-plan md:h-[560px]";

  if (!imBrowser) {
    return (
      <div className={rahmen}>
        <Ladeflaeche />
      </div>
    );
  }

  if (!webgl) {
    return (
      <div className={rahmen}>
        <Hinweiskasten
          titel="3D-Ansicht nicht verfügbar"
          text="Dieser Browser stellt keine 3D-Grafik bereit. Der Grundriss lässt sich in der 2D-Ansicht vollständig ansehen und bearbeiten."
          aktion={zurueckAktion}
        />
      </div>
    );
  }

  return (
    <div>
      <div className={rahmen}>
        <SzeneGrenze
          ersatz={
            <Hinweiskasten
              titel="3D-Ansicht konnte nicht aufgebaut werden"
              text="Die Grafikausgabe wurde unterbrochen. Der Grundriss lässt sich in der 2D-Ansicht vollständig ansehen und bearbeiten."
              aktion={zurueckAktion}
            />
          }
        >
          <Suspense fallback={<Ladeflaeche />}>
            <Szene
              raum={room}
              selectedId={selectedId}
              onSelect={onSelect}
              rasterZeigen={showGrid}
              modus={modus}
              zuruecksetzen={zuruecksetzen}
              beschriftung={raumBeschreiben(room)}
            />
          </Suspense>
        </SzeneGrenze>

        <div className="absolute right-3 top-3 flex gap-1.5">
          {/* Schaltknopf mit festem Namen: `aria-pressed` sagt, ob die
              Draufsicht aktiv ist. Ein wechselnder Name würde das Gegenteil
              behaupten. */}
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={modus === "draufsicht"}
            onClick={() => setModus((m) => (m === "draufsicht" ? "perspektive" : "draufsicht"))}
          >
            {modus === "draufsicht" ? (
              <SquareCheckBig size={16} strokeWidth={1.5} aria-hidden />
            ) : (
              <Square size={16} strokeWidth={1.5} aria-hidden />
            )}
            Draufsicht
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setZuruecksetzen((n) => n + 1)}>
            <Maximize2 size={16} strokeWidth={1.5} aria-hidden />
            Ansicht zurücksetzen
          </Button>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-[1.5] text-ink-3">
        Ziehen dreht die Ansicht, Scrollen zoomt, Ziehen mit der rechten Maustaste verschiebt. Möbel
        werden in der 2D-Ansicht gesetzt, verschoben und gedreht — dort auch mit der Tastatur.
      </p>
    </div>
  );
}
