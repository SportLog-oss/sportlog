-- TASKS.md #8 (Mentale Gesundheit) asks for Motivation, Stress, mentale Energie and
-- Schlafqualität as their own trackable dimensions, plus a real once-daily "Check-in" distinct
-- from ad-hoc mood logging. mental_health_checkins already has a `type` column distinguishing
-- 'emotion' (quick ad-hoc mood log, unchanged) from 'mood' (was defined but never used by the
-- app) — this repurposes 'mood' rows as the daily check-in and gives them 4 dedicated columns
-- instead of folding everything into the single generic `valence` score.
--
-- Nullable and 0-10 scale (matching this app's existing convention for subjective scores — RPE,
-- soreness, pain intensity are all 0-10 elsewhere) — null on 'emotion' rows, always set on 'mood'
-- rows written by the new daily check-in form.
--
-- Safe to re-run.

alter table public.mental_health_checkins
  add column if not exists motivation numeric check (motivation is null or (motivation >= 0 and motivation <= 10)),
  add column if not exists stress numeric check (stress is null or (stress >= 0 and stress <= 10)),
  add column if not exists energy numeric check (energy is null or (energy >= 0 and energy <= 10)),
  add column if not exists sleep_quality numeric check (sleep_quality is null or (sleep_quality >= 0 and sleep_quality <= 10));
