# Runbook: Produktivbetrieb auf armserver

Die Anwendung läuft als Docker-Container auf **armserver** (aarch64, Ubuntu
26.04) hinter dem dort schon vorhandenen Traefik und ist unter
**https://jana.alexle135.de** erreichbar.

|                    |                                                            |
| ------------------ | ---------------------------------------------------------- |
| Arbeitsverzeichnis | `/home/alex/sitzplan-studio` (Klon von `main`)             |
| Container          | `sitzplan-studio`, Abbild `sitzplan-studio:prod`           |
| Compose-Datei      | [`docker-compose.prod.yml`](../../docker-compose.prod.yml) |
| Reverse Proxy      | Traefik in `/opt/traefik`, externes Netz `proxy`           |
| Zertifikat         | `letsencrypt`, DNS-Challenge über Cloudflare               |

## Ausrollen

```bash
ssh armserver 'cd /home/alex/sitzplan-studio \
  && git switch main \
  && git pull --ff-only origin main \
  && docker compose -f docker-compose.prod.yml up -d --build'
```

`git switch main` steht davor, weil der Klon nicht zwangsläufig auf `main`
liegt — nach einem Rollback oder einem Probelauf aus einem Zweig steht er
woanders, und ein bloßes `git pull` würde dann den falschen Stand holen.
`--ff-only` bricht ab, statt bei einer Abweichung stillschweigend einen
Merge-Commit auf dem Server anzulegen: Auf einer Maschine, die nur ausliefert,
ist jede lokale Abweichung ein Fehler und keine Sache, die man zusammenführt.

Gebaut wird auf dem Server, nicht lokal. Das erspart eine Registry und stellt
sicher, dass das Abbild zur Architektur des Zielrechners passt. Der Bau dauert
wenige Minuten; währenddessen läuft der alte Container weiter und wird erst
beim `up -d` ersetzt.

Vor dem Ausrollen gilt das [Gate](pre-push-gate.md). Der Docker-Bau wiederholt
zwar `vite build`, aber weder Typprüfung noch Tests — ein Abbild kann also
fehlerfrei entstehen und trotzdem kaputt sein.

## Zuerst die Datenbank, dann der Container

Der Befehl oben rollt allein die Anwendung aus. Enthält ein Release zusätzlich
eine Migration unter `supabase/migrations/` oder eine Änderung an
`supabase/functions/ki-sitzplan`, gehören die **vorher** hinaus — sonst läuft die
neue Anwendung gegen ein altes Schema und scheitert erst zur Laufzeit, mitten in
der Benutzung.

Beides läuft vom Arbeitsplatz aus gegen das verknüpfte Projekt, nicht auf dem
Server:

```bash
supabase db push                                   # Tabellen, Trigger, RLS-Policies
supabase functions deploy ki-sitzplan --use-api    # nur wenn die Funktion sich geändert hat
```

Ob eine Migration dabei ist, verrät ein Blick auf den Bereich zwischen
ausgeliefertem und neuem Stand:

```bash
git diff --name-only <letzter-ausgerollter-commit>..main -- supabase/
```

Die Reihenfolge „Schema zuerst" gilt, solange Migrationen **hinzufügen**. Wer
eine Spalte entfernt oder umbenennt, dreht die Abhängigkeit um: Dann läuft die
alte Anwendung für die Dauer des Baus gegen das neue Schema. Solche Migrationen
gehören in zwei Schritte — erst additiv ausrollen, Anwendung nachziehen, dann in
einem späteren Release aufräumen.

## Die Falle: Nitro baut voreingestellt für Cloudflare

`@lovable.dev/vite-tanstack-config` setzt `defaultPreset: "cloudflare-module"`.
Ein gewöhnliches `bun run build` erzeugt damit ein Worker-Bundle, das
`node .output/server/index.mjs` **nicht** starten kann. Für den Container muss

```
NITRO_PRESET=node-server
```

gesetzt sein; das [`Dockerfile`](../../Dockerfile) tut das in der Bau-Stufe.
Ob es gegriffen hat, verrät `.output/nitro.json`: Dort muss `preset` auf
`node-server` stehen und `commands.preview` auf `node ./server/index.mjs`
lauten. Steht dort `cloudflare-module`, startet der Container in einer
Neustartschleife.

Die Voreinstellung bleibt bewusst unangetastet, damit die Lovable-Sandbox
weiterhin ihren eigenen Weg geht. Der Docker-Bau weicht über die
Umgebungsvariable ab, nicht über eine Änderung an `vite.config.ts`.

## Schlüssel

Die Datei `/home/alex/sitzplan-studio/.env` liegt mit `chmod 600` neben der
Compose-Datei und ist **nicht** im Repository. Sie überlebt `git pull` und
`git reset --hard`, weil sie nicht versioniert ist — nach einem Neuklon muss
sie aber neu hinterlegt werden.

Fehlt sie, bricht der Bau sofort ab:

```
required variable SUPABASE_SERVICE_ROLE_KEY is missing a value
```

Dafür sorgt die `${VAR:?meldung}`-Schreibweise in der Compose-Datei. Ohne sie
setzte Compose eine leere Zeichenkette ein: Der Bau liefe durch, der Container
startete gesund, und das Bundle zeigte gegen `undefined` — ein Ausfall, der
erst im Browser auffällt. Prüfen lässt sich das ohne Bau mit
`docker compose -f docker-compose.prod.yml config`.

Die drei `VITE_`-Werte reicht Compose als Build-Arg durch, weil Vite sie beim
Bauen fest in das ausgelieferte JavaScript schreibt. Sie sind publishable und
durch RLS abgesichert. Der `SUPABASE_SERVICE_ROLE_KEY` dagegen kommt
ausschließlich zur Laufzeit aus der Umgebung und erreicht keine Abbildschicht;
[`.dockerignore`](../../.dockerignore) hält jede `.env` aus dem Baukontext.

## Warum der Container keinen Port veröffentlicht

Er hängt allein im externen Netz `proxy`, in dem Traefik TLS terminiert und
anhand der Labels aus der Compose-Datei auf Port 3000 weiterleitet. Ein
veröffentlichter Port wäre kein bequemer Nebenweg, sondern ein Loch: Docker
schreibt seine Regeln direkt in iptables, an UFW vorbei. `ufw status` zeigt
davon nichts.

Aus demselben Grund läuft der Container mit `read_only`, `cap_drop: ALL`,
`no-new-privileges` und einer Speichergrenze. Wer das lockert, sollte den Grund
im Commit nennen.

## Verifizieren

```bash
# Läuft und ist gesund?
ssh armserver 'docker ps --filter name=sitzplan-studio --format "{{.Status}}"'

# Antwortet der Ursprung mit gültigem Zertifikat?
ssh armserver 'docker run --rm --network proxy curlimages/curl:latest \
  -sS -o /dev/null -w "status=%{http_code} tls=%{ssl_verify_result}\n" \
  --resolve jana.alexle135.de:443:89.58.35.35 https://jana.alexle135.de/signin'
```

Erwartet werden `Up … (healthy)` sowie `status=200 tls=0`. Der zweite Befehl
geht direkt gegen Traefik und schließt damit aus, dass ein Fehler bloß von
Cloudflare zwischengespeichert ist.

Der Healthcheck fragt `/signin` ab, nicht `/`. Die Startseite verlangt eine
Sitzung; ein Weiterleiten wäre ein schlechtes Lebenszeichen.

## Wenn etwas schiefgeht

```bash
ssh armserver 'docker logs --tail 50 sitzplan-studio'
```

Neustartschleife direkt nach dem Ausrollen deutet fast immer auf das falsche
Nitro-Preset hin — siehe oben. Ein `healthy`, das nach Minuten auf `unhealthy`
kippt, deutet eher auf die Speichergrenze; `docker stats sitzplan-studio` zeigt
das.

Zurückrollen heißt: auf den vorherigen Commit gehen und neu bauen.

```bash
ssh armserver 'cd /home/alex/sitzplan-studio \
  && git log --oneline -5 \
  && git switch --detach <commit> \
  && docker compose -f docker-compose.prod.yml up -d --build'
```

`git switch --detach` statt `git checkout`: Beide lösen den Klon vom Branch, aber
`--detach` sagt es hin, statt es nebenbei zu tun. Wichtiger ist, was danach
kommt — **nach einem Rollback steht der Klon nicht mehr auf `main`.** Der
Ausrollbefehl oben schaltet mit `git switch main` selbst zurück; wer stattdessen
von Hand `git pull` tippt, bekommt `You are not currently on a branch`. Nach der
Korrektur also regulär ausrollen, nicht nachziehen.

Ein Abbild des vorherigen Standes wird nicht vorgehalten — `sitzplan-studio:prod`
wird bei jedem Bau überschrieben. Das ist der Preis dafür, ohne Registry
auszukommen; der Rückweg über Git dauert dieselben paar Minuten wie der Hinweg.

## Konten und Anmeldung

Selbstregistrierung gibt es nicht. Die Anmeldeseite kennt nur Anmelden,
durchgesetzt wird es über die Supabase-Einstellung _Allow new users to sign
up_. Konten legt die betreibende Stelle im Supabase-Dashboard an.

Zwei Dinge, die dabei regelmäßig übersehen werden:

Die **Site URL** unter _Authentication → URL Configuration_ muss auf
`https://jana.alexle135.de` stehen. Sie steckt nicht nur in Links zum
Zurücksetzen des Passworts, sondern auch in Einladungsmails — steht dort noch
`http://localhost:3000`, kommt eine eingeladene Person nicht herein.

Die Anwendung bietet **keine** Passwortänderung und verarbeitet den Rücklauf
eines Wiederherstellungslinks nicht. Wer einem solchen Link folgt, landet
angemeldet auf der Startseite, ohne ein neues Passwort setzen zu können.
Passwörter werden deshalb im Dashboard unter _Authentication → Users →
Edit user_ gesetzt.
