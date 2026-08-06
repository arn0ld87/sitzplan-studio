# 3D-Ausstattung Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ziel:** Die 3D-Ansicht bekommt Leben — Deko-Objekte (Uhr, Kreide, Papierkorb, Pflanze, Poster, Großmöbel, Deckenleuchten) und neue Farbtokens in Phase 1, drei neue platzierbare Möbeltypen (`schrank`, `regal`, `waschbecken`) in Phase 2.

**Architektur:** Phase 1 berührt **nur** die 3D-Szene: ein neues, pures Platzierungsmodul (`ausstattung.ts`, testbar ohne WebGL) berechnet aus der `RoomGeometry`, wo Deko steht; eine neue Komponente (`Ausstattung3D.tsx`) baut die Three.js-Körper. Kein Domänen-, DB- oder KI-Impact. Phase 2 erweitert den `FurnitureKind`-Vertrag durch alle Schichten (types → mapping → 2D-SVG → 3D-Bausatz → Palette); die KI-Edge-Function braucht **keine** Änderung, weil ihr `OBJEKT_LABEL`-Filter unbekannte Typen bereits ignoriert.

**Tech-Stack:** React 19, @react-three/fiber, Three.js (nur Grundkörper, keine Modelle/Texturen), Vitest, Tailwind-Tokens aus `src/styles.css`.

## Globale Zwänge

- **Designsystem ist SSoT.** Jede Farbe kommt als CSS-Token aus `src/styles.css` und wird in `docs/designsystem.md` dokumentiert. Keine Hex-Werte in Komponenten. Die 3D-Szene liest Tokens ausschließlich über `leseSzenenfarben()` in `src/components/plan/room3d/farben.ts`.
- **Die App ist light-only.** Es gibt keinen Dark-Theme-Block in `styles.css` — neue Tokens brauchen genau einen Wert.
- **Nur Three.js-Grundkörper** (Box, Cylinder, Sphere). Keine externen Modelle, keine Texturen — Kommentar-Kopfzeile von `bausatz.ts` gilt weiter.
- **Geometrien/Materialien einmal je Art bauen und teilen**, `dispose` beim Abbau (Muster: `useBausatz` in `bausatz.ts:222-249`).
- **Maßeinheit:** Grundriss rechnet in cm, Szene in Welteinheiten à 100 cm. Umrechnung immer über `cmZuEinheit()` aus `geometrie.ts`.
- **Gate vor jedem Commit:** `bun run typecheck && bun run lint && bun run test && bun run build` — sequentiell, kein Auto-Fix-Loop.
- **Kein Edit auf `main`.** Phase 1 auf Branch `feat/3d-ausstattung`, Phase 2 auf Branch `feat/moebel-schrank-regal-waschbecken`. Je Phase ein PR.
- **Tests erweitern, nie passend machen.** Bestehende Testdateien: `src/components/plan/room3d/geometrie.test.ts`, `src/data/types.test.ts`, `src/data/mapping.test.ts`.
- Sitzplatz-Muster `<objektId>__sitz_<n>` (Hartanker 5) wird nirgends berührt — die neuen Typen haben `seats: 0`.

## Bestandsaufnahme (verifiziert am 2026-08-06)

| Baustein | Ort | Rolle |
| --- | --- | --- |
| `FurnitureKind` | `src/data/types.ts:87` | `"einzeltisch" \| "doppeltisch" \| "pult" \| "tafel" \| "tuer" \| "fenster"` |
| `FURNITURE_SPECS` | `src/data/types.ts:98-108` | Label, Maße (cm), Sitzzahl je Typ |
| `MOEBEL_AUFBAU` | `src/components/plan/room3d/geometrie.ts:58-65` | Bauhöhe + Sockel je Typ (cm) |
| Token-Leser | `src/components/plan/room3d/farben.ts` | `TOKENS`-Liste → `Szenenfarben` |
| Möbel-Bausatz | `src/components/plan/room3d/bausatz.ts` | `kasten()`, `beine()`, `flaeche()` (privat), `useBausatz()` |
| Raumhülle | `src/components/plan/room3d/Raumhuelle.tsx` | Boden, Raster, 4 Wände (`wandPlatzierung`, `WANDSEITEN`) |
| Szene | `src/components/plan/room3d/Szene.tsx` | Canvas, Licht, Raumhülle, Möbel-Loop |
| 3D-Container | `src/components/plan/RoomPlan3D.tsx` | Lazy-Load, WebGL-Check, Buttons „Draufsicht“/„Ansicht zurücksetzen“ oben rechts |
| 2D-Zeichnung | `src/components/plan/RoomPlan.tsx:45-130` | `FurnitureShape` mit `case` je Kind |
| Editor-Palette | `src/routes/_authenticated/raeume.$id.tsx:55-62` | `PALETTE: { kind, icon }[]` mit lucide-Icons |
| DB-Mapping | `src/data/mapping.ts:24-41` | `TYP_ZU_KIND` / `KIND_ZU_TYP` (englische Doc-Typen), Fallback unbekannter Typ → `einzeltisch` |
| KI-Edge-Function | `supabase/functions/ki-sitzplan/index.ts` | `OBJEKT_LABEL`-Filter: unbekannte `typ`-Werte fallen aus dem Prompt |

Bekannter Schönheitsfehler, wird in Task 1 mit bereinigt: `src/styles.css:26` enthält eine tote Duplikat-Zeile `--line: #e4dacа;` mit **kyrillischem „а“** im Hex-Wert; die gültige Zeile 27 überschreibt sie.

---

## Phase 1 — Deko und Farbe (Branch `feat/3d-ausstattung`)

### Task 1: Farbtokens

**Files:**
- Modify: `src/styles.css` (Token-Block `:root` um Zeile 54, `@theme inline` um Zeile 101; Duplikat Zeile 26 löschen)
- Modify: `docs/designsystem.md` (Abschnitt „Farben“, Zeile 23-33)
- Modify: `src/components/plan/room3d/farben.ts` (`TOKENS`-Array)

**Interfaces:**
- Produces: CSS-Tokens `--wood`, `--plant`, `--metal`, `--poster-a`, `--poster-b`; `Szenenfarben` enthält diese fünf Schlüssel zusätzlich. Alle späteren Tasks greifen über `farben["--wood"]` usw. zu.

- [ ] **Step 1: Tote Duplikat-Zeile entfernen**

In `src/styles.css` Zeile 26 (`--line: #e4dacа;` — die Variante mit kyrillischem „а“) ersatzlos löschen. Zeile 27 (`--line: #e4daca;`) bleibt.

- [ ] **Step 2: Tokens in `:root` ergänzen**

Direkt nach `--window: #7ca9c2;` (bisher Zeile 55) einfügen:

```css
  /* Ausstattung (3D-Szene) */
  --wood: #9c7a58;
  --plant: #6a8f5f;
  --metal: #8e8b86;
  --poster-a: #c97b5b;
  --poster-b: #9dbfa8;
```

- [ ] **Step 3: Tailwind-Spiegel in `@theme inline` ergänzen**

Nach `--color-window: var(--window);` (bisher Zeile 102) einfügen:

```css
  --color-wood: var(--wood);
  --color-plant: var(--plant);
  --color-metal: var(--metal);
  --color-poster-a: var(--poster-a);
  --color-poster-b: var(--poster-b);
```

- [ ] **Step 4: designsystem.md nachziehen**

Im Abschnitt „## Farben“ nach der Zeile „Schülerfarben …“ einfügen:

```markdown
Ausstattung (nur 3D-Szene): wood #9C7A58 · plant #6A8F5F · metal #8E8B86 · posterA #C97B5B · posterB #9DBFA8
```

- [ ] **Step 5: `farben.ts` erweitern**

Im `TOKENS`-Array nach `"--select",` ergänzen:

```ts
  "--wood",
  "--plant",
  "--metal",
  "--poster-a",
  "--poster-b",
```

- [ ] **Step 6: Gate ausführen**

Run: `bun run typecheck && bun run lint && bun run test && bun run build`
Expected: alles grün (reine Additionen, kein Verbraucher existiert noch).

- [ ] **Step 7: Commit**

```bash
git add src/styles.css docs/designsystem.md src/components/plan/room3d/farben.ts
git commit -m "feat: Farbtokens für die 3D-Ausstattung, tote --line-Zeile entfernt"
```

### Task 2: Platzierungslogik `ausstattung.ts` (pur, testgetrieben)

**Files:**
- Create: `src/components/plan/room3d/ausstattung.ts`
- Test: `src/components/plan/room3d/ausstattung.test.ts`

**Interfaces:**
- Consumes: `RoomGeometry`, `Furniture`, `FURNITURE_SPECS` aus `@/data/types`; `Wandseite`, `WANDSEITEN` aus `./geometrie`.
- Produces (für Task 3/4):

```ts
export type DekoArt =
  | "uhr" | "schwamm" | "kreide" | "papierkorb" | "pflanze"
  | "schrankDeko" | "regalDeko" | "poster" | "fensterTopf"
  | "leuchte" | "deckenkante";

export type DekoPlatzierung = {
  art: DekoArt;
  /** Weltposition in cm, Ursprung linke obere Raumecke wie im Grundriss; z = Höhe über Boden. */
  xCm: number;
  yCm: number;
  zCm: number;
  /** Drehung um die Hochachse in Grad, 0 = wie Grundriss. */
  drehungGrad: 0 | 90 | 180 | 270;
  /** Nur bei art === "poster": 0 | 1 | 2 wählt --poster-a, --poster-b, --window. */
  variante?: number;
};

export function naechsteWand(f: Furniture, raum: Pick<RoomGeometry, "width" | "height">): Wandseite;
export function wandFreieAbschnitte(
  raum: Pick<RoomGeometry, "width" | "height" | "furniture">,
  seite: Wandseite,
): { von: number; bis: number }[];
export function ausstattungPlatzierungen(raum: RoomGeometry): DekoPlatzierung[];
```

Konventionen des Moduls (in den Dateikopf-Kommentar übernehmen):
- Alles rechnet in **cm im Grundriss-Koordinatensystem** (x nach rechts, y nach unten, z nach oben). Die Umrechnung in Welteinheiten passiert erst in `Ausstattung3D.tsx` über `cmZuEinheit` und die Formel aus `geometrie.ts` (`3D-X = x − width/2`, `3D-Z = y − height/2`, jeweils /100).
- „Wandgebunden“ heißt: `kind` ist `tafel`, `tuer` oder `fenster` **und** der Abstand der nächsten Wand < 40 cm.
- Jede Deko, deren Platz nicht frei ist, wird **weggelassen** statt erzwungen.

Platzierungsregeln (exakt so implementieren):

| Deko | Regel |
| --- | --- |
| `uhr` | Mittig über der ersten `tafel` (gleiche Wand, Wandmitte des Tafel-Intervalls), z = 255. Ohne Tafel: Mitte der Nordwand (y = 4), z = 255. Drehung = Wand zugewandt (nord 0, sued 180, west 90, ost 270). |
| `schwamm` | Nur wenn eine `tafel` existiert: auf deren Kreideablage, 30 cm links der Tafelmitte (entlang der Wandachse), z = 91. |
| `kreide` | Wie `schwamm`, aber 22 cm rechts der Tafelmitte. |
| `papierkorb` | Neben dem ersten `pult`: an dessen rechter Kante + 25 cm (entlang x vor Drehung, nach Drehung via gedrehter Grundfläche), z = 0. Ohne Pult: Ecke (40, 40). |
| `pflanze` | In der Ecke (Kandidaten: (35,35), (width−35,35), (35,height−35), (width−35,height−35)) mit dem größten Mindestabstand zu allen `tuer`-Mittelpunkten, z = 0. Entfällt bei width < 200 oder height < 200. |
| `schrankDeko` | Erster freier Abschnitt ≥ 130 cm, gesucht in Reihenfolge sued → ost → west. Mittig im Abschnitt, 2 cm Wandabstand (Tiefe 50 einrechnen: Mittelpunkt 27 cm vor der Wand), Drehung wandparallel. Entfällt ohne Abschnitt. |
| `regalDeko` | Wie `schrankDeko` (Suche beginnt nach dem Schrank-Abschnitt, derselbe Abschnitt darf nicht doppelt belegt werden), Mindestbreite 110, Tiefe 30 → Mittelpunkt 17 cm vor der Wand. |
| `poster` | Bis zu 3 Stück: freie Abschnitte ≥ 80 cm auf allen Wänden **außer** der Wand der ersten `tafel`, je Wand höchstens eines, mittig im Abschnitt, 1 cm vor der Wand, z = 160. `variante` zählt 0, 1, 2 in Fundreihenfolge. |
| `fensterTopf` | Je `fenster`-Möbel ein Topf: auf der Fensterbank, Mittelpunkt des Fensters, 8 cm vor der Wand, z = 90. |
| `leuchte` | Raster an der Decke: `nx = max(2, Math.round(width/300))`, `ny = max(2, Math.round(height/300))`; Positionen `x = width*(i+0.5)/nx`, `y = height*(j+0.5)/ny`, z = 293. |
| `deckenkante` | Vier Einträge, je Wand einer (Position = Wandmitte, Drehung wandparallel), z = 297. Länge liefert Task 3 aus den Raummaßen. |

- [ ] **Step 1: Testdatei schreiben (schlägt fehl)**

`src/components/plan/room3d/ausstattung.test.ts` — Stil und Import-Muster von `geometrie.test.ts` übernehmen. Mindestens diese Fälle, mit konkreten Möbel-Fixtures über `makeFurniture` + manuell gesetzte `x/y/rotation`:

```ts
import { describe, expect, it } from "vitest";
import { makeFurniture, type RoomGeometry } from "@/data/types";
import { ausstattungPlatzierungen, naechsteWand, wandFreieAbschnitte } from "./ausstattung";

function raumMit(furniture: RoomGeometry["furniture"]): RoomGeometry {
  return { name: "Test", width: 900, height: 700, grid: 25, vorn: "oben", furniture };
}

function moebel(kind: Parameters<typeof makeFurniture>[0], x: number, y: number) {
  return { ...makeFurniture(kind, x, y) };
}

describe("naechsteWand", () => {
  it("ordnet eine Tafel an der oberen Kante der Nordwand zu", () => {
    expect(naechsteWand(moebel("tafel", 250, 0), raumMit([]))).toBe("nord");
  });
  it("ordnet ein Fenster an der linken Kante der Westwand zu", () => {
    expect(naechsteWand(moebel("fenster", 0, 200), raumMit([]))).toBe("west");
  });
});

describe("wandFreieAbschnitte", () => {
  it("liefert die ganze Wand, wenn nichts an ihr steht", () => {
    expect(wandFreieAbschnitte(raumMit([]), "sued")).toEqual([{ von: 0, bis: 900 }]);
  });
  it("schneidet eine Tür aus der Südwand aus", () => {
    const tuer = moebel("tuer", 400, 680); // 90 cm breit, an der unteren Kante
    const frei = wandFreieAbschnitte(raumMit([tuer]), "sued");
    expect(frei).toEqual([
      { von: 0, bis: 400 },
      { von: 490, bis: 900 },
    ]);
  });
  it("ignoriert Möbel, die weiter als 40 cm von der Wand stehen", () => {
    const pultMitte = moebel("pult", 300, 300);
    expect(wandFreieAbschnitte(raumMit([pultMitte]), "nord")).toEqual([{ von: 0, bis: 900 }]);
  });
});

describe("ausstattungPlatzierungen", () => {
  it("hängt die Uhr mittig über die Tafel", () => {
    const tafel = moebel("tafel", 250, 0); // 400 breit → Mitte bei x=450
    const uhr = ausstattungPlatzierungen(raumMit([tafel])).find((p) => p.art === "uhr");
    expect(uhr).toMatchObject({ xCm: 450, zCm: 255 });
  });
  it("lässt Schwamm und Kreide ohne Tafel weg", () => {
    const arten = ausstattungPlatzierungen(raumMit([])).map((p) => p.art);
    expect(arten).not.toContain("schwamm");
    expect(arten).not.toContain("kreide");
  });
  it("stellt die Pflanze in die türfernste Ecke", () => {
    const tuer = moebel("tuer", 0, 680); // unten links
    const pflanze = ausstattungPlatzierungen(raumMit([tuer])).find((p) => p.art === "pflanze");
    expect(pflanze).toMatchObject({ xCm: 865, yCm: 35 }); // oben rechts
  });
  it("lässt den Deko-Schrank weg, wenn keine Wand 130 cm frei hat", () => {
    // Raum 200×700: Süd/Nord je 200 breit, Fenster blockieren West und Ost komplett.
    const raum: RoomGeometry = {
      ...raumMit([]),
      width: 200,
      furniture: [
        { ...moebel("fenster", 0, 0), rotation: 0 },
        { ...moebel("fenster", 185, 0), rotation: 0 },
      ],
    };
    // width 200 → sued frei 200 < 130? doch 200 ≥ 130 — deshalb Tür in die Südwand:
    raum.furniture.push(moebel("tuer", 55, 680));
    const arten = ausstattungPlatzierungen(raum).map((p) => p.art);
    expect(arten).not.toContain("schrankDeko");
  });
  it("erzeugt für jedes Fenster einen Topf", () => {
    const raum = raumMit([moebel("fenster", 0, 100), moebel("fenster", 0, 400)]);
    const toepfe = ausstattungPlatzierungen(raum).filter((p) => p.art === "fensterTopf");
    expect(toepfe).toHaveLength(2);
  });
  it("legt bei 900×700 ein 3×2-Leuchtenraster an", () => {
    const leuchten = ausstattungPlatzierungen(raumMit([])).filter((p) => p.art === "leuchte");
    expect(leuchten).toHaveLength(6);
    expect(leuchten[0]).toMatchObject({ xCm: 150, yCm: 175, zCm: 293 });
  });
  it("liefert immer vier Deckenkanten", () => {
    const kanten = ausstattungPlatzierungen(raumMit([])).filter((p) => p.art === "deckenkante");
    expect(kanten).toHaveLength(4);
  });
});
```

Hinweis zum Türen-Test „schneidet … aus“: `tuer` hat Spec 90×20 (`FURNITURE_SPECS.tuer`), bei y=680 in einem 700er-Raum liegt sie 0 cm von der Südwand. Das Intervall auf der Südwand-Achse ist `[x, x+90] = [400, 490]`.

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `bun run vitest run src/components/plan/room3d/ausstattung.test.ts`
Expected: FAIL („Cannot find module './ausstattung'“).

- [ ] **Step 3: `ausstattung.ts` implementieren**

Implementierungsskizze (vollständig ausprogrammieren, keine Abkürzungen):

```ts
import { FURNITURE_SPECS, type Furniture, type RoomGeometry } from "@/data/types";
import { WANDSEITEN, type Wandseite } from "./geometrie";

const WANDNAEHE_CM = 40;
const WANDGEBUNDEN = new Set(["tafel", "tuer", "fenster"]);

/** Grundfläche in cm nach Drehung — 90°/270° tauschen Breite und Tiefe. */
function flaecheCm(f: Furniture): { w: number; h: number } {
  const spec = FURNITURE_SPECS[f.kind];
  const quer = f.rotation === 90 || f.rotation === 270;
  return { w: quer ? spec.h : spec.w, h: quer ? spec.w : spec.h };
}

export function naechsteWand(f, raum) {
  const { w, h } = flaecheCm(f);
  const abstaende: [Wandseite, number][] = [
    ["nord", f.y],
    ["sued", raum.height - (f.y + h)],
    ["west", f.x],
    ["ost", raum.width - (f.x + w)],
  ];
  abstaende.sort((a, b) => a[1] - b[1]);
  return abstaende[0][0];
}
```

`wandFreieAbschnitte`: Wandlänge = `width` (nord/sued) bzw. `height` (west/ost). Für jedes wandgebundene Möbel mit `naechsteWand === seite` und Wandabstand < 40 das Intervall auf der Wandachse nehmen (`[f.x, f.x + w]` bei nord/sued, `[f.y, f.y + h]` bei west/ost), Intervalle sortieren, mergen, Komplement über `[0, L]` bilden. `ausstattungPlatzierungen` setzt die Tabellenregeln aus dem Task-Kopf um; für Schrank/Regal einen kleinen internen Belegungs-Tracker führen (`belegt: Map<Wandseite, {von,bis}[]>`), damit Regal nicht in den Schrank-Abschnitt fällt und Poster nicht auf Schrank/Regal-Abschnitten landen (Poster prüfen gegen denselben Tracker).

- [ ] **Step 4: Test laufen lassen — muss grün sein**

Run: `bun run vitest run src/components/plan/room3d/ausstattung.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate + Commit**

```bash
bun run typecheck && bun run lint && bun run test && bun run build
git add src/components/plan/room3d/ausstattung.ts src/components/plan/room3d/ausstattung.test.ts
git commit -m "feat: Platzierungslogik für die 3D-Ausstattung"
```

### Task 3: Bauteile und Komponente `Ausstattung3D.tsx`

**Files:**
- Modify: `src/components/plan/room3d/bausatz.ts` (nur: `export` vor `function kasten` und `function flaeche` setzen)
- Create: `src/components/plan/room3d/Ausstattung3D.tsx`

**Interfaces:**
- Consumes: `ausstattungPlatzierungen`, `DekoPlatzierung`, `DekoArt` aus `./ausstattung`; `kasten`, `flaeche`, `Bauteil` aus `./bausatz`; `cmZuEinheit`, `raumMasse` aus `./geometrie`; `Szenenfarben` aus `./farben`.
- Produces: `export function Ausstattung3D({ raum, farben }: { raum: RoomGeometry; farben: Szenenfarben }): JSX.Element` — Task 4 bindet genau diese Signatur in `Szene.tsx` ein.

Aufbau der Datei (Muster: `Moebel3D.tsx` + `useBausatz`):

1. **Werkstoffe** einmal per `useMemo` aus den Tokens:
   - `holz = flaeche(farben["--wood"], 0.7)`
   - `blatt = flaeche(farben["--plant"], 0.9)`
   - `metall = flaeche(farben["--metal"], 0.5)`
   - `papierA = flaeche(farben["--poster-a"], 0.95)`, `papierB = flaeche(farben["--poster-b"], 0.95)`, `papierC = flaeche(farben["--window"], 0.95)`
   - `weiss = flaeche(farben["--elevated"], 0.6)`
   - `dunkel = flaeche(farben["--line-plan"], 0.8)`
   - `kante = flaeche(farben["--line-strong"], 0.9)`
   - `leuchtend = new THREE.MeshStandardMaterial({ color: farben["--elevated"], emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.35, roughness: 0.4, metalness: 0 })`
2. **Bauteil-Listen je `DekoArt`** per `useMemo`, alle Maße in cm über `cmZuEinheit`:
   - `uhr`: flacher Zylinder als Zifferblatt (`CylinderGeometry(r=15, r=15, 3, 24)`, um 90° zur Wand gekippt, `weiss`), Ring dahinter (`r=17`, Dicke 2, `metall`), zwei Zeiger-Kästen (`kasten(dunkel, [1.5, 10, 1], …)` und `[1.5, 7, 1]` um 60° gedreht).
   - `schwamm`: `kasten(farben → sunken über flaeche(farben["--sunken"], 0.95), [12, 5, 6], …)` — Werkstoff `schwammStoff` ergänzen.
   - `kreide`: zwei Mini-Zylinder (`r=1, h=8`, liegend, `weiss`).
   - `papierkorb`: offener Zylinder (`CylinderGeometry(14, 11, 30, 16, 1, true)`, `metall`, `side: THREE.DoubleSide`) + Boden.
   - `pflanze`: Topf (`CylinderGeometry(12, 9, 25, 12)`, `holz`), Stamm (`CylinderGeometry(2.5, 2.5, 25, 8)`, `holz`), Krone (`SphereGeometry(20, 12, 10)`, `blatt`) auf z=45.
   - `schrankDeko`: Korpus `kasten(holz, [120, 190, 50], …)`, zwei Türfugen (`kasten(dunkel, [1, 170, 1], …)` bei x=0 mittig und Griffe `kasten(metall, [2, 10, 2], …)` links/rechts der Fuge auf Höhe 100).
   - `regalDeko`: zwei Seitenwangen (`kasten(holz, [3, 120, 30])`), vier Böden (`kasten(holz, [100, 3, 30])` auf z 0/39/78/117), pro Fach eine „Bücherreihe“ (`kasten` mit Material `papierA`/`papierB` abwechselnd, `[80, 22, 22]`).
   - `poster`: `kasten(papierX, [60, 80, 1], …)` — Material nach `variante` (0→`papierA`, 1→`papierB`, 2→`papierC`) + schmaler Rahmen (`kasten(kante, [64, 84, 0.5], …)` dahinter).
   - `fensterTopf`: kleiner Topf (`CylinderGeometry(6, 4.5, 10, 10)`, `holz`) + Kugel (`SphereGeometry(7, 10, 8)`, `blatt`).
   - `leuchte`: `kasten(leuchtend, [120, 4, 30], …)` mit `kante`-Rahmen (`[124, 2, 34]` direkt darüber).
   - `deckenkante`: je Wand ein `kasten(kante, [wandlaenge, 6, 6], …)` — Länge aus `raumMasse(raum)` (nord/sued: `breite`, west/ost: `tiefe`), deshalb wird dieses Bauteil **nicht** memoisiert je Art, sondern in der Render-Schleife mit `boxGeometry`-JSX gebaut (Muster `Wand` in `Raumhuelle.tsx:48-64`).
3. **Positionierung** in der Komponente: für jede `DekoPlatzierung` eine `<group>` mit
   `position={[cmZuEinheit(p.xCm − raum.width/2), cmZuEinheit(p.zCm), cmZuEinheit(p.yCm − raum.height/2)]}` und `rotation={[0, (−p.drehungGrad * Math.PI) / 180, 0]}` (negatives Vorzeichen wie `drehungZuRadiant`, `geometrie.ts:90-92`), darin die Bauteile als `<mesh castShadow receiveShadow>`.
4. **Aufräumen**: `useEffect`-Cleanup, das alle memoisierten Geometrien und Materialien `dispose()`t — exakt das Muster aus `useBausatz` (`bausatz.ts:239-246`).

- [ ] **Step 1: `kasten` und `flaeche` in `bausatz.ts` exportieren**

Nur das Schlüsselwort `export` vor beiden Funktionsdeklarationen ergänzen; Kommentar der Datei unverändert lassen.

- [ ] **Step 2: `Ausstattung3D.tsx` anlegen** — nach obigem Aufbau, vollständig.

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: grün. (Die Komponente ist noch nirgends eingebunden — das ist in Ordnung, `lint` darf keinen unused-export-Fehler werfen, weil Named Exports erlaubt sind.)

- [ ] **Step 4: Gate + Commit**

```bash
bun run typecheck && bun run lint && bun run test && bun run build
git add src/components/plan/room3d/bausatz.ts src/components/plan/room3d/Ausstattung3D.tsx
git commit -m "feat: Bauteile und Komponente für die 3D-Ausstattung"
```

### Task 4: Szene-Integration und Schalter „Ausstattung“

**Files:**
- Modify: `src/components/plan/room3d/Szene.tsx` (Prop + Render)
- Modify: `src/components/plan/RoomPlan3D.tsx` (State + Button)

**Interfaces:**
- Consumes: `Ausstattung3D` aus Task 3.
- Produces: `SzeneProps` erhält `ausstattungZeigen: boolean`; `RoomPlan3D` hält den Zustand (Default `true`).

- [ ] **Step 1: `Szene.tsx` erweitern**

`SzeneProps` um `ausstattungZeigen: boolean;` ergänzen, Prop in der Funktionssignatur entgegennehmen und im Canvas **vor** dem Möbel-Loop rendern:

```tsx
{ausstattungZeigen && <Ausstattung3D raum={raum} farben={farben} />}
```

- [ ] **Step 2: Schalter in `RoomPlan3D.tsx`**

Neben `const [modus, setModus] = useState<Ansichtsmodus>("perspektive");`:

```tsx
const [ausstattung, setAusstattung] = useState(true);
```

Im Button-Container oben rechts (vor dem „Draufsicht“-Button) einen Button im exakt gleichen Muster (`aria-pressed`, `Square`/`SquareCheckBig`-Icons, fester Name):

```tsx
<Button
  variant="secondary"
  size="sm"
  aria-pressed={ausstattung}
  onClick={() => setAusstattung((a) => !a)}
>
  {ausstattung ? (
    <SquareCheckBig size={16} strokeWidth={1.5} aria-hidden />
  ) : (
    <Square size={16} strokeWidth={1.5} aria-hidden />
  )}
  Ausstattung
</Button>
```

`ausstattungZeigen={ausstattung}` an `<Szene>` durchreichen.

- [ ] **Step 3: Gate**

Run: `bun run typecheck && bun run lint && bun run test && bun run build`
Expected: grün.

- [ ] **Step 4: Sichtprüfung im Browser**

`bun run dev`, Raum mit Tafel, Pult, Tür und zwei Fenstern öffnen, in die 3D-Ansicht wechseln. Prüfen: Uhr über der Tafel, Kreide auf der Ablage, Papierkorb am Pult, Pflanze in einer türfernen Ecke, Poster nicht auf der Tafelwand, Leuchten an der Decke; Schalter „Ausstattung“ blendet alles aus und wieder ein; Auswahl von Möbeln funktioniert weiter (Deko fängt keine Pointer-Events — kein `onClick` auf Deko-Meshes).

- [ ] **Step 5: Commit + PR**

```bash
git add src/components/plan/room3d/Szene.tsx src/components/plan/RoomPlan3D.tsx
git commit -m "feat: Ausstattung in der 3D-Szene mit Schalter"
git push -u origin feat/3d-ausstattung
gh pr create --title "feat: 3D-Ausstattung — Deko, Farbtokens, Schalter" --body "Setzt Phase 1 von docs/plans/3d-ausstattung.md um."
```

---

## Phase 2 — Neue Möbeltypen (Branch `feat/moebel-schrank-regal-waschbecken`, nach Merge von Phase 1)

### Task 5: Domäne — Typen, Mapping, Tests

**Files:**
- Modify: `src/data/types.ts` (`FurnitureKind`, `FURNITURE_SPECS`)
- Modify: `src/data/mapping.ts` (`TYP_ZU_KIND`, `KIND_ZU_TYP`)
- Test: `src/data/types.test.ts`, `src/data/mapping.test.ts`

**Interfaces:**
- Produces: `FurnitureKind` um `"schrank" | "regal" | "waschbecken"` erweitert; Spezifikationen:

```ts
schrank:     { label: "Schrank",     w: 120, h: 50, seats: 0 },
regal:       { label: "Regal",       w: 100, h: 35, seats: 0 },
waschbecken: { label: "Waschbecken", w: 60,  h: 45, seats: 0 },
```

- Dokument-Typen (Englisch, wie die bestehenden): `cabinet` ↔ `schrank`, `shelf` ↔ `regal`, `sink` ↔ `waschbecken`. `RAUM_DOKUMENT_VERSION` bleibt **3** — die Erweiterung ist additiv, und der bestehende Fallback (`TYP_ZU_KIND[o.typ] ?? "einzeltisch"`, `mapping.ts:100`) macht alte Leser tolerant (ein unbekannter Typ wird dort zum sitzlosen Einzeltisch-Rechteck, verliert aber keine Daten).

- [ ] **Step 1: Tests zuerst erweitern (schlagen fehl)**

In `src/data/types.test.ts` (im Stil der bestehenden `describe`-Blöcke):

```ts
describe("FURNITURE_SPECS — neue Typen", () => {
  it("kennt Schrank, Regal und Waschbecken ohne Sitzplätze", () => {
    expect(FURNITURE_SPECS.schrank).toEqual({ label: "Schrank", w: 120, h: 50, seats: 0 });
    expect(FURNITURE_SPECS.regal).toEqual({ label: "Regal", w: 100, h: 35, seats: 0 });
    expect(FURNITURE_SPECS.waschbecken).toEqual({ label: "Waschbecken", w: 60, h: 45, seats: 0 });
  });
  it("liefert für die neuen Typen keine Sitzpositionen", () => {
    expect(seatPositions("schrank")).toEqual([]);
    expect(seatPositions("regal")).toEqual([]);
    expect(seatPositions("waschbecken")).toEqual([]);
  });
});
```

In `src/data/mapping.test.ts` (Fixture-Stil der Datei übernehmen):

```ts
it("übersteht die Rundreise mit Schrank, Regal und Waschbecken", () => {
  const moebel = [
    makeFurniture("schrank", 0, 0),
    makeFurniture("regal", 200, 0),
    makeFurniture("waschbecken", 400, 0),
  ];
  const doc = zuRaumDokument(moebel);
  expect(doc.objekte.map((o) => o.typ)).toEqual(["cabinet", "shelf", "sink"]);
  expect(ausRaumDokument(doc)).toEqual(moebel);
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `bun run vitest run src/data/types.test.ts src/data/mapping.test.ts`
Expected: FAIL (Typfehler / unbekannte Schlüssel).

- [ ] **Step 3: `types.ts` und `mapping.ts` erweitern**

`FurnitureKind`-Union und `FURNITURE_SPECS` um die drei Einträge ergänzen (Werte exakt wie oben); in `mapping.ts` beide Tabellen um `cabinet`/`shelf`/`sink` ergänzen.

- [ ] **Step 4: Kompilierfehler als Wegweiser abarbeiten**

Run: `bun run typecheck`
Expected: Fehler in genau zwei Dateien, weil dort `Record<FurnitureKind, …>` vollständig sein muss: `src/components/plan/room3d/geometrie.ts` (`MOEBEL_AUFBAU`) und `src/components/plan/room3d/bausatz.ts` (`useBausatz().moebel`). **Noch nicht fixen** — das ist Task 6. Dieser Task endet ohne Commit; Task 5 und 6 werden zusammen committet, weil der Zwischenstand nicht kompiliert.

### Task 6: Darstellung — 2D-SVG, 3D-Bausatz, Palette, Deko-Rückbau

**Files:**
- Modify: `src/components/plan/room3d/geometrie.ts` (`MOEBEL_AUFBAU`)
- Modify: `src/components/plan/room3d/bausatz.ts` (drei Bau-Funktionen + `useBausatz`)
- Modify: `src/components/plan/RoomPlan.tsx` (`FurnitureShape`, neue `case`-Zweige)
- Modify: `src/routes/_authenticated/raeume.$id.tsx` (`PALETTE` + Icon-Imports)
- Modify: `src/components/plan/room3d/ausstattung.ts` + `ausstattung.test.ts` (Rückbau `schrankDeko`/`regalDeko`)
- Modify: `src/components/plan/room3d/Ausstattung3D.tsx` (Rückbau der beiden Bauteil-Zweige)

**Interfaces:**
- Consumes: Specs aus Task 5, `kasten`/`flaeche`/`beine` aus `bausatz.ts`, Werkstoff-Muster aus Phase 1.
- Produces: vollständige Darstellung der drei Typen in 2D und 3D; Palette bietet sie an; die Deko-Varianten `schrankDeko`/`regalDeko` existieren nicht mehr (`DekoArt` ohne diese Literale).

- [ ] **Step 1: `MOEBEL_AUFBAU` ergänzen**

```ts
schrank:     { hoehe: 190, sockel: 0 },
regal:       { hoehe: 120, sockel: 0 },
waschbecken: { hoehe: 85,  sockel: 0 },
```

- [ ] **Step 2: Bausatz-Funktionen schreiben**

In `bausatz.ts`, Werkstoffe erweitern (`holz: flaeche(farben["--wood"], 0.7)`, `keramik: flaeche(farben["--elevated"], 0.2)`, `metall: flaeche(farben["--metal"], 0.5)` in `werkstoffeBauen` + `Werkstoffe`-Typ):

```ts
/** Korpus mit zwei Türfugen und Griffen. */
function schrankBauen(w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS.schrank;
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU.schrank.hoehe);
  return [
    kasten(w.holz, [breite, hoehe, tiefe], [0, hoehe / 2, 0]),
    // Türfuge mittig, minimal vorstehend — wie die Trennfuge des Doppeltischs.
    kasten(w.gestell, [cmZuEinheit(1), hoehe * 0.92, cmZuEinheit(0.5)], [0, hoehe * 0.48, tiefe / 2]),
    kasten(w.metall, [cmZuEinheit(2), cmZuEinheit(10), cmZuEinheit(2)], [-cmZuEinheit(6), cmZuEinheit(100), tiefe / 2]),
    kasten(w.metall, [cmZuEinheit(2), cmZuEinheit(10), cmZuEinheit(2)], [cmZuEinheit(6), cmZuEinheit(100), tiefe / 2]),
  ];
}

/** Offenes Regal: Wangen, Böden, Rückwand. */
function regalBauen(w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS.regal;
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU.regal.hoehe);
  const staerke = cmZuEinheit(3);
  const teile: Bauteil[] = [
    kasten(w.holz, [staerke, hoehe, tiefe], [-(breite - staerke) / 2, hoehe / 2, 0]),
    kasten(w.holz, [staerke, hoehe, tiefe], [(breite - staerke) / 2, hoehe / 2, 0]),
    kasten(w.holz, [breite, staerke, cmZuEinheit(2)], [0, hoehe / 2, -tiefe / 2 + cmZuEinheit(1)]),
  ];
  for (const anteil of [0, 1 / 3, 2 / 3, 1]) {
    teile.push(kasten(w.holz, [breite, staerke, tiefe], [0, staerke / 2 + anteil * (hoehe - staerke), 0]));
  }
  return teile;
}

/** Keramikbecken auf Unterschrank mit Hahn. */
function waschbeckenBauen(w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS.waschbecken;
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU.waschbecken.hoehe);
  const beckenHoehe = cmZuEinheit(15);
  return [
    kasten(w.korpus, [breite - cmZuEinheit(6), hoehe - beckenHoehe, tiefe - cmZuEinheit(6)], [0, (hoehe - beckenHoehe) / 2, 0]),
    kasten(w.keramik, [breite, beckenHoehe, tiefe], [0, hoehe - beckenHoehe / 2, 0]),
    // Hahn: Steigrohr + Auslauf.
    { geometrie: new THREE.CylinderGeometry(cmZuEinheit(1.2), cmZuEinheit(1.2), cmZuEinheit(18), 8), material: w.metall, position: [0, hoehe + cmZuEinheit(9), -tiefe / 2 + cmZuEinheit(6)] },
    kasten(w.metall, [cmZuEinheit(2.4), cmZuEinheit(2.4), cmZuEinheit(12)], [0, hoehe + cmZuEinheit(17), -tiefe / 2 + cmZuEinheit(11)]),
  ];
}
```

In `useBausatz` die `moebel`-Map ergänzen: `schrank: schrankBauen(werkstoffe)`, `regal: regalBauen(werkstoffe)`, `waschbecken: waschbeckenBauen(werkstoffe)`.

- [ ] **Step 3: 2D-Zeichnung in `RoomPlan.tsx`**

In `FurnitureShape` (nach `case "fenster"`, um Zeile 124) drei Zweige — Stil der Nachbarn übernehmen (`w`/`h` sind dort die Spec-Maße):

```tsx
case "schrank":
  return (
    <g>
      <rect width={w} height={h} rx="2" fill="var(--wood)" stroke="var(--line-plan)" strokeWidth="1.5" />
      <line x1={w / 2} y1="0" x2={w / 2} y2={h} stroke="var(--line-plan)" strokeWidth="1" />
    </g>
  );
case "regal":
  return (
    <g>
      <rect width={w} height={h} rx="2" fill="var(--wood)" stroke="var(--line-plan)" strokeWidth="1.5" />
      <line x1={w / 3} y1="0" x2={w / 3} y2={h} stroke="var(--line-plan)" strokeWidth="1" />
      <line x1={(2 * w) / 3} y1="0" x2={(2 * w) / 3} y2={h} stroke="var(--line-plan)" strokeWidth="1" />
    </g>
  );
case "waschbecken":
  return (
    <g>
      <rect width={w} height={h} rx="3" fill="var(--elevated)" stroke="var(--line-plan)" strokeWidth="1.5" />
      <ellipse cx={w / 2} cy={h / 2} rx={w * 0.32} ry={h * 0.3} fill="none" stroke="var(--line-plan)" strokeWidth="1.5" />
      <circle cx={w / 2} cy={h * 0.14} r="2" fill="var(--line-plan)" />
    </g>
  );
```

- [ ] **Step 4: Palette in `raeume.$id.tsx`**

Icon-Imports ergänzen (`Archive`, `Rows3`, `Droplets` aus `lucide-react`), `PALETTE` erweitern:

```ts
{ kind: "schrank", icon: Archive },
{ kind: "regal", icon: Rows3 },
{ kind: "waschbecken", icon: Droplets },
```

- [ ] **Step 5: Deko-Rückbau**

In `ausstattung.ts`: Literale `"schrankDeko" | "regalDeko"` aus `DekoArt` entfernen, die zugehörigen Platzierungsblöcke (inklusive Wand-Belegungs-Tracker-Einträge für Schrank/Regal — der Tracker selbst bleibt für Poster) löschen. In `Ausstattung3D.tsx` die beiden Bauteil-Zweige entfernen. In `ausstattung.test.ts` den Test „lässt den Deko-Schrank weg …“ ersetzen durch:

```ts
it("enthält keine Großmöbel-Deko mehr — Schrank und Regal sind jetzt platzierbar", () => {
  const arten = ausstattungPlatzierungen(raumMit([])).map((p) => p.art);
  expect(arten).not.toContain("schrankDeko");
  expect(arten).not.toContain("regalDeko");
});
```

- [ ] **Step 6: Gate**

Run: `bun run typecheck && bun run lint && bun run test && bun run build`
Expected: grün — inklusive der in Task 5 geschriebenen Tests.

- [ ] **Step 7: Sichtprüfung**

`bun run dev`: Schrank, Regal, Waschbecken aus der Palette einfügen, drehen, verschieben; 2D und 3D vergleichen; einen KI-Vorschlag auf einem Plan mit Waschbecken auslösen — er muss ohne Fehler durchlaufen (die Edge Function ignoriert `sink`, weil es nicht in `OBJEKT_LABEL` steht — keine Codeänderung nötig, genau das ist das gewollte „Tolerieren“).

- [ ] **Step 8: Commit + PR**

```bash
git add -A
git commit -m "feat: Schrank, Regal und Waschbecken als platzierbare Möbel"
git push -u origin feat/moebel-schrank-regal-waschbecken
gh pr create --title "feat: Neue Möbeltypen Schrank, Regal, Waschbecken" --body "Setzt Phase 2 von docs/plans/3d-ausstattung.md um. Enthält den Rückbau der Großmöbel-Deko aus Phase 1."
```

---

## Ausdrücklich außerhalb des Umfangs

- Kein Dark Theme, keine Texturen, keine externen 3D-Modelle.
- Keine Persistenz des Ausstattungs-Schalters (bewusst entschieden am 2026-08-06).
- Keine Änderung an `supabase/functions/ki-sitzplan/index.ts` — der `OBJEKT_LABEL`-Filter deckt das Tolerieren neuer Typen bereits ab.
- Keine Änderung an Druckansicht und `RoomPlan`-Sitzplatzlogik.
