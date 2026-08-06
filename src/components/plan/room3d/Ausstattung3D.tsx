// Deko-Objekte der 3D-Szene: Uhr, Kreideablage, Papierkorb, Pflanze,
// Großmöbel-Deko, Poster, Fenstertöpfe, Deckenleuchten und Deckenkanten.
//
// Bauteile kommen aus reinen Grundkörpern (Box/Cylinder/Sphere), genau wie in
// `bausatz.ts`. Geometrien und Materialien entstehen einmal je Art und werden
// von allen Platzierungen geteilt — Muster: `useBausatz` (`bausatz.ts:222-249`).
// Deko bekommt **keine** Pointer-Handler: sie darf die Möbelauswahl nicht
// stören, deshalb kein `onClick` auf den Deko-Meshes.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { RoomGeometry } from "@/data/types";
import { ausstattungPlatzierungen, type DekoArt, type DekoPlatzierung } from "./ausstattung";
import { flaeche, kasten, type Bauteil } from "./bausatz";
import type { Szenenfarben } from "./farben";
import { cmZuEinheit, raumMasse } from "./geometrie";

/** Werkstoffe der Deko-Bauteile, aus den Szenenfarben-Tokens gebaut. */
type DekoWerkstoffe = {
  holz: THREE.Material;
  blatt: THREE.Material;
  metall: THREE.Material;
  papierkorbStoff: THREE.Material;
  papierA: THREE.Material;
  papierB: THREE.Material;
  papierC: THREE.Material;
  weiss: THREE.Material;
  dunkel: THREE.Material;
  kante: THREE.Material;
  schwammStoff: THREE.Material;
  leuchtend: THREE.Material;
};

/** Baut die Werkstoffe der Deko-Bauteile aus den Szenenfarben. */
function werkstoffeBauen(farben: Szenenfarben): DekoWerkstoffe {
  return {
    holz: flaeche(farben["--wood"], 0.7),
    blatt: flaeche(farben["--plant"], 0.9),
    metall: flaeche(farben["--metal"], 0.5),
    // Eigenes Material statt des geteilten `metall`, weil nur der offene
    // Papierkorb-Mantel `side: DoubleSide` braucht — sonst würden auch Uhr-Ring
    // und Griffe beidseitig gerendert.
    papierkorbStoff: new THREE.MeshStandardMaterial({
      color: farben["--metal"],
      roughness: 0.5,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
    papierA: flaeche(farben["--poster-a"], 0.95),
    papierB: flaeche(farben["--poster-b"], 0.95),
    papierC: flaeche(farben["--window"], 0.95),
    weiss: flaeche(farben["--elevated"], 0.6),
    dunkel: flaeche(farben["--line-plan"], 0.8),
    kante: flaeche(farben["--line-strong"], 0.9),
    schwammStoff: flaeche(farben["--sunken"], 0.95),
    leuchtend: new THREE.MeshStandardMaterial({
      color: farben["--elevated"],
      emissive: new THREE.Color(farben["--elevated"]),
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0,
    }),
  };
}

/** Zifferblatt, Ring und zwei Zeiger — flach zur Wand gekippt. */
function uhrTeile(w: DekoWerkstoffe): Bauteil[] {
  const zifferblattGeo = new THREE.CylinderGeometry(
    cmZuEinheit(15),
    cmZuEinheit(15),
    cmZuEinheit(3),
    24,
  );
  zifferblattGeo.rotateX(Math.PI / 2);
  const ringGeo = new THREE.CylinderGeometry(cmZuEinheit(17), cmZuEinheit(17), cmZuEinheit(2), 24);
  ringGeo.rotateX(Math.PI / 2);
  const kleinerZeigerGeo = new THREE.BoxGeometry(cmZuEinheit(1.5), cmZuEinheit(7), cmZuEinheit(1));
  kleinerZeigerGeo.rotateZ((60 * Math.PI) / 180);
  return [
    { geometrie: ringGeo, material: w.metall, position: [0, 0, cmZuEinheit(1)] },
    { geometrie: zifferblattGeo, material: w.weiss, position: [0, 0, cmZuEinheit(3)] },
    kasten(w.dunkel, [cmZuEinheit(1.5), cmZuEinheit(10), cmZuEinheit(1)], [0, 0, cmZuEinheit(4)]),
    { geometrie: kleinerZeigerGeo, material: w.dunkel, position: [0, 0, cmZuEinheit(4)] },
  ];
}

/** Schwamm auf der Kreideablage. */
function schwammTeile(w: DekoWerkstoffe): Bauteil[] {
  return [
    kasten(
      w.schwammStoff,
      [cmZuEinheit(12), cmZuEinheit(5), cmZuEinheit(6)],
      [0, 0, cmZuEinheit(3)],
    ),
  ];
}

/** Zwei liegende Kreidestücke, teilen sich eine Zylinder-Geometrie. */
function kreideTeile(w: DekoWerkstoffe): Bauteil[] {
  const geo = new THREE.CylinderGeometry(cmZuEinheit(1), cmZuEinheit(1), cmZuEinheit(8), 8);
  geo.rotateZ(Math.PI / 2);
  return [
    { geometrie: geo, material: w.weiss, position: [cmZuEinheit(-2), 0, cmZuEinheit(3)] },
    { geometrie: geo, material: w.weiss, position: [cmZuEinheit(2), 0, cmZuEinheit(3)] },
  ];
}

/** Offener Papierkorb-Mantel mit Boden. */
function papierkorbTeile(w: DekoWerkstoffe): Bauteil[] {
  const mantelGeo = new THREE.CylinderGeometry(
    cmZuEinheit(14),
    cmZuEinheit(11),
    cmZuEinheit(30),
    16,
    1,
    true,
  );
  const bodenGeo = new THREE.CylinderGeometry(cmZuEinheit(11), cmZuEinheit(11), cmZuEinheit(1), 16);
  return [
    { geometrie: mantelGeo, material: w.papierkorbStoff, position: [0, cmZuEinheit(15), 0] },
    { geometrie: bodenGeo, material: w.papierkorbStoff, position: [0, cmZuEinheit(0.5), 0] },
  ];
}

/** Topf, Stamm und Krone der Pflanze. */
function pflanzeTeile(w: DekoWerkstoffe): Bauteil[] {
  const topfGeo = new THREE.CylinderGeometry(cmZuEinheit(12), cmZuEinheit(9), cmZuEinheit(25), 12);
  const stammGeo = new THREE.CylinderGeometry(
    cmZuEinheit(2.5),
    cmZuEinheit(2.5),
    cmZuEinheit(25),
    8,
  );
  const kroneGeo = new THREE.SphereGeometry(cmZuEinheit(20), 12, 10);
  return [
    { geometrie: topfGeo, material: w.holz, position: [0, cmZuEinheit(12.5), 0] },
    { geometrie: stammGeo, material: w.holz, position: [0, cmZuEinheit(37.5), 0] },
    { geometrie: kroneGeo, material: w.blatt, position: [0, cmZuEinheit(45), 0] },
  ];
}

/** Poster-Fläche + Rahmen, dreimal — je Variante ein anderes Werkstoff, geteilte Geometrie. */
function posterTeile(w: DekoWerkstoffe): [Bauteil[], Bauteil[], Bauteil[]] {
  const posterGeo = new THREE.BoxGeometry(cmZuEinheit(60), cmZuEinheit(80), cmZuEinheit(1));
  const rahmenGeo = new THREE.BoxGeometry(cmZuEinheit(64), cmZuEinheit(84), cmZuEinheit(0.5));
  const bauen = (material: THREE.Material): Bauteil[] => [
    { geometrie: rahmenGeo, material: w.kante, position: [0, 0, cmZuEinheit(-0.5)] },
    { geometrie: posterGeo, material, position: [0, 0, cmZuEinheit(0.5)] },
  ];
  return [bauen(w.papierA), bauen(w.papierB), bauen(w.papierC)];
}

/** Kleiner Topf mit Grün auf der Fensterbank. */
function fensterTopfTeile(w: DekoWerkstoffe): Bauteil[] {
  const topfGeo = new THREE.CylinderGeometry(cmZuEinheit(6), cmZuEinheit(4.5), cmZuEinheit(10), 10);
  const kugelGeo = new THREE.SphereGeometry(cmZuEinheit(7), 10, 8);
  return [
    { geometrie: topfGeo, material: w.holz, position: [0, cmZuEinheit(5), 0] },
    { geometrie: kugelGeo, material: w.blatt, position: [0, cmZuEinheit(12), 0] },
  ];
}

/** Deckenleuchte: leuchtendes Panel mit Rahmen. */
function leuchteTeile(w: DekoWerkstoffe): Bauteil[] {
  return [
    kasten(w.leuchtend, [cmZuEinheit(120), cmZuEinheit(4), cmZuEinheit(30)], [0, 0, 0]),
    kasten(w.kante, [cmZuEinheit(124), cmZuEinheit(2), cmZuEinheit(34)], [0, cmZuEinheit(3), 0]),
  ];
}

/** Bauteil-Karte je Deko-Art — `poster` und `deckenkante` werden gesondert behandelt. */
type DekoTeileKarte = Record<Exclude<DekoArt, "poster" | "deckenkante">, Bauteil[]>;

/** Baut Werkstoffe und alle Bauteil-Listen einmal, analog zu `useBausatz`. */
function ausstattungBauen(farben: Szenenfarben): {
  werkstoffe: DekoWerkstoffe;
  karte: DekoTeileKarte;
  poster: [Bauteil[], Bauteil[], Bauteil[]];
} {
  const werkstoffe = werkstoffeBauen(farben);
  const karte: DekoTeileKarte = {
    uhr: uhrTeile(werkstoffe),
    schwamm: schwammTeile(werkstoffe),
    kreide: kreideTeile(werkstoffe),
    papierkorb: papierkorbTeile(werkstoffe),
    pflanze: pflanzeTeile(werkstoffe),
    fensterTopf: fensterTopfTeile(werkstoffe),
    leuchte: leuchteTeile(werkstoffe),
  };
  return { werkstoffe, karte, poster: posterTeile(werkstoffe) };
}

/** Rendert die Bauteile einer Deko-Platzierung als Grundkörper-Meshes ohne Pointer-Handler. */
function Bauteile({ teile }: { teile: Bauteil[] }) {
  return (
    <>
      {teile.map((teil, i) => (
        <mesh
          key={i}
          geometry={teil.geometrie}
          material={teil.material}
          position={teil.position}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

/** Weltposition einer Deko-Platzierung, zentriert auf die Raummitte wie bei Möbeln. */
function weltposition(
  p: DekoPlatzierung,
  raum: Pick<RoomGeometry, "width" | "height">,
): [number, number, number] {
  return [
    cmZuEinheit(p.xCm - raum.width / 2),
    cmZuEinheit(p.zCm),
    cmZuEinheit(p.yCm - raum.height / 2),
  ];
}

/** Szenendrehung einer Deko-Platzierung — negatives Vorzeichen wie `drehungZuRadiant`. */
function weltdrehung(p: DekoPlatzierung): [number, number, number] {
  return [0, (-p.drehungGrad * Math.PI) / 180, 0];
}

/** Platziert die Deko-Objekte der 3D-Szene. Deko fängt keine Pointer-Events. */
export function Ausstattung3D({ raum, farben }: { raum: RoomGeometry; farben: Szenenfarben }) {
  const ausstattung = useMemo(() => ausstattungBauen(farben), [farben]);
  const platzierungen = useMemo(() => ausstattungPlatzierungen(raum), [raum]);
  const { breite, tiefe } = raumMasse(raum);

  useEffect(() => {
    return () => {
      const teile = [...Object.values(ausstattung.karte).flat(), ...ausstattung.poster.flat()];
      // Manche Bauteile teilen sich eine Geometrie (z. B. die Kreidestücke); `dispose` ist idempotent.
      for (const teil of teile) teil.geometrie.dispose();
      for (const stoff of Object.values(ausstattung.werkstoffe)) stoff.dispose();
    };
  }, [ausstattung]);

  return (
    <group>
      {platzierungen.map((p, i) => {
        if (p.art === "poster") {
          // Literal-typierter Index (0 | 1 | 2), damit die Tupel-Indizierung unter
          // `noUncheckedIndexedAccess` ohne `| undefined` auskommt.
          const variante = p.variante === 1 ? 1 : p.variante === 2 ? 2 : 0;
          return (
            <group key={`poster-${i}`} position={weltposition(p, raum)} rotation={weltdrehung(p)}>
              <Bauteile teile={ausstattung.poster[variante]} />
            </group>
          );
        }
        if (p.art === "deckenkante") {
          // Länge kommt aus den Raummaßen, nicht aus einer festen Bauteil-Liste —
          // Muster `Wand` in Raumhuelle.tsx:48-64.
          const quer = p.drehungGrad === 90 || p.drehungGrad === 270;
          const laenge = quer ? tiefe : breite;
          return (
            <mesh
              key={`deckenkante-${i}`}
              position={weltposition(p, raum)}
              rotation={weltdrehung(p)}
              material={ausstattung.werkstoffe.kante}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[laenge, cmZuEinheit(6), cmZuEinheit(6)]} />
            </mesh>
          );
        }
        return (
          <group key={`${p.art}-${i}`} position={weltposition(p, raum)} rotation={weltdrehung(p)}>
            <Bauteile teile={ausstattung.karte[p.art]} />
          </group>
        );
      })}
    </group>
  );
}
