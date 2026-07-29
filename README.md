SportLog — ein persönlicher KI-gestützter Sport- und Gesundheitsassistent für Leistungssportler. Basiert auf [Next.js](https://nextjs.org).

## Setup

```bash
npm install
cp .env.local.example .env.local
# OPENROUTER_API_KEY in .env.local eintragen (kostenlos, Anmeldung per Google/GitHub): https://openrouter.ai/keys
npm run dev
```

Ohne `OPENROUTER_API_KEY` läuft die App vollständig mit Dashboard, Charts und regelbasierten Erklärungen — nur der Chat-Coach und die automatische Wettkampf-Analyse benötigen den Key. Genutzt wird OpenRouters kostenloser Modell-Router (`openrouter/free`, routet automatisch zu einem aktuell verfügbaren Gratis-Modell) — Anthropic und Google verlangen für ihre APIs Zahlungsdaten bzw. Altersverifizierung, OpenRouter nicht.

## Architektur

- **`data/cache/*.json`** — Snapshot der Trainings- und Gesundheitsdaten aus dem AthleteData MCP-Server (CTL/ATL/TSB, HRV, Ruhepuls, Schlaf, Belastung, Aktivitäten, Leistungsprofil). Die App liest diese Dateien server-seitig (`src/lib/data/store.ts`).
- **`data/user/*.json`** — selbst erfasste Daten (Wettkämpfe, Ziele), über die App bearbeitbar.
- **`src/lib/insights/`** — regelbasierte Erklärungs-Engine (keine API nötig): interpretiert HRV, Ruhepuls, Schlaf, Trainingslast und Überlastungsrisiko und erzeugt Warnungen + Tagesempfehlung.
- **`src/lib/context.ts`** + **`src/app/api/coach/route.ts`** — baut aus dem Datenschnappschuss einen Kontext für OpenRouter und beantwortet freie Fragen zum Training.
- **`src/app/api/competitions/[id]/analyze/route.ts`** — erstellt nach einem Wettkampf automatisch eine Analyse via OpenRouter.

### Warum ein Cache statt Live-MCP-Zugriff?

Der AthleteData MCP-Server ist aktuell als Connector innerhalb von Claude-Sitzungen (Claude Code / Claude Desktop) konfiguriert, nicht als eigenständig erreichbarer HTTP-Endpunkt mit eigenen Zugangsdaten. Die Next.js-App selbst kann ihn deshalb nicht direkt anfragen.

**Daten aktualisieren:** Bitte Claude in diesem Projektverzeichnis, die aktuellen Werte erneut abzurufen (z.B. „Aktualisiere die Trainings- und Gesundheitsdaten aus AthleteData"). Claude ruft dann die MCP-Tools live ab und schreibt frische Snapshots nach `data/cache/`. Sobald echte, eigenständig erreichbare Zugangsdaten für den MCP-Server vorliegen, kann `src/lib/data/store.ts` durch einen echten MCP-Client (`@modelcontextprotocol/sdk`, bereits als Abhängigkeit vorhanden) ersetzt werden, der bei jedem Request live abfragt.

## Entwicklung

```bash
npm run dev    # Dev-Server (Turbopack)
npm run build  # Production-Build
npm run lint   # ESLint
```
