export const GLOSSARY: Record<string, { term: string; explanation: string }> = {
  tsb: {
    term: "TSB (Form)",
    explanation:
      "Training Stress Balance – zeigt, wie frisch oder ermüdet du gerade bist. Berechnet als Fitness (CTL) minus Ermüdung (ATL). Positiv = frisch, negativ = ermüdet.",
  },
  ctl: {
    term: "CTL (Fitness)",
    explanation:
      "Chronic Training Load – ein gleitender Durchschnitt deiner Trainingsbelastung der letzten ca. 6 Wochen. Steigt langsam mit regelmäßigem Training, sinkt langsam bei Pausen.",
  },
  atl: {
    term: "ATL (Ermüdung)",
    explanation:
      "Acute Training Load – ein kurzfristiger Durchschnitt (ca. 1 Woche) deiner Belastung. Reagiert schnell auf harte Trainingstage.",
  },
  injuryRiskIndex: {
    term: "Überlastungsrisiko-Index",
    explanation:
      "Kombiniert mehrere Belastungskennzahlen (u.a. ACWR, Monotonie) zu einem Frühwarnwert für Überlastung. Kein Diagnosewert, sondern ein Hinweis, genauer hinzuschauen.",
  },
  acwr: {
    term: "ACWR",
    explanation:
      "Acute:Chronic Workload Ratio – Verhältnis aus kurzfristiger zu langfristiger Trainingsbelastung. Werte deutlich über 1,3 (zu schneller Anstieg) oder deutlich unter 0,8 (starker Rückgang/Detraining) gelten als risikoreicher.",
  },
  monotony: {
    term: "Monotonie",
    explanation:
      "Wie gleichmäßig deine tägliche Belastung über die letzte Woche verteilt ist. Hohe Monotonie (immer ähnliche Belastung, wenig Abwechslung) erhöht das Risiko für Übertraining.",
  },
  readinessScore: {
    term: "Trainingsbereitschaft",
    explanation:
      "Ein kombinierter Wert (0-100) aus Erholung, Form (TSB) und weiteren Faktoren, der einschätzt, wie bereit dein Körper heute für Belastung ist.",
  },
  recoveryScore: {
    term: "Recovery Score",
    explanation:
      "Misst, wie gut du dich seit der letzten Belastung erholt hast – basierend auf HRV, Ruhepuls und Schlaf der letzten Nacht.",
  },
  hrv: {
    term: "HRV",
    explanation:
      "Herzfrequenzvariabilität – die Schwankung der Zeit zwischen Herzschlägen. Höhere Werte deuten meist auf bessere Erholung und geringeren Stress hin.",
  },
  rampRate: {
    term: "Rampenrate",
    explanation:
      "Wie schnell sich deine Fitness (CTL) pro Woche verändert. Zu schnelle Anstiege erhöhen das Verletzungsrisiko, zu lange Stagnation bremst den Fortschritt.",
  },
};

export type GlossaryKey = keyof typeof GLOSSARY;
