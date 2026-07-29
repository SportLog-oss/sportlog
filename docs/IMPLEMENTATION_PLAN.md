# SportLog – Umsetzungsplan

Erstellt nach Analyse von `docs/VISION.md`, `docs/TASKS.md`, `docs/DEVELOPMENT_RULES.md`, allen 29 Screenshots in `docs/screenshots/` sowie der kompletten Codebasis (Next.js-Backend `src/`, Expo-App `mobile/src/`). Dieses Dokument enthält noch keine Code-Änderungen — es ist die Planungsgrundlage für die anschließende Umsetzung.

---

## 0. Ausgangslage in Kürze

**Architektur:** Next.js-Backend (App Router, kein SQL, Upstash Redis + JSON-Fallback) + Expo/React-Native-iPhone-App (expo-router, Tabs). Garmin-Rohdaten und alle sportwissenschaftlichen Berechnungen (CTL/ATL/TSB, ACWR, Injury-Risk, HRV/RHR-Baselines, Kurven) kommen von einem externen Dienst „AthleteData" über einen selbstgebauten JSON-RPC-Client (`athleteDataDirect.ts`) — **nicht** über das `@modelcontextprotocol/sdk`-Paket, das zwar installiert, aber im gesamten Code ungenutzt ist. KI-Funktionen (Coach, Foto-Analyse, Wettkampf-Analyse) laufen über OpenRouter mit dem Modell-String `"openrouter/free"` (Auto-Router über wechselnde Gratismodelle) — **ohne** festes, geprüftes Vision-/Tool-Calling-Modell.

**Zentrale Root-Causes, die mehrere Vision-Ziele gleichzeitig blockieren:**
1. `openrouter/free` ist nicht deterministisch und nicht garantiert vision-/tool-calling-fähig → Ursache für unzuverlässige Fotoanalyse und mittelmäßige Coach-Antworten.
2. Kein Chat-Persistenz-Datenmodell, kein Multi-Chat, kein Streaming.
3. Kein Illness-/Verletzungs-Log, kein Mental-Health-Datenmodell, keine Trainingsprotokoll-Felder (Schmerzen, Muskelkater, RPE, Notizen pro Einheit).
4. Coach-Kontext ist ein einmaliger statischer Text-Snapshot, kein agentischer Tool-Zugriff — genau das Gegenteil von „direkter MCP-Zugriff, nutzt Daten intelligent".
5. Erinnerungen bestehen nur aus einem einzigen täglichen Cron-Push — kein Scheduling, keine Kategorien, keine Nutzerpräferenzen.
6. Trainingsanalyse ist eine einzige lange ScrollView ohne Tabs/Kompakt-Vollbild-Diagramme (Garmin-Vorbild).

Diese fünf Punkte ziehen sich durch fast alle neun Aufgaben aus `TASKS.md` und werden daher als gemeinsames **Fundament (Phase 0)** vorgezogen, bevor die einzelnen Features gebaut werden.

---

## 1. Priorisierung

| Stufe | Bedeutung |
|---|---|
| **P0** | Fundament/Blocker oder kritischer Bugfix — zuerst, alles andere hängt daran |
| **P1** | Kern-Differenzierung der Vision (Coach, Trainingsanalyse, Gesundheitsprotokoll) |
| **P2** | Hoher Mehrwert, kann auf P1 aufbauen (Mental Health, Erinnerungen) |
| **P3** | Politur, Konsolidierung, „nice to have" |

Aufwand grob geschätzt: **S** (< 0,5 Tag), **M** (0,5–2 Tage), **L** (2–5 Tage), **XL** (> 5 Tage) — bezogen auf fokussierte Umsetzung inkl. Backend+Mobile+Tests.

---

## Phase 0 — Fundament (P0)

### 0.1 Branding: Sportlog → SportLog
**Aufwand: S.** Alle sichtbaren Strings (App-Name in `app.json`, Header/Titel in beiden Apps, README, Metadaten) durchsuchen und ersetzen. Kein funktionales Risiko, sollte zuerst und isoliert erledigt werden (sauberer Commit).

### 0.2 Navigation: KI Coach nach rechts
**Aufwand: S (nur Verifikation).** Bereits im Ist-Zustand die letzte Tab-Position (`Dashboard → Training → Gesundheit → Wettkämpfe → Ziele → KI-Coach`). Keine Änderung nötig — wird nach dem Coach-Rebuild (der die Tab-Struktur ggf. um „Neuer Chat"/Header-Aktionen erweitert) erneut geprüft, damit es nicht regressiert.

### 0.3 KI-Modell-Strategie festlegen
**Aufwand: S, aber blockierend für 0.4, Phase 2 (Coach) und Phase 3 (Foto).**
- `COACH_MODEL = "openrouter/free"` durch ein **fest gepinntes** OpenRouter-Modell ersetzen, das nachweislich (a) Vision unterstützt, (b) Tool-/Function-Calling unterstützt, (c) niedrige Latenz für Streaming bietet. Getrennte Konstanten für Text-Chat vs. Foto-Analyse erlauben (unterschiedliche Anforderungen an Kontextlänge vs. Bildqualität).
- Kandidatenauswahl (Kosten/Latenz/Qualität) erfolgt zum Implementierungszeitpunkt anhand aktueller OpenRouter-Preisliste — kein Training-Zeit-Wissen fest einbrennen.
- Fallback-Kette einbauen: bei Fehler/Timeout automatisch zweites Modell versuchen, statt stillschweigend zu scheitern.

### 0.4 Datenmodell-Erweiterungen (Redis-Collections)
**Aufwand: M.** Neue user-editable Collections nach dem bestehenden Muster (`getUserCollection`/`saveUserCollection`) anlegen, bevor die Features gebaut werden, die sie brauchen:

| Neue Collection | Zweck | Genutzt von |
|---|---|---|
| `illness-log` | Krankheitsprotokoll: Beginn, Ende, Dauer (abgeleitet), Symptome[], Medikamente[], Arztbesuche, Trainingspause (von/bis), Rückkehr-Datum, Notizen | Gesundheitsbereich (6), Coach-Kontext |
| `training-log-entries` | Pro Einheit: activityId-Referenz, Schmerzen (Körperstelle+Intensität), Verletzung-Flag, Muskelkater (Skala), RPE (Borg 1–10), Notizen | Trainingsanalyse (5), Coach-Kontext |
| `mental-health-checkins` | Pro Check-in: Zeitstempel, Typ (Emotion/Stimmung), Valenz (-1..1, analog Screenshot-Slider), Emotion-Tags[], Einfluss-Tags[], optional Freitext | Mentale Gesundheit (8), Coach-Kontext |
| `chat-sessions` + `chat-messages` | Chat-Metadaten (id, title, createdAt, updatedAt) getrennt von Nachrichten (chatId, role, content, toolCalls?, createdAt) | KI-Coach Multi-Chat (3) |
| `reminder-preferences` | Nutzer-Einstellungen: welche Erinnerungstypen aktiv, bevorzugte Uhrzeit(en) | Erinnerungen (9) |

Zusätzlich `src/lib/types.ts` (Next.js) **und** `mobile/src/lib/types.ts` (Expo) parallel erweitern — beide Typdateien sind aktuell unabhängig dupliziert, das bleibt so (kein Monorepo-Sharing vorhanden), muss aber konsistent gehalten werden.

### 0.5 Foto-Analyse: Root-Cause-Fixes
**Aufwand: M.** Direkt abhängig von 0.3.
- Gepinntes Vision-Modell statt `openrouter/free` verwenden (größter Hebel).
- Robusteres Extraktionsformat: statt fragilem Markdown-JSON-Block am Ende → strukturiertes Tool-Calling / `response_format: json_schema` nutzen, damit Werte-Extraktion nicht mehr vom exakten Prompt-Gehorsam des Modells abhängt.
- Mobile Client-Bug fixen: `PhotoAnalysis.tsx` sendet den Request aktuell **ohne** `x-app-password`-Header (bypasst den zentralen `api.ts`-Client) — auf den zentralen Client umstellen.
- Kamera-Aufnahme zusätzlich zur Galerie-Auswahl ergänzen (`launchCameraAsync`).
- Nach jeder Analyse eindeutige Bestätigung UI (siehe TASKS.md Punkt 4): „Erkannte Werte" / „Gespeicherte Werte" / „Zugeordnetes Training" explizit als strukturierte Karte statt nur Fließtext — auch bei Teilerfolg (z. B. Werte erkannt, aber keine Aktivität gematcht) klar kommunizieren statt still zu scheitern.
- Sichtbare Fehlerzustände statt stillem `extracted = null`.

---

## Phase 1 — Gesundheit & Trainingsprotokoll (P1)

### 1.1 Krankheitsprotokoll (TASKS.md Punkt 7)
**Aufwand: L.** Neuer Abschnitt im Gesundheitsbereich (Web + Mobile):
- CRUD-API `/api/health/illness` (analog zu `/api/goals`-Muster: GET/POST/PUT/DELETE) auf `illness-log`.
- UI: Liste aktiver/vergangener Krankheiten, Formular mit Beginn/Ende/Symptomen (Mehrfachauswahl + Freitext)/Medikamenten/Arztbesuchen/Trainingspause/Rückkehr-Datum/Notizen.
- Verknüpfung mit bestehender `generateWarnings`-Logik: wenn eine aktive Krankheit erfasst ist, sollen die RHR/HRV-Anomalie-Warnungen das nicht mehr als „möglicherweise beginnende Krankheit" framen, sondern als bekannt bestätigen — vermeidet widersprüchliche Botschaften.
- Fließt in Coach-Kontext (Phase 2) ein.

### 1.2 Trainingsprotokoll pro Einheit (TASKS.md Punkt 6, Unterpunkt „Trainingsprotokoll")
**Aufwand: M.** Neue API `/api/training/[id]/log` auf `training-log-entries`.
- UI: Nach jeder Einheit (Trainingsdetail-Screen) editierbare Karte für Schmerzen (Körperstelle-Picker + Intensität 0–10), Verletzung-Flag, Muskelkater (Skala), RPE (Borg-Skala 1–10 mit Beschreibung), Notizen.
- Wichtig für Punkt 5 (Trainingsnavigation): dieses Formular ist ein Modal/eigener Screen — hier **von Anfang an** sicherstellen, dass Zurück-Button, Swipe-Back-Geste und sauberes Verlassen ohne Datenverlust-Falle funktionieren (siehe 1.3).

### 1.3 Trainingsnavigation absichern (TASKS.md Punkt 5)
**Aufwand: S.** Exploration zeigt: Es existiert aktuell **kein Live-Aufzeichnungs-Screen** (die App ist reine Post-hoc-Analyse/Coaching, Rohdaten kommen von Garmin). Die bestehenden Detail-/Analyse-Screens blockieren Back-Navigation bereits nicht (kein `gestureEnabled: false`, kein `preventRemove`-Interceptor gefunden). Die Anforderung „während eines Trainings jederzeit zurück" wird daher so interpretiert: **jeder neue Screen/Modal-Flow** (Trainingsprotokoll-Formular, neue Diagramm-Vollbildansicht, Illness-/Mental-Health-Wizards) muss dieses Verhalten explizit erhalten und testen — kein Screen darf den Nutzer „einsperren". Als Leitplanke in `docs/DEVELOPMENT_RULES.md`-Sinn dokumentieren: jeder neue Stack-/Modal-Screen bekommt Standard-Header-Back + `gestureEnabled: true`, es sei denn es gibt einen expliziten, vom Nutzer bestätigten Grund für eine Sperre (aktuell keiner ersichtlich).
- **Offene Frage an Nutzer:** Ist eine echte Live-Trainingsaufzeichnung (GPS/HF live tracken) geplant, oder bleibt SportLog bewusst post-hoc/Garmin-sync-basiert? Das ändert den Umfang von Punkt 5 erheblich. Bis zur Klärung wird nur die Absicherung der bestehenden/neuen Flows umgesetzt, keine Live-Recording-Funktion.

---

## Phase 2 — KI-Coach Neuaufbau (P1, TASKS.md Punkt 3)

Größter Einzelblock, baut auf 0.3 und 0.4 auf.

### 2.1 Agentischer Tool-Zugriff statt statischem Kontext-String
**Aufwand: XL.** Kern der „direkter MCP-Zugriff"-Anforderung:
- Tool-Layer definieren (in-process Funktionen, semantisch wie MCP-Tools benannt/strukturiert): `getDailyMetrics`, `getInjuryRisk`, `getActivities`, `getActivityDetail`, `getStrengthSessions`, `getBenchmarks`, `getCompetitions`, `getGoals`, `getIllnessLog`, `getMentalHealthCheckins`, `getTrainingLogEntries`, `getActivityNotes`, `getPerformanceEstimates`.
- Diese Tools per OpenRouter Function-/Tool-Calling an das Modell anbinden → echte Agentic Loop (Modell fragt gezielt nach Daten statt fixem Text-Dump), löst gleichzeitig das „Coach kennt Kraft-Sessions/Benchmarks nicht"-Problem aus dem Ist-Zustand.
- `@modelcontextprotocol/sdk` sauber nutzen: entweder (a) diese Tools als echten lokalen MCP-Server exponieren, den der Coach-Endpoint als MCP-Client anspricht (macht die Anforderung wörtlich wahr und erlaubt später externen MCP-Clients wie Claude Desktop Zugriff), oder (b) `athleteDataDirect.ts` durch den echten SDK-Client ersetzen. Empfehlung: **(a) zuerst**, da es die explizite Vision-Anforderung direkt erfüllt und die tote Dependency sinnvoll aktiviert.
- Leistungssport-Framing im System-Prompt schärfen (bereits vorhanden, aber erweitern): Belastungssteuerung statt pauschaler Reduktionsempfehlung, Berücksichtigung von Trainingslagern/Wettkampfphasen — dafür braucht der Coach Zugriff auf Wettkampfkalender/Zieltermine, was die Tools jetzt liefern.

### 2.2 Streaming
**Aufwand: M.** `stream: true` serverseitig, Server-Sent Events/Chunked Response an Mobile+Web; Chat-UI auf inkrementelles Rendering umstellen (Web `coach/page.tsx`, Mobile `coach.tsx`). Größter spürbarer „schneller"-Effekt für den Nutzer, da Time-to-first-token stark sinkt.

### 2.3 Multi-Chat-System
**Aufwand: L.** Backed by `chat-sessions`/`chat-messages` (0.4):
- API: `/api/coach/sessions` (list/create/rename/delete), `/api/coach/sessions/[id]/messages` (list/append), Suchfunktion über Titel+Inhalt (einfacher Redis-Scan reicht bei Einzelnutzer-Datenmenge, kein Suchindex nötig).
- UI (Web+Mobile): Chat-Liste mit Umbenennen/Löschen/Suche, „Neuer Chat", aktiver Chat wird beim Öffnen geladen statt bei jedem Neustart verworfen.

### 2.4 Performance
**Aufwand: M.** Kontext-Tools nur bei Bedarf aufrufen (lazy, durch Tool-Calling ohnehin gegeben), Redis-Reads parallelisieren (`Promise.all` wo seriell), Antwort-Streaming (2.2) als größter gefühlter Geschwindigkeitsgewinn, festes schnelles Modell (0.3) statt Auto-Router-Lotterie.

---

## Phase 3 — Trainingsanalyse-Überarbeitung (P1, TASKS.md Punkt 6)

**Aufwand: XL**, größte UI-Baustelle, orientiert an den Garmin-Screenshots (Übersicht/Statistiken/Runden/Diagramme/Ausrüstung-Tabs, kompakte Diagramme → Antippen → Vollbild mit Zoom/Scroll/Metrik-Umschaltern wie „Herzfrequenz/Geschwindigkeit/Höhe/Stamina").

- **Tab-Struktur** im Trainingsdetail-Screen einführen (ersetzt aktuelle lange ScrollView): Übersicht / Herzfrequenz / Pace-Geschwindigkeit / Leistung / Splits / Höhenmeter / Belastung / Erholung / Diagramme — Auswahl der sichtbaren Tabs je nach Sportart (z. B. „Leistung" nur bei Rad/Rudern mit Powermeter).
- **Übersicht-Tab**: wichtigste Kennzahlen oben (wie bisher die 2×2-Kachel-Grid), darunter **neue KI-Zusammenfassung** der Einheit (was lief gut, Auffälligkeiten, Verbesserungsvorschläge, Belastung, Erholung) — nutzt denselben Tool-Layer aus Phase 2, neuer Endpoint `/api/training/[id]/summary` oder Coach-Tool `summarizeActivity`.
- **Diagramme**: Chart-Bibliotheken vereinheitlichen (aktuell `react-native-chart-kit` + eigene SVG-Komponenten parallel) — kompakte Vorschau-Charts auf dem Tab, Antippen öffnet Vollbild-Modal mit Zoom/Pan/Scroll und Metrik-Umschaltern (analog Screenshots: Geschwindigkeit ↔ Herzfrequenz ↔ Höhe ↔ Stamina/Zugzahl als überlagerbare Serien). Für Rudern zusätzlich Zugzahl/Distanz-pro-Schlag wie in den Screenshots gesehen — SportLog hat für Rudern bereits `spm`/Zugzahl-Daten aus Garmin, aber noch keine entsprechende Diagrammansicht.
- **Trainingsprotokoll-Integration**: neue Sektion aus 1.2 wird Teil des Übersicht- oder eines eigenen Tabs.
- Splits/Runden-Tab nutzt bereits vorhandene `LapsTable`/`laps.ts`-Parsing-Logik, wird aber in eigenen Tab statt Unterabschnitt gehoben.

---

## Phase 4 — Mentale Gesundheit (P2, TASKS.md Punkt 8)

**Aufwand: L.** Neuer Bereich, Inspiration explizit aus Apple-Health/Mindfulness-Screenshots (organische „Blüten"-Formen, die per Farbe/Form den Valenz-Zustand visualisieren, Slider „sehr unangenehm ↔ sehr angenehm", Emotion-Wort-Auswahl, Einfluss-Tags) — **kein 1:1-Kopieren**, eigene visuelle Sprache passend zum bestehenden Dark-Teal-Design von SportLog entwickeln (z. B. eigene abstrakte Gradient-/Partikel-Visualisierung statt Apples Blütenform, aber gleiches Grundprinzip: Farbe/Bewegung kodiert Valenz).

- Datenmodell: `mental-health-checkins` (0.4).
- Flow: täglicher Check-in (Emotion „jetzt" + optional Stimmung „heute allgemein"), Valenz-Slider, Emotion-Tag-Auswahl (mehrstufig wie im Screenshot: grobe Kategorie → spezifisches Wort → Einfluss-Faktor), kurzer optionaler Freitext.
- Visualisierung: Trend über Zeit (z. B. Kalender-Heatmap oder Verlaufskurve der Valenz), Verknüpfung mit Trainingslast/Schlaf im Dashboard („an Tagen mit niedriger Stimmung war die HRV im Schnitt X% niedriger" — später, sobald genug Daten vorhanden sind).
- Fließt in Coach-Kontext (Tool `getMentalHealthCheckins`).
- Video-Link (`https://youtu.be/E6Ij5msWaTM`) als Animations-/Interaktions-Referenz für sanfte, atmende Übergänge — konkrete Umsetzung (Reanimated/Skia für Mobile) im Rahmen der Implementierung entscheiden.

---

## Phase 5 — Intelligente Erinnerungen (P2, TASKS.md Punkt 9)

**Aufwand: M.** Baut auf 0.4 (`reminder-preferences`) und der bestehenden Push-Infrastruktur (`push.ts`, aktuell nur 1x täglicher Cron-Push) auf:
- Erinnerungstypen: Training protokollieren (1.2), Schmerzen eintragen, Krankheit aktualisieren, mentale Gesundheit dokumentieren (Phase 4), Tagescheck durchführen.
- Trigger-Logik statt starrem Einzel-Cron: z. B. „Training protokollieren" nur wenn heute eine Aktivität synct wurde und noch kein `training-log-entries`-Eintrag existiert; „mentale Gesundheit" nur wenn heute noch kein Check-in; Nutzerpräferenzen (welche Typen an/aus, bevorzugte Uhrzeit) respektieren.
- Token-Hygiene nachrüsten: kein Unregister-Endpoint vorhanden → tote Tokens sammeln sich; beim Push-Fehlschlag (invalides Token) aus `push:tokens` entfernen.
- Bewusst „sinnvoll und nicht störend" (Vision): Frequenz-Caps (max. X Push/Tag), keine Doppel-Erinnerung für bereits erledigte Aktionen.

---

## Phase 6 — Konsolidierung & Politur (P3)

- Chart-Bibliotheken vereinheitlichen (siehe Phase 3) — eine Lösung für Line/Bar/Gauge statt `chart-kit` + Hand-SVG parallel.
- `Spacing`-Konstanten aus `constants/theme.ts` konsequent statt hartkodierter Pixelwerte nutzen.
- Zwei parallele Sync-Pfade (`/api/sync` push-basiert vs. `/api/cron/sync` pull-basiert) klären und dokumentieren, welcher in Produktion tatsächlich aktiv ist — aktuell aus dem Code allein nicht eindeutig.
- Auth-Fail-Open-Verhalten (fehlende `SESSION_TOKEN`/`CRON_SECRET` erlaubt aktuell alles) für Produktion absichern.
- Accessibility-Pass (Kontraste, Schriftgrößen, VoiceOver-Labels) auf neuen Screens.

---

## 2. Offene Fragen an den Nutzer

1. **Live-Trainingsaufzeichnung**: Soll SportLog künftig Trainings live aufzeichnen (GPS/HF), oder bleibt es bewusst bei reiner Garmin-Sync + Post-hoc-Analyse? Beeinflusst Umfang von Phase 1.3.
2. **Sync-Architektur**: Ist `/api/cron/sync` (Pull via Vercel Cron) oder `/api/sync` (Push von AthleteData) der in Produktion aktive Pfad, oder laufen beide parallel? Relevant für Phase 6 und für Zuverlässigkeit der Coach-Datenbasis.
3. **OpenRouter-Budget**: Umstieg von `openrouter/free` auf ein kostenpflichtiges, gepinntes Modell (0.3) verursacht laufende Kosten — gibt es ein Budget-Limit, das die Modellwahl einschränkt?
4. **MCP-Server-Exposition**: Soll der neue lokale MCP-Tool-Server (2.1) ausschließlich intern vom Coach genutzt werden, oder soll SportLog perspektivisch auch als MCP-Server für externe Clients (z. B. Claude Desktop) erreichbar sein? Beeinflusst Auth-/Transport-Design des MCP-Servers.

Diese Fragen blockieren die Umsetzung nicht grundsätzlich — für 1 und 2 wird bis zur Klärung die konservative Annahme (kein Live-Recording; beide Sync-Pfade bleiben unangetastet funktionsfähig) verwendet; 3 und 4 werden mit sinnvollen Standardentscheidungen (mittleres Preissegment-Modell, rein interner MCP-Server) angegangen, falls keine Rückmeldung erfolgt.

---

## 3. Empfohlene Umsetzungsreihenfolge (Sprints)

1. **Sprint 1**: 0.1 Branding, 0.3 Modell-Pinning, 0.4 Datenmodell-Erweiterungen, 0.5 Foto-Analyse-Fix — schnelle, isolierte Verbesserungen + Fundament.
2. **Sprint 2**: Phase 1 (Illness-Log, Trainingsprotokoll, Navigations-Absicherung) — nutzt das neue Datenmodell direkt.
3. **Sprint 3–4**: Phase 2 (KI-Coach: Tool-Layer/MCP, Streaming, Multi-Chat) — größter Einzelblock, zentrale Differenzierung.
4. **Sprint 5–6**: Phase 3 (Trainingsanalyse-Überarbeitung) — größte UI-Baustelle, kann parallel zu Phase 2 vorbereitet werden (Tab-Grundgerüst), KI-Zusammenfassung hängt aber von Phase 2 ab.
5. **Sprint 7**: Phase 4 (Mentale Gesundheit).
6. **Sprint 8**: Phase 5 (Erinnerungen) — profitiert davon, dass 1, 3, 4 vorher existieren (mehr sinnvolle Trigger).
7. **Laufend**: Phase 6 (Konsolidierung) parallel/nachgelagert.

Nach jedem Sprint: Änderungen/geänderte Dateien/Migrationen dokumentieren (gemäß `DEVELOPMENT_RULES.md`), bevor der nächste beginnt.
