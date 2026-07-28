export interface ParsedLap {
  index: number;
  intensity: string;
  trigger: string;
  duration: string;
  distance: string;
  paceOrSpeed: string;
  hrAvg: number | null;
  hrMax: number | null;
  cadenceAvg: number | null;
  cadenceMax: number | null;
  powerW: number | null;
  ascentM: number | null;
  descentM: number | null;
  groundContactMs: number | null;
  verticalOscMm: number | null;
  strideLengthMm: number | null;
  raw: string;
}

const INTENSITY_LABELS: Record<string, string> = {
  active: "Aktiv",
  rest: "Pause",
  warmup: "Aufwärmen",
  cooldown: "Abwärmen",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manuell",
  time: "Zeit",
  distance: "Distanz",
  session_end: "Einheit-Ende",
  position_start: "Position",
  position_lap: "Position",
  position_waypoint: "Wegpunkt",
  position_marked: "Markierung",
  fitness_equipment: "Gerät",
};

export function translateIntensity(value: string): string {
  return INTENSITY_LABELS[value.toLowerCase()] ?? value;
}

export function translateTrigger(value: string): string {
  return TRIGGER_LABELS[value.toLowerCase()] ?? value;
}

const LAP_LINE_REGEX =
  /^#(\d+)\s+(\S+)\s+\[(\w+)\]\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+HR(\d+)\/(\d+))?(?:\s+cad(\d+)\/(\d+))?(?:\s+(\d+)W)?(?:\s+\+(\d+)\/-(\d+)m)?(?:\s+gct(\d+)ms)?(?:\s+vosc(\d+)mm)?(?:\s+steplen(\d+)mm)?/;

export function parseLapLine(line: string): ParsedLap | null {
  const match = line.match(LAP_LINE_REGEX);
  if (!match) return null;

  const [
    ,
    index,
    intensity,
    trigger,
    duration,
    distance,
    paceOrSpeed,
    hrAvg,
    hrMax,
    cadAvg,
    cadMax,
    power,
    asc,
    desc,
    gct,
    vosc,
    steplen,
  ] = match;

  return {
    index: Number(index),
    intensity: translateIntensity(intensity),
    trigger: translateTrigger(trigger),
    duration,
    distance,
    paceOrSpeed,
    hrAvg: hrAvg ? Number(hrAvg) : null,
    hrMax: hrMax ? Number(hrMax) : null,
    cadenceAvg: cadAvg ? Number(cadAvg) : null,
    cadenceMax: cadMax ? Number(cadMax) : null,
    powerW: power ? Number(power) : null,
    ascentM: asc ? Number(asc) / 1000 : null,
    descentM: desc ? Number(desc) / 1000 : null,
    groundContactMs: gct ? Number(gct) : null,
    verticalOscMm: vosc ? Number(vosc) : null,
    strideLengthMm: steplen ? Number(steplen) : null,
    raw: line,
  };
}

export function parseLaps(lines: string[]): ParsedLap[] {
  return lines.map((line, i) => parseLapLine(line) ?? fallbackLap(line, i));
}

function fallbackLap(line: string, i: number): ParsedLap {
  return {
    index: i + 1,
    intensity: "",
    trigger: "",
    duration: "",
    distance: "",
    paceOrSpeed: line,
    hrAvg: null,
    hrMax: null,
    cadenceAvg: null,
    cadenceMax: null,
    powerW: null,
    ascentM: null,
    descentM: null,
    groundContactMs: null,
    verticalOscMm: null,
    strideLengthMm: null,
    raw: line,
  };
}
