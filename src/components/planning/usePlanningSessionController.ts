"use client";

import { useState, type FormEvent } from "react";
import type { PlannedSession } from "@/lib/planning";
import type { AdaptationSuggestion } from "@/lib/trainingAdaptation";
import { emptySessionDraft, type SessionDraft } from "@/lib/planningPresentation";
import { planningResponseError } from "@/components/planning/usePlanningWeekController";

type PlanningSessionControllerOptions = {
  weekStart: string;
  reloadWeek: (start: string) => Promise<void>;
  setNotice: (notice: string | null) => void;
};

export function usePlanningSessionController({ weekStart, reloadWeek, setNotice }: PlanningSessionControllerOptions) {
  const [modal, setModal] = useState<SessionDraft | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  function planSession(day = weekStart) {
    setModal(emptySessionDraft(day));
  }

  function editSession(session: PlannedSession) {
    setModal({
      id: session.id,
      scheduledDate: session.scheduledDate,
      title: session.title,
      sportType: session.sportType,
      plannedDurationMin: session.plannedDurationMin?.toString() ?? "",
      plannedIntensity: session.plannedIntensity ?? "",
      timeOfDay: session.timeOfDay ?? "afternoon",
      description: session.description,
    });
  }

  function reviewAdaptation(session: PlannedSession, suggestion: AdaptationSuggestion) {
    editSession(session);
    setModal((current) => current ? {
      ...current,
      plannedDurationMin: session.plannedDurationMin ? Math.max(10, Math.round(session.plannedDurationMin * suggestion.durationFactor / 5) * 5).toString() : "",
      plannedIntensity: suggestion.intensity,
    } : current);
    setNotice(`Vorschlag für „${session.title}“ geöffnet. Erst dein Speichern ändert den Plan.`);
  }

  async function saveSession(event: FormEvent) {
    event.preventDefault();
    if (!modal) return;
    setModalSaving(true);
    setNotice(null);
    const payload = {
      scheduledDate: modal.scheduledDate,
      title: modal.title,
      sportType: modal.sportType,
      plannedDurationMin: modal.plannedDurationMin ? Number(modal.plannedDurationMin) : null,
      plannedIntensity: modal.plannedIntensity || null,
      timeOfDay: modal.timeOfDay,
      description: modal.description,
    };
    try {
      const response = await fetch(modal.id ? `/api/planning/sessions/${modal.id}` : "/api/planning/sessions", {
        method: modal.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await planningResponseError(response));
      setModal(null);
      await reloadWeek(weekStart);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Die Einheit konnte nicht gespeichert werden.");
    } finally {
      setModalSaving(false);
    }
  }

  async function updateStatus(session: PlannedSession, status: "cancelled" | "planned") {
    setNotice(null);
    const response = await fetch(`/api/planning/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, changeReason: status === "cancelled" ? "Manuell ausgefallen" : null }),
    });
    if (!response.ok) setNotice(await planningResponseError(response));
    else await reloadWeek(weekStart);
  }

  async function removeSession(session: PlannedSession) {
    if (!window.confirm(`„${session.title}“ wirklich löschen? Ausgefallene Einheiten besser als ausgefallen markieren.`)) return;
    const response = await fetch(`/api/planning/sessions/${session.id}`, { method: "DELETE" });
    if (!response.ok) setNotice(await planningResponseError(response));
    else await reloadWeek(weekStart);
  }

  async function duplicateSession(session: PlannedSession) {
    setNotice(null);
    const response = await fetch(`/api/planning/sessions/${session.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate: session.scheduledDate }),
    });
    if (!response.ok) setNotice(await planningResponseError(response));
    else {
      await reloadWeek(weekStart);
      setNotice("Einheit dupliziert. Du kannst die Kopie jetzt bearbeiten oder verschieben.");
    }
  }

  return {
    modal,
    setModal,
    modalSaving,
    planSession,
    editSession,
    reviewAdaptation,
    saveSession,
    updateStatus,
    removeSession,
    duplicateSession,
  };
}
