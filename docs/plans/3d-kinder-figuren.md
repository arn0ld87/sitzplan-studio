# 3D-Kinderfiguren — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ziel:** Die 3D-Ansicht bekommt sitzende Kinderfiguren auf allen belegten Sitzplätzen. Die Figuren reagieren auf Hover und Auswahl, animieren sich dezent und passen zum bestehenden prozeduralen Stil.

**Architektur:** Der Plan erweitert die 3D-Szene um eine neue, testbare Domänenschicht und eine R3F-Komponente. Er berührt weder Datenbank noch API — die Zuordnung kommt aus `SeatingPlan.assignments`, die heute dem Raum-Editor fehlt. Deshalb wird zuerst eine rein lokale Belegungsübergabe an `RoomPlan3D` eingeführt; der Sitzplan-Route kann sie später durchreichen.

**Tech-Stack:** React 19, @react-three/fiber, Three.js (nur Grundkörper, keine Modelle/Texturen), Vitest, CSS-Variablen aus `src/styles.css`.

## Globale Zwänge

- **Designsystem ist SSoT.** Jede neue Farbe kommt als CSS-Token in `src/styles.css` und wird in `docs/designsystem.md` dokumentiert. Die 3D-Szene liest Tokens ausschließlich über `leseSzenenfarben()` in `src/components/plan/room3d/farben.ts`.
- **Nur Three.js-Grundkörper.** Keine externen Modelle, keine Texturen.
- **Geometrien/Materialien einmal je Art bauen und teilen**, `dispose` beim Abbau (Muster: `useBausatz`).
- **Maßeinheit:** cm → Welteinheiten über `cmZuEinheit()`.
- **Sitzplatz-Muster `<objektId>__sitz_<n>`** bleibt Vertrag zwischen Domäne und 3D.
- **Gate vor jedem Commit:** `bun run typecheck && bun run lint && bun run test && bun run build`.
- **Kein Edit auf `main`.** Branch `feat/3d-kinder-figuren`, PR.
- **Tests erweitern, nie passend machen.** Neue Testdateien: `src/components/plan/room3d/kinder.test.ts`, `src/components/plan/room3d/kinderGeometrie.test.ts`.

## Bestandsaufnahme (verifiziert am 2026-08-06)

| Baustein | Ort | Rolle |
| --- | --- | --- |
| `RoomGeometry` | `src/data/types.ts:200-208` | Hat `furniture`, aber **keine** Sitzplatzbelegung. |
| `SeatingPlan` | `src/data/types.ts:214-225` | Enthält `assignments: Record<seatId, studentId>`. |
| `RoomPlan3D` | `src/components/plan/RoomPlan3D.tsx:113` | Wird im Raum-Editor verwendet, kennt heute keine Klasse/Belegung. |
| `Szene` | `src/components/plan/room3d/Szene.tsx:80` | Rendert Canvas, Möbel, Ausstattung; `frameloop="demand"`. |
| `Moebel3D` | `src/components/plan/room3d/Moebel3D.tsx:63` | Platziert Möbel + Stühle; erhält `selectedId`/`onSelect`. |
| `stuhlPlatzierung` | `src/components/plan/room3d/geometrie.ts:139` | Liefert Stuhlposition im lokalen Möbel-KOS. |
| `studentColor` | `src/data/types.ts:14` | Mappt `colorIndex` auf eine Farbe. |

## Entscheidungen (vereinbart)

- Figuren erscheinen **nur auf zugewiesenen Sitzen**.
- **Prozedurale** Figuren aus Three.js-Grundkörpern, keine externen Assets.
- **Animationen:** Idle-Wippen; Hover über Figur = Winken + Kopf zur Kamera drehen; Klick auf zugehörigen Sitz = kurzer Hüpfer.
- **Frameloop:** Animationen nur, wenn Kinderfiguren im Viewport sichtbar sind; sonst `demand`.
- **Farben:** einheitliche Hautfarbe, buntes Oberteil aus `studentColor(colorIndex)`.
- **Tests:** Domänentest für Belegungsauflösung + Geometrie-Test für Sitzposition.

## Phase 1 — Datenfluss: Belegung in die Szene bringen

**Files:**
- Modify: `src/components/plan/RoomPlan3D.tsx`
- Modify: `src/components/plan/room3d/Szene.tsx`
- Modify: `src/routes/_authenticated/sitzplaene.$id.tsx` (später; siehe Phase 4)

### Task 1.1: Neuer Prop für Sitzplatzbelegung

**Interface in `RoomPlan3D`:**

```ts
export type SeatAssignment = {
  seatId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  colorIndex: number;
};
```

- [ ] `SeatAssignment` in `src/data/types.ts` ergänzen.
- [ ] `RoomPlan3D` bekommt optionalen Prop `belegung?: SeatAssignment[]`.
- [ ] `Szene` bekommt denselben Prop und gibt ihn an `Moebel3D` weiter.
- [ ] **Raum-Editor bleibt unberührt** — dort gibt es keine Belegung, also auch keine Kinderfiguren.

## Phase 2 — Domäne: Belegung pro Stuhl auflösen

**Files:**
- New: `src/components/plan/room3d/kinder.ts`
- New: `src/components/plan/room3d/kinder.test.ts`

### Task 2.1: Sitzplatzbelegung pro Möbelstück auflösen

- [ ] Funktion `belegungFuerMoebel(belegung, moebel)` liefert `Array<{ seatIndex: number; student: SeatAssignment }>`.
- [ ] Nutzt `parseSeatId` und `seatId`, um jede Belegung dem richtigen `moebel.seats[n]` zuzuordnen.
- [ ] Ignoriert Belegungen, deren `seatId` nicht zu diesem Möbelstück passt (tolerant gegenüber alten Daten).

### Task 2.2: Test `kinder.test.ts`

- [ ] Einzel- und Doppeltisch mit vollständiger/partialer Belegung.
- [ ] Belegung mit ungültiger/unbekannter `seatId` wird ignoriert.
- [ ] Leere Belegung liefert leere Liste.

## Phase 3 — Geometrie: Sitzende Figur positionieren

**Files:**
- Modify: `src/components/plan/room3d/geometrie.ts`
- New: `src/components/plan/room3d/kinderGeometrie.test.ts`

### Task 3.1: Sitzposition für Kind berechnen

- [ ] Funktion `kindPlatzierung(stuhlIndex: number, kind: FurnitureKind)` berechnet lokale Position + Drehung, sodass die Figur auf dem Stuhl sitzt, nicht darin oder daneben.
- [ ] Berücksichtigt `STUHL.sitzhoehe` und die Stuhlausrichtung.

### Task 3.2: Test `kinderGeometrie.test.ts`

- [ ] Figur sitzt auf Sitzfläche (Y ≈ Sitzhöhe + Rumpf-Hälfte).
- [ ] Figur schaut vom Tisch weg (Drehung stimmt für Einzel- und Doppeltisch).
- [ ] Bei Doppeltisch sind beide Figuren spiegelverkehrt korrekt ausgerichtet.

## Phase 4 — Rendering: `Kind3D` und `Kinder3D`

**Files:**
- New: `src/components/plan/room3d/Kind3D.tsx`
- Modify: `src/components/plan/room3d/Moebel3D.tsx`
- Modify: `src/components/plan/room3d/bausatz.ts` (optional, falls Geometrien geteilt werden)

### Task 4.1: Prozedurale Figur

- [ ] `Kind3D` baut aus `SphereGeometry` (Kopf), `BoxGeometry` (Rumpf), `CylinderGeometry` (Arme/Beine) eine sitzende, stilisierte Figur.
- [ ] Hautfarbe als Material (Token `--skin` oder lokaler Wert, später ggf. Designsystem).
- [ ] Oberteil-Farbe aus `studentColor(colorIndex)`.
- [ ] `castShadow`, `receiveShadow`.

### Task 4.2: Animationen

- [ ] **Idle:** Leichtes Wippen (`useFrame`, Sinus, Amplitude < 1 cm).
- [ ] **Hover:** `onPointerOver`/`onPointerOut` setzen internen State; Arm hebt sich, Kopf dreht zur Kamera (`lookAt` oder lokale Rotation).
- [ ] **Klick/Auswahl:** Wenn `selectedId === moebel.id`, kurzer Hüpfer über ~15 Frames; danach wieder Idle.
- [ ] Frameloop-Erweiterung: `Szene` setzt `frameloop` auf `"always"`, sobald mindestens eine `Kind3D`-Instanz sichtbar und animiert ist; sonst `"demand"`. Umsetzung über `useThree().setFrameloop` oder Kapselung in einem neuen `AnimationsManager`.

### Task 4.3: Einbindung in `Moebel3D`

- [ ] `Moebel3D` bekommt `belegung?: SeatAssignment[]`.
- [ ] Pro belegtem Stuhl wird `<Kind3D />` innerhalb der Stuhl-Gruppe gerendert.
- [ ] Klick auf Kind stoppt Propagation nicht; `onSelect` bleibt am Möbel-Gruppen-Event.

## Phase 5 — Sichtbarkeit: Nur animieren, wenn nötig

**Files:**
- Modify: `src/components/plan/room3d/Kind3D.tsx`
- Modify: `src/components/plan/room3d/Szene.tsx`

### Task 5.1: Sichtbarkeitstracking

- [ ] Jede `Kind3D`-Instanz meldet über `useFrame` + Kamera-Frustum oder Bounding-Box, ob sie sichtbar ist.
- [ ] Einfachere Variante: `Szene` schaltet auf `"always"`, sobald `belegung` mindestens einen Eintrag hat und 3D aktiv ist; wenn Performance-Tests das zulassen, bevorzugen. (Erwähnen: Detailentscheidung bei Implementierung.)

## Phase 6 — Integration im Sitzplan-Route

**Files:**
- Modify: `src/routes/_authenticated/sitzplaene.$id.tsx`

### Task 6.1: Belegung an 3D weiterreichen

- [ ] Aus `plan.assignments` und der geladenen Klasse `students` `SeatAssignment[]` bilden.
- [ ] An `RoomPlan3D` übergeben, wenn 3D-Tab aktiv ist.
- [ ] ARIA-Beschreibung in `RoomPlan3D` erweitern: „…, X von Y Sitzplätzen belegt“.

## Phase 7 — Gate & Abnahme

- [ ] `bun run typecheck` sauber.
- [ ] `bun run lint` sauber.
- [ ] `bun run test` sauber; neue Tests grün.
- [ ] `bun run build` durchläuft.
- [ ] Visueller Check: Sitzplan-Route → 3D-Tab → belegte Sitze zeigen Kinder, unbelegte nicht.
- [ ] Visueller Check: Hover über Kind löst Winken aus; Auswahl des Sitzes löst Hüpfer aus.

## Offene Detailentscheidungen (beim Implementieren klären)

1. Soll `--skin` ein neues Designsystem-Token werden, oder bleibt es ein lokaler Wert in `Kind3D`?
2. Verwenden wir `@react-three/drei` für `useFrame`-Helfer, oder bleiben wir bei nativem R3F?
3. Wie genau tracken wir Sichtbarkeit — Frustum-Test pro Frame oder heuristisch über Belegung?

## Risiken

- **Performance:** Viele belegte Sitze × komplexe Figuren kann den Renderer belasten. Gegenmaßnahme: geteilte Geometrien/Materialien, ggf. Instancing für identische Segmente.
- **Zugänglichkeit:** Animationen ohne reduzierte Bewegungseinstellung (prefers-reduced-motion) sind problematisch. Gegenmaßnahme: Idle deaktivieren, wenn `matchMedia('(prefers-reduced-motion: reduce)')` zutrifft.
- **Breaking Change:** `RoomPlan3D` bekommt neue Props. Gegenmaßnahme: `belegung` ist optional.
