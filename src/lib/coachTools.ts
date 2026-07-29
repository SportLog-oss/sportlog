import type OpenAI from "openai";
import {
  getActivities,
  getActivityNotes,
  getAnalyticsSummary,
  getBenchmarks,
  getCompetitions,
  getDailyMetrics,
  getGoals,
  getIllnessLog,
  getInjuryRisk,
  getMentalHealthCheckins,
  getPerformanceEstimates,
  getStrengthSessions,
  getTrainingLogEntries,
  getTrainingTrends,
} from "@/lib/data/store";

/**
 * Tool layer the coach's agentic loop calls into. Deliberately reads only from our own
 * Redis-cached store (never the raw AthleteData MCP client in athleteDataDirect.ts, which
 * is reserved for deterministic sync code — see the comment on callAthleteDataTool) so the
 * AI never triggers uncontrolled live calls to the upstream service.
 */
export const COACH_TOOLS: OpenAI.Chat.Completions.ChatCompletionFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "get_daily_metrics",
      description: "Tagesgenaue Werte (CTL/ATL/TSB, HFV, Ruhepuls, Schlaf, Readiness, Injury-Risk) für die letzten N Tage.",
      parameters: {
        type: "object",
        properties: { days: { type: "number", description: "Anzahl Tage rückwirkend, Standard 14" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_injury_risk",
      description: "Aktueller Verletzungs-/Überlastungsrisiko-Index mit Treibern und 14-Tage-Trend.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activities",
      description: "Liste der letzten Trainingsaktivitäten mit Dauer, Distanz, HF, Leistungskennzahlen.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Max. Anzahl Aktivitäten, Standard 10" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_analytics_summary",
      description: "Wöchentliches Trainingsvolumen, HF-Zonenverteilung und Wellness-Durchschnittswerte.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_training_trends",
      description: "Trainings-Trends: Sessions, Umfang, HFV/Ruhepuls-Trend, Schlaf-Trend.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance_estimates",
      description: "FTP, Laufschwellenpace, Leistungsprofil (Archetyp, Stärken, Schwächen), Leistungszonen.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_goals",
      description: "Alle vom Athleten hinterlegten Trainings-/Leistungsziele.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_competitions",
      description: "Geplante und abgeschlossene Wettkämpfe mit Ergebnissen und Analysen.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_strength_sessions",
      description: "Kraftrainings-Einheiten mit Übungen, Sätzen, Gewichten, Wiederholungen.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Max. Anzahl Einheiten, Standard 10" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_benchmarks",
      description: "Persönliche Bestwerte/Benchmarks (z.B. Ergo-Zeiten) mit Verlaufshistorie.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_illness_log",
      description: "Krankheits-/Verletzungsprotokoll: aktive und vergangene Einträge mit Symptomen, Trainingspausen, Rückkehr-Datum.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mental_health_checkins",
      description: "Check-ins zur mentalen Gesundheit (Valenz, Emotionen, Einflussfaktoren) der letzten N Einträge.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Max. Anzahl Check-ins, Standard 14" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_training_log_entries",
      description: "Trainingsprotokoll pro Einheit: Schmerzen, Verletzungsflag, Muskelkater, RPE, Notizen.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Max. Anzahl Einträge, Standard 10" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_notes",
      description: "Freitext-Notizen, die einzelnen Aktivitäten zugeordnet sind (z.B. aus Ergo-Foto-Analysen).",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function executeCoachTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_daily_metrics": {
      const days = typeof args.days === "number" ? args.days : 14;
      const cache = await getDailyMetrics();
      return { fetchedAt: cache.fetchedAt, rows: cache.rows.slice(-days) };
    }
    case "get_injury_risk":
      return getInjuryRisk();
    case "get_activities": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const cache = await getActivities();
      return { fetchedAt: cache.fetchedAt, activities: cache.activities.slice(0, limit) };
    }
    case "get_analytics_summary":
      return getAnalyticsSummary();
    case "get_training_trends":
      return getTrainingTrends();
    case "get_performance_estimates":
      return getPerformanceEstimates();
    case "get_goals":
      return getGoals();
    case "get_competitions":
      return getCompetitions();
    case "get_strength_sessions": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      return (await getStrengthSessions()).slice(-limit);
    }
    case "get_benchmarks":
      return getBenchmarks();
    case "get_illness_log":
      return getIllnessLog();
    case "get_mental_health_checkins": {
      const limit = typeof args.limit === "number" ? args.limit : 14;
      return (await getMentalHealthCheckins()).slice(-limit);
    }
    case "get_training_log_entries": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      return (await getTrainingLogEntries()).slice(-limit);
    }
    case "get_activity_notes":
      return getActivityNotes();
    default:
      return { error: `Unbekanntes Tool: ${name}` };
  }
}
