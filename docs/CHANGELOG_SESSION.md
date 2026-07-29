# SportLog – Umsetzungsprotokoll (aktuelle Session)

Dokumentation gemäß `DEVELOPMENT_RULES.md` ("Nach jeder größeren Änderung: Änderungen dokumentieren, geänderte Dateien auflisten, Migrationen dokumentieren, Verbesserungsvorschläge machen"). Umgesetzt wurden Phase 0–5 aus `docs/IMPLEMENTATION_PLAN.md`, die Erinnerungen (TASKS.md Punkt 9), die Middleware→Proxy-Migration, ein Performance-Fix im Coach-Kontext sowie ein beim Nachtesten gefundener Streaming-Markdown-Bug (§15). Die zwei verbliebenen offenen Punkte aus Plan-Phase 6 (Chart-Konsolidierung, Sync-Pfad-Klärung) wurden geprüft und bewusst nicht verändert — Begründung in §13.

## 1. Branding & Navigation

- „Sportlog" → „SportLog" in allen sichtbaren Texten (Web-Sidebar, Login-Screens, Mobile-Header, `<title>`/Meta-Description, READMEs).
- Copy von „Rudersport"-spezifisch auf „Leistungssport" allgemein verbreitert (Sidebar-Footer, Meta-Description, Wettkampf-Analyse-Prompt) — bestehende ruder-spezifische Funktionen (Zugzahl, Bootsklasse etc.) bleiben unverändert erhalten.
- KI-Coach-Tab war bereits ganz rechts positioniert (Web-Sidebar, Mobile-Tabs) — keine Änderung nötig, nur verifiziert.

## 2. KI-Modell-Fundament

- **Kritischer Fund:** Das konfigurierte OpenRouter-Konto hat **keine gekauften Credits** (live 402 „Insufficient credits" bei einem Test mit einem kostenpflichtigen Modell). `openrouter/free` (Auto-Router) wurde daher durch zwei **fest gepinnte, live verifizierte Gratis-Modelle** ersetzt, die Vision + Tool-Calling unterstützen: `google/gemma-4-31b-it:free` (primär), `nvidia/nemotron-nano-12b-v2-vl:free` (Fallback). Automatischer Fallback bei Server-/Rate-Limit-Fehlern.
- Betrifft: KI-Coach, Foto-Analyse, Wettkampf-Analyse, Trainings-Zusammenfassung.

## 3. Neues Datenmodell (Redis-Collections, `src/lib/types.ts` + `mobile/src/lib/types.ts`)

| Collection | Zweck |
|---|---|
| `illness-log` | Krankheits-/Verletzungsprotokoll |
| `training-log-entries` | Schmerzen/Muskelkater/RPE/Notizen pro Trainingseinheit |
| `mental-health-checkins` | Stimmungs-Check-ins (Valenz, Emotion-/Einfluss-Tags) |
| `chat-sessions` + `chat-messages:<id>` | KI-Coach Multi-Chat-Persistenz |
| `reminder-preferences` | Noch ungenutzt — vorbereitet für Erinnerungen (offen, siehe unten) |

Keine SQL-Migration nötig (Redis/JSON-Fallback, kein Schema). Lokaler Dev-Fallback unter `data/user/*.json` (git-ignored).

## 4. Foto-Analyse-Fix

- Von fragilem Markdown-JSON-Block-Parsing auf strukturiertes `response_format: json_object` umgestellt — robuster gegen Modell-Abweichungen.
- Explizites `readable`-Flag: unlesbare Fotos werden jetzt sichtbar als solche markiert statt still zu scheitern.
- Mobile Bug behoben: `PhotoAnalysis.tsx` sendete den Request bisher **ohne** Auth-Header (Bypass des zentralen API-Clients).
- Kamera-Aufnahme zusätzlich zur Galerie-Auswahl ergänzt (Web + Mobile).
- Klare Bestätigungs-UI: erkannte Werte, gespeicherte Notiz/Benchmark, oder Warnung bei Fehlschlag.

## 5. KI-Coach-Neuaufbau

- **Agentischer Tool-Layer** (`src/lib/coachTools.ts`, 13 Tools) liest ausschließlich aus dem eigenen Redis-Store — nicht aus dem rohen AthleteData-Client (`athleteDataDirect.ts`), dessen Code-Kommentar explizit „never used by an AI agent" vorschreibt. Der Coach kann jetzt gezielt nach Trainingsdaten, Gesundheit, Krankheiten, mentaler Gesundheit, Kraft, Benchmarks etc. fragen statt einen statischen Text-Snapshot zu bekommen.
- **Echtes Token-Streaming** über die `openai`-SDK-Funktion `runTools({stream:true})`, ausgeliefert per SSE (Web: `ReadableStream`, Mobile: `XMLHttpRequest`-Progressive-Read, da RN-`fetch` keine Streaming-Response-Bodies zuverlässig unterstützt).
- **Multi-Chat**: neue Chats, Umbenennen, Löschen, Suche — Backend (`/api/coach/sessions*`) + UI auf Web (Sidebar) und Mobile (Bottom-Sheet).
- System-Prompt erweitert: explizites Verbot pauschaler „weniger trainieren"-Empfehlungen, stattdessen differenzierte Belastungssteuerung; berücksichtigt jetzt aktive Krankheiten aus dem neuen Log.
- Live verifiziert: reale Anfrage zog echte Trainings-/Gesundheitsdaten per Tool-Call und lieferte eine sportartspezifische, undogmatische Antwort.

## 6. Trainingsanalyse-Überarbeitung

- **Wichtiger Fund:** `garmin_get_activity_file` liefert bereits reale Zeitreihen-Samples (HF, Geschwindigkeit, Höhe, Kadenz, Leistung, alle 60s) — der bisherige Code hat `file.records` komplett verworfen und nur Runden-Zusammenfassungen genutzt. Jetzt in `/api/training/[id]/details` als `series` mitgeliefert (inkl. Einheiten-Konvertierung: Höhe mm→m, entspricht dem bereits bestehenden `ascentM`-Faktor).
- Trainingsdetail-Screen (Web + Mobile) von einer langen ScrollView auf Tabs umgestellt: Übersicht / Herzfrequenz / Diagramme / Splits / Protokoll — analog zum Garmin-Vorbild, aber eigenständig gestaltet.
- Neue Komponente `ExpandableTimeSeriesChart` (Web: recharts, Mobile: react-native-chart-kit): kompakte Vorschau, Antippen öffnet Vollbild mit Metrik-Umschaltern und Tooltip (Zeit + Wert).
- Neues Trainingsprotokoll pro Einheit (Schmerzen, Verletzung-Flag, Muskelkater, RPE, Notizen) — API `/api/training/[id]/log`.
- Neue KI-Zusammenfassung pro Einheit (on-demand) — API `/api/training/[id]/summary`.
- Live verifiziert gegen eine echte Aktivität: Diagramm-Verlauf (Geschwindigkeit/Höhe) stimmte in der Form nahezu exakt mit den vom Nutzer bereitgestellten Garmin-Screenshots überein. Dabei einen echten Bug gefunden und behoben: Tooltip zeigte ungerundete Float-Werte statt sauber formatierter Werte mit Einheit.

## 7. Gesundheitsbereich: Krankheitsprotokoll & Mentale Gesundheit

- Gesundheits-Seite (Web + Mobile) auf Tabs umgestellt: Übersicht / Krankheiten / Mentale Gesundheit.
- **Krankheiten**: CRUD-UI für Beginn/Ende/Symptome/Medikamente/Arztbesuche/Trainingspause/Rückkehr-Datum/Notizen, aktive Einträge optisch hervorgehoben. Fließt in den KI-Coach-Kontext ein.
- **Mentale Gesundheit**: eigenständige Visualisierung (pulsierende, farbcodierte „Orb"-Kugel — bewusst kein 1:1-Nachbau der Apple-Health-Blütenform, aber gleiches Grundprinzip: Farbe/Bewegung kodiert Valenz), Valenz-Auswahl, Emotion-/Einfluss-Tags, optionale Notiz, Verlaufsdiagramm, Historie.
- Beide Bereiche live verifiziert (Formular ausfüllen → speichern → Persistenz bestätigt → Testdaten wieder entfernt).

## 8. Erinnerungen (TASKS.md Punkt 9)

- `src/lib/reminders.ts`: reine Evaluationslogik, ordnet je nach Nutzer-Präferenz und Datenlage bis zu einen Erinnerungskandidaten pro Tag zu (`log-training` inkl. Schmerzen — TASKS.md unterscheidet „Training protokollieren" und „Schmerzen erfassen", beides läuft aber über dasselbe Trainingsprotokoll-Formular, daher ein Reminder-Typ statt doppelter Logik; `update-illness`; `log-mental-health`; `daily-checkin` als generischer Fallback nur wenn nichts Spezifischeres ansteht).
- Neuer Cron-Endpoint `/api/cron/reminders` + `vercel.json`-Eintrag. **Wichtige Einschränkung:** Vercel Hobby-Plan erlaubt Cron-Jobs nur 1×/Tag — die gespeicherte `preferredHour`-Präferenz kann daher aktuell nicht exakt zur gewünschten Uhrzeit auslösen; der Cron läuft einmal täglich (17:00 UTC) und wertet sofort aus. Im Code dokumentiert, damit das bei einem Plan-Upgrade nachgerüstet werden kann.
- `reminder-preferences` merkt sich zusätzlich `lastSent` pro Typ, um Mehrfach-Pushes am selben Tag zu verhindern — live getestet (erster Aufruf sendet, zweiter Aufruf am selben Tag meldet „nothing pending").
- Neue Einstellungs-Karte auf dem Dashboard (Web + Mobile): Erinnerungstypen einzeln an-/abschaltbar. Bewusst kein UI für `preferredHour`, da es aktuell nicht präzise wirkt (keine Attrappen-Bedienelemente).
- Push-Token-Hygiene nachgerüstet (`src/lib/push.ts`): Tokens mit Expo-Status `DeviceNotRegistered` werden nach jedem Versand automatisch entfernt.

## 9. Sonstige Korrekturen

- Next.js-Middleware-Deprecation behoben: `src/middleware.ts` → `src/proxy.ts` (Funktion `middleware` → `proxy`, gleiche Logik), da Next 16 „middleware" als Konvention aufgegeben hat. Build-Warnung verschwunden, Auth live erneut verifiziert.
- Beim Testen des neuen Cron-Endpoints einen echten Bug gefunden und behoben: `/api/cron/reminders` fehlte in der Middleware-Public-Path-Liste, wodurch der Service-zu-Service-Aufruf (mit `CRON_SECRET`) von der Session-Auth blockiert wurde, bevor er die eigene Secret-Prüfung erreichte.

## 10. Geänderte/neue Dateien (Auswahl, ohne reine Rename-Diffs)

**Neu:**
`src/lib/coachTools.ts`, `src/lib/reminders.ts`, `src/app/api/coach/sessions/route.ts`, `src/app/api/coach/sessions/[id]/messages/route.ts`, `src/app/api/health/illness/route.ts`, `src/app/api/mental-health/route.ts`, `src/app/api/training/[id]/log/route.ts`, `src/app/api/training/[id]/summary/route.ts`, `src/app/api/cron/reminders/route.ts`, `src/app/api/reminders/preferences/route.ts`, `src/components/charts/ExpandableTimeSeriesChart.tsx` (Web+Mobile), `src/components/training/TrainingLogSection.tsx` (Web+Mobile), `src/components/training/ActivitySummaryCard.tsx` (Web+Mobile), `src/components/training/TrainingDetailTabs.tsx`, `src/components/health/{IllnessLogSection,MentalHealthSection,HealthTabs}.tsx` (Web+Mobile-Pendants), `src/components/ReminderSettingsCard.tsx` (Web+Mobile), `src/proxy.ts`, `.claude/launch.json` (Eintrag `sportlog-mobile-web`, aktuell durch bekannte `expo-secure-store`-Web-Lücke nicht nutzbar).

**Ersetzt/entfernt:** `ActivityDetailsSection.tsx` (Web+Mobile, in Tabs aufgeteilt), totes `ChatMessage`-Type (Web+Mobile, durch `PersistedChatMessage`/`ChatSession` ersetzt), `src/middleware.ts` (→ `src/proxy.ts`).

**Größere Änderungen:** `src/lib/openrouter.ts`, `src/lib/context.ts`, `src/lib/push.ts`, `src/app/api/coach/route.ts` (komplett neu: Streaming+Tools+Persistenz), `src/app/api/analyze-photo/route.ts`, `src/app/api/training/[id]/details/route.ts`, `src/lib/data/store.ts`, `src/lib/types.ts` + `mobile/src/lib/types.ts`, `src/app/training/[id]/page.tsx`, `mobile/src/app/training/[id].tsx`, `src/app/health/page.tsx`, `mobile/src/app/health.tsx`, `mobile/src/app/coach.tsx`, `mobile/src/lib/api.ts`, `src/app/page.tsx`, `mobile/src/app/index.tsx`, `vercel.json`.

## 11. Migrationen

Keine SQL-Migrationen (kein SQL-Schema im Projekt). Neue Redis-Collections benötigen keine Migration — sie werden beim ersten Schreibzugriff implizit angelegt; bestehende Collections wurden nicht verändert.

## 12. Verifikation

- `tsc --noEmit` (Web + Mobile) und `eslint` (Web) durchgehend clean nach jeder Änderung.
- `npm run build` (Web) mehrfach erfolgreich, zuletzt ohne Middleware-Deprecation-Warnung.
- Alle neuen Web-Features live im Browser getestet (KI-Coach-Chat inkl. Streaming/Tool-Calls, Trainingsanalyse-Tabs inkl. Vollbild-Diagramme, Krankheiten- und Mental-Health-Formulare inkl. Persistenz-Rundlauf, Erinnerungs-Einstellungen inkl. Toggle-Persistenz).
- `/api/cron/reminders` direkt aufgerufen (mit `CRON_SECRET`): erster Aufruf sendet korrekt eine Erinnerung und markiert `lastSent`, zweiter Aufruf am selben Tag liefert korrekt „nothing pending" — Dedupe-Logik funktioniert.
- Mobile-Code type-checked/gelintet, aber **nicht visuell verifiziert** — `expo-secure-store` hat keinen Web-Shim (bereits vor dieser Session bestehende Lücke), daher kein Preview über den Browser möglich. Empfehlung: Test auf echtem Gerät/Simulator vor Release.
- Test-Daten aus der Verifikation wurden aus den lokalen `data/user/*.json`-Fallback-Dateien wieder entfernt (git-ignored, betrifft nicht Produktion).

## 13. Geprüft und bewusst unverändert gelassen

Diese zwei Punkte aus Plan-Phase 6 wurden nicht übersprungen, sondern aktiv geprüft — und aus fachlichen Gründen nicht angefasst, statt eine riskante oder unbegründete Änderung vorzunehmen:

1. **Chart-Bibliotheken (Mobile)** — `chart-kit` (Liniendiagramme) und Hand-SVG (`MetricGauge`, `HrZonesBars`, `ActivityHrZones`) sind keine austauschbaren Alternativen für denselben Zweck: `chart-kit` kann keine Halbkreis-Gauges oder beschrifteten Zonen-Balken mit Prozentanzeige rendern. Eine erzwungene „Konsolidierung" auf eine Bibliothek würde entweder die Gauge-Darstellung verschlechtern oder unnötigen Custom-Code für Liniendiagramme erzeugen — der ursprüngliche Plan-Punkt war zu pauschal formuliert. Bewertung: kein echter Qualitätsgewinn, echtes Regressionsrisiko. Nicht umgesetzt.
2. **Zwei Sync-Pfade** (`/api/sync` push-basiert, `/api/cron/sync` pull-basiert) — beide sind im Code funktionsfähig und intentional gebaut (Kommentar in `/api/sync`: „exists so the daily AthleteData refresh routine can push data in directly"). Welcher Pfad in Produktion tatsächlich aktiv genutzt wird, hängt von der Konfiguration des externen AthleteData-Dienstes ab, die von hier aus nicht einsehbar ist — das lässt sich nicht durch Code-Analyse auflösen, sondern nur durch Kenntnis der AthleteData-seitigen Infrastruktur. Beide Pfade bleiben unverändert funktionsfähig; keine Änderung ohne diese Information vorgenommen, um nicht versehentlich einen aktiv genutzten Pfad zu deaktivieren.

## 14. Offene Punkte (kein Code-Risiko, aber unvollständig)

1. **`preferredHour`-Präzision** — durch die Vercel-Hobby-Cron-Beschränkung (1×/Tag) aktuell nur als gespeicherte Präferenz ohne exakte Durchsetzung nutzbar (siehe §8).
2. **Mobile-UI-Feinverifikation** auf echtem Gerät/Simulator steht aus — der `expo-secure-store`-Web-Shim (§15) hat die Verifikation bis zum Login-Screen ermöglicht, für den authentifizierten Bereich ist ein echtes Login nötig, das aus Sicherheitsgründen nicht durch den Assistenten selbst ausgeführt wird (Passwort-Eingabe).
3. **Live-Trainingsaufzeichnung** — weiterhin offene Frage aus dem Umsetzungsplan, keine Entscheidung nötig für aktuellen Funktionsumfang.

## 15. Nachträgliche Fixes (beim Verifizieren gefunden)

- **Performance:** `buildAthleteContext()` (Coach-Kontext, läuft vor jeder Coach-Antwort) führte 14 unabhängige Redis-Reads sequenziell mit `await` aus statt parallel — auf `Promise.all` umgestellt. Reduziert direkt die Zeit bis zur ersten sichtbaren Coach-Antwort.
- **Echter Bug, live gefunden:** Beim erneuten Testen des Coaches zeigte eine listenlastige Antwort rohe `**Markdown**`-Sternchen an. Ursache: die gestreamten Text-Chunks wurden nur als rohe Deltas an den Client geschickt und erst die final gespeicherte Nachricht durch `stripMarkdown()` bereinigt — während des Streamens sah der Nutzer also kurzzeitig unbereinigten Text. Behoben, indem der Server den vom SDK ohnehin mitgelieferten kumulierten Snapshot bei jedem Chunk erneut durch `stripMarkdown()` schickt (`src/app/api/coach/route.ts`, `src/app/coach/page.tsx`, `mobile/src/lib/api.ts`, `mobile/src/app/coach.tsx`), statt einen rohen Delta-String zu akkumulieren. Mit einer gezielt listenlastigen Anfrage erneut getestet — Antwort blieb während des gesamten Streamings durchgehend sauber.
- **Web-Vorschau für Mobile ermöglicht:** `expo-secure-store` hat keine Web-Implementierung und ließ die App auf `localhost:8081` bisher mit einem Runtime-Error abstürzen (`getValueWithKeyAsync is not a function`) — eine bereits vor dieser Session bestehende Lücke. `mobile/src/lib/authStore.ts` nutzt jetzt auf `Platform.OS === 'web'` einen `localStorage`-Fallback (native Plattformen weiterhin über die echte Secure-Enclave via SecureStore). Login-Screen rendert jetzt korrekt in der Web-Vorschau; der authentifizierte Bereich wurde nicht weiter getestet, da das Eintragen des echten App-Passworts durch den Assistenten nicht mit den Sicherheitsrichtlinien vereinbar ist (Punkt 14.2).
- **Dev-Server-Artefakt:** Nach dem `middleware.ts`→`proxy.ts`-Rename zeigte der laufende Turbopack-Dev-Server zunächst einen stale „Could not parse module .../middleware.ts" bzw. später einen unzusammenhängenden „Unterminated regexp literal"-Fehler in `health/page.tsx` — beides verschwand nach `.next`-Cache-Löschung und Neustart; `tsc`/`eslint`/`next build` waren durchgehend fehlerfrei. Kein Code-Bug, nur Turbopack-HMR-Cache-Inkonsistenz nach Datei-Löschung.

## 16. Weitere Verbesserungsvorschläge

- Der Aktivitäts-Zeitreihen-Fund (§6) ließe sich zusätzlich für automatische Interval-Erkennung nutzen (z. B. Sprint-Abschnitte automatisch aus der Geschwindigkeitskurve statt nur aus Auto-Laps ableiten).
- Sobald echte Nutzungsdaten für Mentale Gesundheit vorliegen, könnte der KI-Coach Korrelationen zwischen Stimmung und Trainingsbelastung/Schlaf explizit ansprechen.
- Bei einem Upgrade auf Vercel Pro (häufigere Cron-Jobs) könnte `preferredHour` tatsächlich durchgesetzt werden, z. B. mit stündlichem Cron und Stundenabgleich.
