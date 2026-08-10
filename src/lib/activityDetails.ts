import type {
  Activity,
  ActivitySeriesPoint,
  ActivityStatistic,
  ActivityStatisticSection,
  ImportedTrainingLogData,
} from "@/lib/types";

type UnknownRecord = Record<string, unknown>;
export type SportKind = "rowing" | "cycling" | "running" | "walking" | "strength" | "other";

export type AthleteActivityDetail = {
  activity?: UnknownRecord;
  derived?: UnknownRecord;
  derivedMetrics?: UnknownRecord;
};

export type AthleteActivityFile = {
  sessions?: UnknownRecord[];
  laps?: string[];
  records?: UnknownRecord[];
};

const finite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function numberFrom(source: UnknownRecord | undefined, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = finite(source?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function textFrom(source: UnknownRecord | undefined, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function average(records: UnknownRecord[], ...keys: string[]): number | null {
  const values = records
    .map((record) => numberFrom(record, ...keys))
    .filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatClock(seconds: number): string {
  const tenths = Math.round(Math.max(0, seconds) * 10);
  const wholeSeconds = Math.floor(tenths / 10);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;
  const decimal = tenths % 10;
  const base = hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
  return decimal ? `${base},${decimal}` : base;
}

function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function pace(value: number, suffix: string): string {
  return `${formatClock(value)} ${suffix}`;
}

function strokeDistanceMeters(value: number | null): number | null {
  if (value === null) return null;
  // AthleteData exposes FIT avg_stroke_distance in kilometres. Values greater than one are
  // accepted as already-normalised metres for forward compatibility.
  return value <= 1 ? value * 1000 : value;
}

function altitudeMeters(value: number | null): number | null {
  if (value === null || value <= -500) return null;
  return value / 1000;
}

function cadenceWithFraction(record: UnknownRecord, sport: SportKind): number | null {
  const base = numberFrom(record, "cadence");
  if (base === null) return null;
  const fractional = numberFrom(record, "fractional_cadence") ?? 0;
  const cadence = base + fractional;
  // Running FIT cadence counts cycles; Garmin's displayed step frequency is twice this value.
  return sport === "running" || sport === "walking" ? cadence * 2 : cadence;
}

export function resolveSportKind(summary: Activity | null, detailResult: AthleteActivityDetail | null): SportKind {
  const value = `${summary?.activityType ?? ""} ${textFrom(detailResult?.activity, "sportType") ?? ""}`.toUpperCase();
  if (value.includes("ROW")) return "rowing";
  if (value.includes("CYCL") || value.includes("BIKE") || value.includes("RIDE")) return "cycling";
  if (value.includes("RUN")) return "running";
  if (value.includes("WALK") || value.includes("HIKE")) return "walking";
  if (value.includes("STRENGTH") || value.includes("WEIGHT")) return "strength";
  return "other";
}

export function computeActivitySeries(records: UnknownRecord[], sport: SportKind = "other"): ActivitySeriesPoint[] {
  if (records.length === 0) return [];
  const firstTimestamp = textFrom(records[0], "timestamp");
  const t0 = firstTimestamp ? new Date(firstTimestamp).getTime() : null;

  return records.map((record) => {
    const rawTime = numberFrom(record, "elapsed_time", "timer_time");
    const timestamp = textFrom(record, "timestamp");
    const t = rawTime !== null && rawTime > 0
      ? rawTime
      : t0 !== null && timestamp
        ? Math.max(0, Math.round((new Date(timestamp).getTime() - t0) / 1000))
        : 0;
    const speedKmh = numberFrom(record, "enhanced_speed", "speed");
    const cadence = cadenceWithFraction(record, sport);
    const verticalOscillation = numberFrom(record, "vertical_oscillation");
    const stepLength = numberFrom(record, "step_length");
    const isFootSport = sport === "running" || sport === "walking";

    return {
      t,
      heartRate: numberFrom(record, "heart_rate"),
      speedKmh,
      altitudeM: sport === "rowing" ? null : altitudeMeters(numberFrom(record, "enhanced_altitude", "altitude")),
      cadence,
      power: numberFrom(record, "power"),
      distanceKm: numberFrom(record, "distance"),
      paceSecondsPerKm: isFootSport && speedKmh && speedKmh > 0 ? 3600 / speedKmh : null,
      rowingPaceSecondsPer500: sport === "rowing" && speedKmh && speedKmh > 0 ? 1800 / speedKmh : null,
      strokeDistanceM:
        sport === "rowing" && speedKmh && speedKmh > 0 && cadence && cadence > 0
          ? (speedKmh / 3.6) * (60 / cadence)
          : null,
      temperatureC: numberFrom(record, "temperature"),
      groundContactTimeMs: sport === "running" ? numberFrom(record, "stance_time") : null,
      verticalOscillationCm:
        sport === "running" && verticalOscillation !== null ? verticalOscillation / 10 : null,
      strideLengthM: sport === "running" && stepLength !== null ? stepLength / 1000 : null,
      verticalRatioPct: sport === "running" ? numberFrom(record, "vertical_ratio") : null,
    };
  });
}

type SectionBuilder = { key: string; title: string; items: ActivityStatistic[] };

function add(
  section: SectionBuilder,
  key: string,
  label: string,
  value: number | string | null | undefined,
  formatter: (value: number) => string = (number) => formatNumber(number)
) {
  if (typeof value === "string") {
    if (value.trim()) section.items.push({ key, label, value });
  } else if (typeof value === "number" && Number.isFinite(value)) {
    section.items.push({ key, label, value: formatter(value) });
  }
}

function sessionCadence(session: UnknownRecord | undefined, sport: SportKind, kind: "avg" | "max"): number | null {
  const base = numberFrom(session, `${kind}_cadence`);
  if (base === null) return null;
  const fractional = numberFrom(session, `${kind}_fractional_cadence`) ?? 0;
  const value = base + fractional;
  return sport === "running" || sport === "walking" ? value * 2 : value;
}

export function buildImportedTrainingLog(
  detailResult: AthleteActivityDetail | null,
  session: UnknownRecord | undefined
): ImportedTrainingLogData {
  const detail = detailResult?.activity;
  const rpe = numberFrom(session, "workout_rpe") ?? numberFrom(detail, "rpe");
  const feel = numberFrom(session, "workout_feel") ?? numberFrom(detail, "feel");
  const load = numberFrom(session, "training_load_peak") ?? numberFrom(detail, "trainingLoad");
  const moderate = numberFrom(session, "moderate_intensity_minutes");
  const vigorous = numberFrom(session, "vigorous_intensity_minutes");
  const items: ActivityStatistic[] = [];
  if (rpe !== null) items.push({ key: "rpe", label: "Belastungsempfinden", value: `${formatNumber(rpe, 0)} / 10` });
  if (feel !== null) items.push({ key: "feel", label: "Trainingsgefühl", value: `${formatNumber(feel, 0)} / 100` });
  if (load !== null) items.push({ key: "load", label: "Belastungswert", value: formatNumber(load, 1) });
  if (moderate !== null) items.push({ key: "moderate-minutes", label: "Moderate Intensitätsminuten", value: `${formatNumber(moderate)} min` });
  if (vigorous !== null) items.push({ key: "vigorous-minutes", label: "Intensive Intensitätsminuten", value: `${formatNumber(vigorous)} min` });
  return { source: "Garmin / AthleteData", rpe, feel, items };
}

export function buildActivityStatistics(
  summary: Activity | null,
  detailResult: AthleteActivityDetail | null,
  session: UnknownRecord | undefined,
  records: UnknownRecord[] = []
): ActivityStatisticSection[] {
  const detail = detailResult?.activity;
  const derived = detailResult?.derivedMetrics ?? detailResult?.derived;
  const sport = resolveSportKind(summary, detailResult);
  const sections: SectionBuilder[] = [
    { key: "overview", title: "Übersicht", items: [] },
    { key: "timing", title: "Zeitmessung", items: [] },
    { key: "pace-speed", title: "Pace / Geschwindigkeit", items: [] },
    { key: "heart-rate", title: "Herzfrequenz", items: [] },
    { key: "rowing", title: "Rudern", items: [] },
    { key: "cadence", title: "Kadenz", items: [] },
    { key: "power", title: "Leistung", items: [] },
    { key: "elevation", title: "Höhe", items: [] },
    { key: "temperature", title: "Temperatur", items: [] },
    { key: "training-effect", title: "Training Effect / Belastung", items: [] },
    { key: "intensity-minutes", title: "Intensitätsminuten", items: [] },
    { key: "nutrition", title: "Ernährung und Flüssigkeitsaufnahme", items: [] },
    { key: "body", title: "Body Battery / Stamina", items: [] },
    { key: "running-dynamics", title: "Running Dynamics", items: [] },
    { key: "weather", title: "Wetter", items: [] },
    { key: "additional", title: "Weitere Werte", items: [] },
  ];
  const [overview, timing, speed, heart, rowing, cadence, power, elevation, temperature, effect, intensity, nutrition, body, running, weather, additional] = sections;

  const distanceKm =
    numberFrom(detail, "distanceMeters") !== null
      ? numberFrom(detail, "distanceMeters")! / 1000
      : numberFrom(session, "total_distance") ?? (summary ? summary.distanceInMeters / 1000 : null);
  const totalTime = numberFrom(detail, "durationSec") ?? summary?.durationInSeconds ?? null;
  const movingTime = numberFrom(session, "total_timer_time");
  const elapsedTime = numberFrom(session, "total_elapsed_time");
  const avgSpeed = numberFrom(session, "enhanced_avg_speed", "avg_speed")
    ?? (summary?.averageSpeedInMetersPerSecond != null ? summary.averageSpeedInMetersPerSecond * 3.6 : null);
  const maxSpeed = numberFrom(session, "enhanced_max_speed", "max_speed")
    ?? (summary?.maxSpeedInMetersPerSecond != null ? summary.maxSpeedInMetersPerSecond * 3.6 : null);

  add(overview, "distance", "Distanz", distanceKm, (value) => `${formatNumber(value, 2)} km`);
  add(overview, "device", "Gerät", summary?.deviceName);
  add(timing, "total-time", "Gesamtzeit", totalTime, formatClock);
  add(timing, "moving-time", "Zeit in Bewegung", movingTime, formatClock);
  add(timing, "elapsed-time", "Verstrichene Zeit", elapsedTime, formatClock);

  if (sport === "rowing") {
    add(speed, "avg-rowing-pace", "Ø 500-m-Split", distanceKm && totalTime ? totalTime / distanceKm / 2 : avgSpeed && avgSpeed > 0 ? 1800 / avgSpeed : null, (value) => pace(value, "/500 m"));
    add(speed, "moving-rowing-pace", "Pace in Bewegung", distanceKm && movingTime ? movingTime / distanceKm / 2 : null, (value) => pace(value, "/500 m"));
    add(speed, "best-rowing-pace", "Beste Pace", maxSpeed && maxSpeed > 0 ? 1800 / maxSpeed : null, (value) => pace(value, "/500 m"));
  } else if (sport === "running" || sport === "walking") {
    add(speed, "avg-pace", "Ø Pace", distanceKm && totalTime ? totalTime / distanceKm : avgSpeed && avgSpeed > 0 ? 3600 / avgSpeed : null, (value) => pace(value, "min/km"));
    add(speed, "moving-pace", "Pace in Bewegung", distanceKm && movingTime ? movingTime / distanceKm : null, (value) => pace(value, "min/km"));
    add(speed, "best-pace", "Beste Pace", maxSpeed && maxSpeed > 0 ? 3600 / maxSpeed : null, (value) => pace(value, "min/km"));
  }
  if (sport !== "strength") {
    add(speed, "avg-speed", "Ø Geschwindigkeit", avgSpeed, (value) => `${formatNumber(value, 1)} km/h`);
    add(speed, "max-speed", "Max. Geschwindigkeit", maxSpeed, (value) => `${formatNumber(value, 1)} km/h`);
  }

  add(heart, "avg-hr", "Ø Herzfrequenz", numberFrom(detail, "avgHr") ?? summary?.averageHeartRateInBeatsPerMinute ?? numberFrom(session, "avg_heart_rate"), (value) => `${formatNumber(value)} bpm`);
  add(heart, "max-hr", "Max. Herzfrequenz", numberFrom(detail, "maxHr") ?? summary?.maxHeartRateInBeatsPerMinute ?? numberFrom(session, "max_heart_rate"), (value) => `${formatNumber(value)} bpm`);
  add(heart, "min-hr", "Min. Herzfrequenz", numberFrom(session, "min_heart_rate"), (value) => `${formatNumber(value)} bpm`);

  if (sport === "rowing") {
    add(rowing, "avg-stroke-rate", "Ø Schlagrate", numberFrom(detail, "avgCadence") ?? sessionCadence(session, sport, "avg"), (value) => `${formatNumber(value, 1)} spm`);
    add(rowing, "max-stroke-rate", "Max. Schlagrate", sessionCadence(session, sport, "max"), (value) => `${formatNumber(value, 1)} spm`);
    add(rowing, "strokes", "Schläge insgesamt", numberFrom(session, "total_cycles"), (value) => formatNumber(value));
    add(rowing, "stroke-distance", "Ø Distanz pro Zug", strokeDistanceMeters(numberFrom(session, "avg_stroke_distance")), (value) => `${formatNumber(value, 2)} m`);
  } else if (sport === "cycling" || sport === "running" || sport === "walking") {
    add(cadence, "avg-cadence", sport === "cycling" ? "Ø Trittfrequenz" : "Ø Schrittfrequenz", numberFrom(detail, "avgCadence") ?? sessionCadence(session, sport, "avg"), (value) => `${formatNumber(value, 1)} spm`);
    add(cadence, "max-cadence", sport === "cycling" ? "Max. Trittfrequenz" : "Max. Schrittfrequenz", sessionCadence(session, sport, "max"), (value) => `${formatNumber(value, 1)} spm`);
  }

  add(power, "avg-power", "Ø Leistung", numberFrom(detail, "avgPower") ?? numberFrom(session, "avg_power"), (value) => `${formatNumber(value)} W`);
  add(power, "max-power", "Max. Leistung", numberFrom(detail, "maxPower") ?? numberFrom(session, "max_power"), (value) => `${formatNumber(value)} W`);
  add(power, "normalized-power", "Normalisierte Leistung", numberFrom(detail, "normalizedPower") ?? numberFrom(session, "normalized_power"), (value) => `${formatNumber(value)} W`);
  add(power, "weather-power", "Wetterbereinigte Leistung", numberFrom(detail, "weatherAdjustedPower"), (value) => `${formatNumber(value)} W`);
  add(power, "total-work", "Gesamtarbeit", numberFrom(session, "total_work"), (value) => `${formatNumber(value / 1000, 1)} kJ`);
  add(power, "if", "Intensitätsfaktor", numberFrom(detail, "intensityFactor") ?? numberFrom(derived, "intensity_factor"), (value) => formatNumber(value, 2));
  add(power, "vi", "Variabilitätsindex", numberFrom(detail, "variabilityIndex") ?? numberFrom(derived, "variability_index"), (value) => formatNumber(value, 2));
  add(power, "ef", "Effizienzfaktor", numberFrom(detail, "efficiencyFactor") ?? numberFrom(derived, "efficiency_factor"), (value) => formatNumber(value, 2));

  if (sport !== "rowing" && sport !== "strength") {
    add(elevation, "avg-altitude", "Ø Höhe", altitudeMeters(numberFrom(session, "enhanced_avg_altitude", "avg_altitude")), (value) => `${formatNumber(value)} m`);
    add(elevation, "min-altitude", "Min. Höhe", altitudeMeters(numberFrom(session, "enhanced_min_altitude", "min_altitude")), (value) => `${formatNumber(value)} m`);
    add(elevation, "max-altitude", "Max. Höhe", altitudeMeters(numberFrom(session, "enhanced_max_altitude", "max_altitude")), (value) => `${formatNumber(value)} m`);
    add(elevation, "ascent", "Anstieg", altitudeMeters(numberFrom(session, "total_ascent")), (value) => `${formatNumber(value)} m`);
    add(elevation, "descent", "Abstieg", altitudeMeters(numberFrom(session, "total_descent")), (value) => `${formatNumber(value)} m`);
  }

  add(temperature, "avg-temperature", "Ø Temperatur", numberFrom(session, "avg_temperature") ?? numberFrom(detail, "tempC") ?? average(records, "temperature"), (value) => `${formatNumber(value, 1)} °C`);
  add(temperature, "max-temperature", "Max. Temperatur", numberFrom(session, "max_temperature"), (value) => `${formatNumber(value, 1)} °C`);

  add(effect, "aerobic-effect", "Aerober Training Effect", numberFrom(session, "total_training_effect"), (value) => formatNumber(value, 1));
  add(effect, "anaerobic-effect", "Anaerober Training Effect", numberFrom(session, "total_anaerobic_training_effect"), (value) => formatNumber(value, 1));
  add(effect, "training-load", "Belastungswert", numberFrom(session, "training_load_peak") ?? numberFrom(detail, "trainingLoad") ?? summary?.trainingLoad, (value) => formatNumber(value, 1));
  add(effect, "benefit", "Primärer Nutzen", textFrom(session, "primary_benefit"));
  add(effect, "decoupling", "Aerobes Decoupling", numberFrom(detail, "aerobicDecouplingPct") ?? numberFrom(derived, "decoupling_pct"), (value) => `${formatNumber(value, 1)} %`);
  add(effect, "hr-drift", "Herzfrequenz-Drift", numberFrom(detail, "hrDriftPct"), (value) => `${formatNumber(value, 1)} %`);

  add(intensity, "moderate-minutes", "Moderate Intensitätsminuten", numberFrom(session, "moderate_intensity_minutes"), (value) => `${formatNumber(value)} min`);
  add(intensity, "vigorous-minutes", "Intensive Intensitätsminuten", numberFrom(session, "vigorous_intensity_minutes"), (value) => `${formatNumber(value)} min`);

  const totalCalories = numberFrom(session, "total_calories") ?? summary?.activeKilocalories ?? null;
  const restingCalories = numberFrom(session, "resting_calories");
  const activeCalories = totalCalories !== null && restingCalories !== null ? Math.max(0, totalCalories - restingCalories) : summary?.activeKilocalories ?? null;
  const consumedCalories = numberFrom(session, "calories_consumed", "total_calories_consumed");
  const sweatLoss = numberFrom(session, "est_sweat_loss");
  const fluidConsumed = numberFrom(session, "total_fluid_consumed", "fluid_consumed");
  add(nutrition, "resting-calories", "Kalorien in Ruhe", restingCalories, (value) => `${formatNumber(value)} kcal`);
  add(nutrition, "active-calories", "Aktiv-Kalorien", activeCalories, (value) => `${formatNumber(value)} kcal`);
  add(nutrition, "total-calories", "Gesamtkalorien", totalCalories, (value) => `${formatNumber(value)} kcal`);
  add(nutrition, "calories-consumed", "Kalorienaufnahme", consumedCalories, (value) => `${formatNumber(value)} kcal`);
  add(nutrition, "net-calories", "Netto-Kalorien", consumedCalories !== null && totalCalories !== null ? consumedCalories - totalCalories : null, (value) => `${formatNumber(value)} kcal`);
  add(nutrition, "sweat-loss", "Geschätzter Schweißverlust", sweatLoss, (value) => `${formatNumber(value)} ml`);
  add(nutrition, "fluid-consumed", "Flüssigkeitsaufnahme", fluidConsumed, (value) => `${formatNumber(value)} ml`);
  add(nutrition, "net-fluid", "Netto-Flüssigkeitshaushalt", fluidConsumed !== null && sweatLoss !== null ? fluidConsumed - sweatLoss : null, (value) => `${formatNumber(value)} ml`);

  add(body, "stamina-start", "Stamina Start", numberFrom(detail, "staminaStart"), (value) => `${formatNumber(value)} %`);
  add(body, "stamina-end", "Stamina Ende", numberFrom(detail, "staminaEnd"), (value) => `${formatNumber(value)} %`);
  add(body, "body-battery-impact", "Body-Battery-Auswirkung", numberFrom(detail, "bodyBatteryImpact"), (value) => formatNumber(value));

  if (sport === "running") {
    add(running, "ground-contact", "Ø Bodenkontaktzeit", numberFrom(detail, "avgGroundContactMs") ?? average(records, "stance_time"), (value) => `${formatNumber(value)} ms`);
    add(running, "ground-contact-balance", "Ø Bodenkontaktzeit-Balance", numberFrom(session, "avg_stance_time_balance") ?? average(records, "stance_time_balance"), (value) => `${formatNumber(value, 1)} %`);
    add(running, "vertical-oscillation", "Ø Vertikale Bewegung", numberFrom(detail, "avgVerticalOscCm") ?? (average(records, "vertical_oscillation") !== null ? average(records, "vertical_oscillation")! / 10 : null), (value) => `${formatNumber(value, 1)} cm`);
    add(running, "stride-length", "Ø Schrittlänge", numberFrom(detail, "avgStrideLengthM") ?? (average(records, "step_length") !== null ? average(records, "step_length")! / 1000 : null), (value) => `${formatNumber(value, 2)} m`);
    add(running, "vertical-ratio", "Ø Vertikales Verhältnis", average(records, "vertical_ratio") ?? numberFrom(session, "avg_vertical_ratio"), (value) => `${formatNumber(value, 1)} %`);
  }

  add(weather, "humidity", "Luftfeuchtigkeit", numberFrom(detail, "humidityPct"), (value) => `${formatNumber(value)} %`);
  add(weather, "wind", "Wind", numberFrom(detail, "windKph"), (value) => `${formatNumber(value, 1)} km/h`);

  add(additional, "rpe", "Belastungsempfinden", numberFrom(session, "workout_rpe") ?? numberFrom(detail, "rpe"), (value) => `${formatNumber(value)} / 10`);
  add(additional, "feel", "Trainingsgefühl", numberFrom(session, "workout_feel") ?? numberFrom(detail, "feel"), (value) => `${formatNumber(value)} / 100`);
  if (sport === "strength") {
    add(additional, "strength-volume", "Krafttrainingsvolumen", numberFrom(detail, "totalVolume"), (value) => `${formatNumber(value, 1)} kg`);
    add(additional, "strength-sets", "Arbeitssätze", numberFrom(detail, "totalSets"), (value) => formatNumber(value));
  }
  if (sport === "running" || sport === "walking") add(additional, "steps", "Schritte", summary?.steps, formatNumber);

  return sections.filter((section) => section.items.length > 0);
}

export function buildActivityOverview(
  sport: SportKind,
  sections: ActivityStatisticSection[]
): ActivityStatistic[] {
  const all = sections.flatMap((section) => section.items);
  const keysBySport: Record<SportKind, string[]> = {
    rowing: [
      "total-time", "distance", "avg-rowing-pace", "avg-hr", "max-hr",
      "avg-stroke-rate", "max-stroke-rate", "strokes", "stroke-distance",
      "total-calories", "training-load",
    ],
    cycling: [
      "total-time", "distance", "avg-speed", "max-speed", "avg-hr", "max-hr",
      "avg-power", "max-power", "avg-cadence", "max-cadence", "ascent",
      "total-calories", "training-load",
    ],
    running: [
      "total-time", "distance", "avg-pace", "best-pace", "avg-hr", "max-hr",
      "avg-cadence", "ascent", "total-calories", "training-load",
    ],
    walking: [
      "total-time", "distance", "avg-pace", "best-pace", "avg-hr", "max-hr",
      "avg-cadence", "ascent", "total-calories", "training-load",
    ],
    strength: ["total-time", "avg-hr", "max-hr", "total-calories", "training-load", "strength-volume", "strength-sets"],
    other: ["total-time", "distance", "avg-hr", "max-hr", "total-calories", "training-load"],
  };
  const byKey = new Map(all.map((item) => [item.key, item]));
  return keysBySport[sport].map((key) => byKey.get(key)).filter((item): item is ActivityStatistic => Boolean(item));
}
