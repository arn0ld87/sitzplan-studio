// Platzierungslogik für die 3D-Ausstattung — reine Berechnung, kein Three.js.
//
// Konventionen
// ------------
// - Alles rechnet in **cm im Grundriss-Koordinatensystem** (x nach rechts,
//   y nach unten, z nach oben). Die Umrechnung in Welteinheiten passiert erst
//   in `Ausstattung3D.tsx` über `cmZuEinheit` und die Formel aus
//   `geometrie.ts` (`3D-X = x − width/2`, `3D-Z = y − height/2`, jeweils /100).
// - „Wandgebunden" heißt: `kind` ist `tafel`, `tuer` oder `fenster` **und**
//   der Abstand zur nächsten Wand < 40 cm.
// - Jede Deko, deren Platz nicht frei ist, wird **weggelassen** statt erzwungen.
// - Schrank/Regal/Poster teilen sich einen Wand-Belegungs-Tracker
//   (`Map<Wandseite, {von,bis}[]>`): Regal darf nicht in den Schrank-Abschnitt,
//   Poster nicht auf Schrank- oder Regal-Abschnitte.
// - Poster: nie auf der Wand der ersten Tafel, max. 3, je Wand höchstens
//   eines, `variante` zählt 0, 1, 2 in Fundreihenfolge.
//
// Zusatzvertrag (Review-Finding, Kollisionsprüfung für Boden-Deko):
// Bodenstehende Deko hat eine achsenparallele Grundfläche in cm (Mittelpunkt
// = xCm/yCm, nach Drehung ggf. getauscht): `papierkorb` 28×28, `pflanze`
// 40×40, `schrankDeko` 120×50, `regalDeko` 100×30. `fensterTopf` ist
// ausgenommen (steht auf der Fensterbank). Vor dem Aufnehmen einer solchen
// Platzierung wird geprüft, ob die Grundfläche ein Möbel-Rechteck aus
// `raum.furniture` (Grundfläche nach Drehung, wie `flaecheCm`) oder die
// Grundfläche einer bereits platzierten Boden-Deko überlappt. Überlappt sie,
// entfällt die Platzierung — Ausnahme Pflanze: dort werden zuerst die
// übrigen Ecken-Kandidaten in absteigender Türferne probiert, erst wenn
// keiner frei ist, entfällt sie ganz.

import {
  FURNITURE_SPECS,
  type Furniture,
  type FurnitureKind,
  type RoomGeometry,
} from "@/data/types";
import { WANDSEITEN, type Wandseite } from "./geometrie";

const WANDNAEHE_CM = 40;
const WANDGEBUNDEN = new Set<FurnitureKind>(["tafel", "tuer", "fenster"]);

export type DekoArt =
  | "uhr"
  | "schwamm"
  | "kreide"
  | "papierkorb"
  | "pflanze"
  | "schrankDeko"
  | "regalDeko"
  | "poster"
  | "fensterTopf"
  | "leuchte"
  | "deckenkante";

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

type Intervall = { von: number; bis: number };

/** Grundfläche in cm nach Drehung — 90°/270° tauschen Breite und Tiefe. */
function flaecheCm(f: Furniture): { w: number; h: number } {
  const spec = FURNITURE_SPECS[f.kind];
  const quer = f.rotation === 90 || f.rotation === 270;
  return { w: quer ? spec.h : spec.w, h: quer ? spec.w : spec.h };
}

/** Bestimmt die nächstliegende Wand eines Möbelstücks anhand seiner Grundfläche. */
export function naechsteWand(
  f: Furniture,
  raum: Pick<RoomGeometry, "width" | "height">,
): Wandseite {
  const { w, h } = flaecheCm(f);
  const abstaende: [Wandseite, number][] = [
    ["nord", f.y],
    ["sued", raum.height - (f.y + h)],
    ["west", f.x],
    ["ost", raum.width - (f.x + w)],
  ];
  abstaende.sort((a, b) => a[1] - b[1]);
  return abstaende[0]![0];
}

/** Abstand eines Möbelstücks zur ihm nächstliegenden Wand, in cm. */
function wandAbstand(f: Furniture, raum: Pick<RoomGeometry, "width" | "height">): number {
  const seite = naechsteWand(f, raum);
  const { w, h } = flaecheCm(f);
  switch (seite) {
    case "nord":
      return f.y;
    case "sued":
      return raum.height - (f.y + h);
    case "west":
      return f.x;
    case "ost":
      return raum.width - (f.x + w);
  }
}

/** Länge einer Wand in cm — nord/sued die Raumbreite, west/ost die Raumtiefe. */
function wandLaenge(seite: Wandseite, raum: Pick<RoomGeometry, "width" | "height">): number {
  return seite === "nord" || seite === "sued" ? raum.width : raum.height;
}

/** Intervall eines wandgebundenen Möbelstücks entlang der Wandachse, in cm. */
function wandIntervall(f: Furniture, seite: Wandseite): Intervall {
  const { w, h } = flaecheCm(f);
  if (seite === "nord" || seite === "sued") return { von: f.x, bis: f.x + w };
  return { von: f.y, bis: f.y + h };
}

/** Sortiert und verschmilzt überlappende/berührende Intervalle. */
function mergeIntervalle(intervalle: Intervall[]): Intervall[] {
  const sortiert = [...intervalle].sort((a, b) => a.von - b.von);
  const ergebnis: Intervall[] = [];
  for (const i of sortiert) {
    const letztes = ergebnis[ergebnis.length - 1];
    if (letztes && i.von <= letztes.bis) {
      letztes.bis = Math.max(letztes.bis, i.bis);
    } else {
      ergebnis.push({ ...i });
    }
  }
  return ergebnis;
}

/** Komplement einer Intervallliste innerhalb von `[0, laenge]`. */
function komplement(belegt: Intervall[], laenge: number): Intervall[] {
  const frei: Intervall[] = [];
  let cursor = 0;
  for (const b of belegt) {
    if (b.von > cursor) frei.push({ von: cursor, bis: b.von });
    cursor = Math.max(cursor, b.bis);
  }
  if (cursor < laenge) frei.push({ von: cursor, bis: laenge });
  return frei;
}

/** Freie Abschnitte einer Wand, nachdem alle wandgebundenen Möbel abgezogen sind. */
export function wandFreieAbschnitte(
  raum: Pick<RoomGeometry, "width" | "height" | "furniture">,
  seite: Wandseite,
): Intervall[] {
  const laenge = wandLaenge(seite, raum);
  const belegt = raum.furniture
    .filter((f) => WANDGEBUNDEN.has(f.kind))
    .filter((f) => naechsteWand(f, raum) === seite)
    .filter((f) => wandAbstand(f, raum) < WANDNAEHE_CM)
    .map((f) => wandIntervall(f, seite));
  return komplement(mergeIntervalle(belegt), laenge);
}

/** Drehung, mit der ein Objekt an einer Wand „der Wand zugewandt" steht. */
function wandzugewandteDrehung(seite: Wandseite): 0 | 90 | 180 | 270 {
  switch (seite) {
    case "nord":
      return 0;
    case "sued":
      return 180;
    case "west":
      return 90;
    case "ost":
      return 270;
  }
}

/** Drehung, mit der ein Objekt wandparallel liegt (Längsachse entlang der Wand). */
function wandparalleleDrehung(seite: Wandseite): 0 | 90 | 180 | 270 {
  return seite === "west" || seite === "ost" ? 90 : 0;
}

type Rechteck = { xVon: number; xBis: number; yVon: number; yBis: number };

function rechteckAusMitte(xCm: number, yCm: number, w: number, h: number): Rechteck {
  return { xVon: xCm - w / 2, xBis: xCm + w / 2, yVon: yCm - h / 2, yBis: yCm + h / 2 };
}

function rechteckeUeberlappen(a: Rechteck, b: Rechteck): boolean {
  return a.xVon < b.xBis && a.xBis > b.xVon && a.yVon < b.yBis && a.yBis > b.yVon;
}

function moebelRechteck(f: Furniture): Rechteck {
  const { w, h } = flaecheCm(f);
  return { xVon: f.x, xBis: f.x + w, yVon: f.y, yBis: f.y + h };
}

/**
 * Prüft, ob die achsenparallele Grundfläche einer Boden-Deko (Mittelpunkt
 * `xCm`/`yCm`, Maße `w`×`h` nach Drehung) mit einem Möbelstück aus
 * `furniture` oder einer bereits platzierten Boden-Deko kollidiert.
 */
function bodenflaecheFrei(
  xCm: number,
  yCm: number,
  w: number,
  h: number,
  furniture: Furniture[],
  bereitsPlatziert: Rechteck[],
): boolean {
  const kandidat = rechteckAusMitte(xCm, yCm, w, h);
  for (const f of furniture) {
    if (rechteckeUeberlappen(kandidat, moebelRechteck(f))) return false;
  }
  for (const r of bereitsPlatziert) {
    if (rechteckeUeberlappen(kandidat, r)) return false;
  }
  return true;
}

export function ausstattungPlatzierungen(raum: RoomGeometry): DekoPlatzierung[] {
  const ergebnis: DekoPlatzierung[] = [];
  /** Grundflächen bereits platzierter Boden-Deko, für die Kollisionsprüfung nachfolgender Deko. */
  const bodenRechtecke: Rechteck[] = [];

  const tafeln = raum.furniture.filter((f) => f.kind === "tafel");
  const ersteTafel = tafeln[0];

  // uhr
  if (ersteTafel) {
    const seite = naechsteWand(ersteTafel, raum);
    const intervall = wandIntervall(ersteTafel, seite);
    const mitte = (intervall.von + intervall.bis) / 2;
    if (seite === "nord" || seite === "sued") {
      ergebnis.push({
        art: "uhr",
        xCm: mitte,
        yCm: seite === "nord" ? 0 : raum.height,
        zCm: 255,
        drehungGrad: wandzugewandteDrehung(seite),
      });
    } else {
      ergebnis.push({
        art: "uhr",
        xCm: seite === "west" ? 0 : raum.width,
        yCm: mitte,
        zCm: 255,
        drehungGrad: wandzugewandteDrehung(seite),
      });
    }
  } else {
    ergebnis.push({
      art: "uhr",
      xCm: raum.width / 2,
      yCm: 4,
      zCm: 255,
      drehungGrad: wandzugewandteDrehung("nord"),
    });
  }

  // schwamm / kreide — nur mit Tafel, auf der Wandachse der Tafel.
  if (ersteTafel) {
    const seite = naechsteWand(ersteTafel, raum);
    const intervall = wandIntervall(ersteTafel, seite);
    const mitte = (intervall.von + intervall.bis) / 2;
    const aufWandachse = (versatz: number) => mitte + versatz;
    if (seite === "nord" || seite === "sued") {
      ergebnis.push({
        art: "schwamm",
        xCm: aufWandachse(-30),
        yCm: seite === "nord" ? 0 : raum.height,
        zCm: 91,
        drehungGrad: wandzugewandteDrehung(seite),
      });
      ergebnis.push({
        art: "kreide",
        xCm: aufWandachse(22),
        yCm: seite === "nord" ? 0 : raum.height,
        zCm: 91,
        drehungGrad: wandzugewandteDrehung(seite),
      });
    } else {
      ergebnis.push({
        art: "schwamm",
        xCm: seite === "west" ? 0 : raum.width,
        yCm: aufWandachse(-30),
        zCm: 91,
        drehungGrad: wandzugewandteDrehung(seite),
      });
      ergebnis.push({
        art: "kreide",
        xCm: seite === "west" ? 0 : raum.width,
        yCm: aufWandachse(22),
        zCm: 91,
        drehungGrad: wandzugewandteDrehung(seite),
      });
    }
  }

  // papierkorb — neben dem ersten Pult, sonst Ecke (40, 40).
  {
    const PAPIERKORB = 28;
    const erstesPult = raum.furniture.find((f) => f.kind === "pult");
    let xCm: number;
    let yCm: number;
    if (erstesPult) {
      const { w, h } = flaecheCm(erstesPult);
      xCm = erstesPult.x + w + 25;
      yCm = erstesPult.y + h / 2;
    } else {
      xCm = 40;
      yCm = 40;
    }
    if (bodenflaecheFrei(xCm, yCm, PAPIERKORB, PAPIERKORB, raum.furniture, bodenRechtecke)) {
      const rechteck = rechteckAusMitte(xCm, yCm, PAPIERKORB, PAPIERKORB);
      bodenRechtecke.push(rechteck);
      ergebnis.push({ art: "papierkorb", xCm, yCm, zCm: 0, drehungGrad: 0 });
    }
  }

  // pflanze — türfernste freie Ecke, Kandidaten in absteigender Türferne durchprobieren.
  if (raum.width >= 200 && raum.height >= 200) {
    const PFLANZE = 40;
    const tueren = raum.furniture.filter((f) => f.kind === "tuer");
    const tuerMitten = tueren.map((t) => {
      const { w, h } = flaecheCm(t);
      return { x: t.x + w / 2, y: t.y + h / 2 };
    });
    const ecken: { x: number; y: number }[] = [
      { x: 35, y: 35 },
      { x: raum.width - 35, y: 35 },
      { x: 35, y: raum.height - 35 },
      { x: raum.width - 35, y: raum.height - 35 },
    ];
    const mindestabstand = (ecke: { x: number; y: number }) =>
      tuerMitten.length === 0
        ? Infinity
        : Math.min(...tuerMitten.map((t) => Math.hypot(ecke.x - t.x, ecke.y - t.y)));
    const kandidaten = [...ecken].sort((a, b) => mindestabstand(b) - mindestabstand(a));
    for (const ecke of kandidaten) {
      if (bodenflaecheFrei(ecke.x, ecke.y, PFLANZE, PFLANZE, raum.furniture, bodenRechtecke)) {
        const rechteck = rechteckAusMitte(ecke.x, ecke.y, PFLANZE, PFLANZE);
        bodenRechtecke.push(rechteck);
        ergebnis.push({ art: "pflanze", xCm: ecke.x, yCm: ecke.y, zCm: 0, drehungGrad: 0 });
        break;
      }
    }
  }

  // Wand-Belegungs-Tracker für Schrank/Regal/Poster.
  const belegt = new Map<Wandseite, Intervall[]>();
  for (const seite of WANDSEITEN) belegt.set(seite, []);

  function belegeAbschnitt(seite: Wandseite, intervall: Intervall) {
    belegt.get(seite)!.push(intervall);
  }

  function freieAbschnitteMitTracker(seite: Wandseite): Intervall[] {
    const basis = wandFreieAbschnitte(raum, seite);
    const zusatz = belegt.get(seite)!;
    if (zusatz.length === 0) return basis;
    // Von den Basis-Freistellen die bereits vom Tracker belegten Abschnitte abziehen.
    const ergebnisse: Intervall[] = [];
    for (const b of basis) {
      let stuecke: Intervall[] = [b];
      for (const z of mergeIntervalle(zusatz)) {
        const naechste: Intervall[] = [];
        for (const s of stuecke) {
          if (z.bis <= s.von || z.von >= s.bis) {
            naechste.push(s);
            continue;
          }
          if (z.von > s.von) naechste.push({ von: s.von, bis: z.von });
          if (z.bis < s.bis) naechste.push({ von: z.bis, bis: s.bis });
        }
        stuecke = naechste;
      }
      ergebnisse.push(...stuecke);
    }
    return ergebnisse;
  }

  // schrankDeko — erster freier Abschnitt ≥ 130 cm, Suche sued → ost → west.
  {
    const SCHRANK_BREITE = 120;
    const SCHRANK_TIEFE = 50;
    const MIN_BREITE = 130;
    for (const seite of ["sued", "ost", "west"] as const) {
      const abschnitt = freieAbschnitteMitTracker(seite).find((a) => a.bis - a.von >= MIN_BREITE);
      if (!abschnitt) continue;
      const mitte = (abschnitt.von + abschnitt.bis) / 2;
      const wandversatz = 2 + SCHRANK_TIEFE / 2; // 27 cm vor der Wand
      let xCm: number;
      let yCm: number;
      if (seite === "sued") {
        xCm = mitte;
        yCm = raum.height - wandversatz;
      } else if (seite === "west") {
        xCm = wandversatz;
        yCm = mitte;
      } else {
        xCm = raum.width - wandversatz;
        yCm = mitte;
      }
      ergebnis.push({
        art: "schrankDeko",
        xCm,
        yCm,
        zCm: 0,
        drehungGrad: wandparalleleDrehung(seite),
      });
      const halbeBreite = SCHRANK_BREITE / 2;
      belegeAbschnitt(seite, { von: mitte - halbeBreite, bis: mitte + halbeBreite });
      break;
    }
  }

  // regalDeko — wie schrankDeko, Mindestbreite 110, Tiefe 30 → 17 cm vor der Wand.
  {
    const REGAL_BREITE = 100;
    const REGAL_TIEFE = 30;
    const MIN_BREITE = 110;
    // Gleiche Reihenfolge wie beim Schrank; der Tracker schließt dessen
    // Abschnitt bereits aus, unabhängig davon, auf welcher Wand er steht.
    for (const seite of ["sued", "ost", "west"] as const) {
      const abschnitt = freieAbschnitteMitTracker(seite).find((a) => a.bis - a.von >= MIN_BREITE);
      if (!abschnitt) continue;
      const mitte = (abschnitt.von + abschnitt.bis) / 2;
      const wandversatz = 2 + REGAL_TIEFE / 2; // 17 cm vor der Wand
      let xCm: number;
      let yCm: number;
      if (seite === "sued") {
        xCm = mitte;
        yCm = raum.height - wandversatz;
      } else if (seite === "west") {
        xCm = wandversatz;
        yCm = mitte;
      } else {
        xCm = raum.width - wandversatz;
        yCm = mitte;
      }
      ergebnis.push({
        art: "regalDeko",
        xCm,
        yCm,
        zCm: 0,
        drehungGrad: wandparalleleDrehung(seite),
      });
      const halbeBreite = REGAL_BREITE / 2;
      belegeAbschnitt(seite, { von: mitte - halbeBreite, bis: mitte + halbeBreite });
      break;
    }
  }

  // poster — bis zu 3, auf allen Wänden außer der Tafelwand, je Wand höchstens eines.
  {
    const POSTER_MIN = 80;
    const tafelSeite = ersteTafel ? naechsteWand(ersteTafel, raum) : null;
    let variante = 0;
    for (const seite of WANDSEITEN) {
      if (variante >= 3) break;
      if (seite === tafelSeite) continue;
      const abschnitt = freieAbschnitteMitTracker(seite).find((a) => a.bis - a.von >= POSTER_MIN);
      if (!abschnitt) continue;
      const mitte = (abschnitt.von + abschnitt.bis) / 2;
      const wandversatz = 1;
      let xCm: number;
      let yCm: number;
      if (seite === "nord") {
        xCm = mitte;
        yCm = wandversatz;
      } else if (seite === "sued") {
        xCm = mitte;
        yCm = raum.height - wandversatz;
      } else if (seite === "west") {
        xCm = wandversatz;
        yCm = mitte;
      } else {
        xCm = raum.width - wandversatz;
        yCm = mitte;
      }
      ergebnis.push({
        art: "poster",
        xCm,
        yCm,
        zCm: 160,
        drehungGrad: wandparalleleDrehung(seite),
        variante,
      });
      variante += 1;
    }
  }

  // fensterTopf — je Fenster ein Topf, auf der Fensterbank.
  {
    const fenster = raum.furniture.filter((f) => f.kind === "fenster");
    for (const f of fenster) {
      const seite = naechsteWand(f, raum);
      const { w, h } = flaecheCm(f);
      const mitteX = f.x + w / 2;
      const mitteY = f.y + h / 2;
      let xCm: number;
      let yCm: number;
      if (seite === "nord") {
        xCm = mitteX;
        yCm = 8;
      } else if (seite === "sued") {
        xCm = mitteX;
        yCm = raum.height - 8;
      } else if (seite === "west") {
        xCm = 8;
        yCm = mitteY;
      } else {
        xCm = raum.width - 8;
        yCm = mitteY;
      }
      ergebnis.push({
        art: "fensterTopf",
        xCm,
        yCm,
        zCm: 90,
        drehungGrad: wandzugewandteDrehung(seite),
      });
    }
  }

  // leuchte — Deckenraster.
  {
    const nx = Math.max(2, Math.round(raum.width / 300));
    const ny = Math.max(2, Math.round(raum.height / 300));
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        ergebnis.push({
          art: "leuchte",
          xCm: (raum.width * (i + 0.5)) / nx,
          yCm: (raum.height * (j + 0.5)) / ny,
          zCm: 293,
          drehungGrad: 0,
        });
      }
    }
  }

  // deckenkante — vier Einträge, je Wand einer.
  for (const seite of WANDSEITEN) {
    let xCm: number;
    let yCm: number;
    if (seite === "nord") {
      xCm = raum.width / 2;
      yCm = 0;
    } else if (seite === "sued") {
      xCm = raum.width / 2;
      yCm = raum.height;
    } else if (seite === "west") {
      xCm = 0;
      yCm = raum.height / 2;
    } else {
      xCm = raum.width;
      yCm = raum.height / 2;
    }
    ergebnis.push({
      art: "deckenkante",
      xCm,
      yCm,
      zCm: 297,
      drehungGrad: wandparalleleDrehung(seite),
    });
  }

  return ergebnis;
}
