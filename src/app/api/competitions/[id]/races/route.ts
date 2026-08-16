import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseForRequest } from "@/lib/data/supabaseClient";
import { rowToCompetitionRace } from "@/lib/data/mappers";

const raceType = z.enum(["time_trial", "heat", "repechage", "quarterfinal", "semifinal", "final", "other"]);
const raceStatus = z.enum(["planned", "completed", "dns", "dnf", "dsq", "cancelled"]);

const raceInput = z.object({
  raceType: raceType.default("other"),
  label: z.string().trim().max(120).default(""),
  scheduledAt: z.string().datetime({ offset: true }).nullable().default(null),
  distanceMeters: z.coerce.number().int().positive().max(100000).default(2000),
  boatClass: z.string().trim().max(80).default(""),
  crew: z.string().trim().max(500).default(""),
  status: raceStatus.default("planned"),
  officialTimeSeconds: z.coerce.number().positive().max(86400).nullable().default(null),
  placement: z.coerce.number().int().positive().nullable().default(null),
  fieldSize: z.coerce.number().int().positive().nullable().default(null),
  resultSource: z.string().trim().max(200).default(""),
  resultSourceUrl: z.union([z.literal(""), z.string().url()]).default(""),
  legacyResultText: z.string().trim().max(120).default(""),
  splits: z.array(z.object({ split: z.string().max(50), time: z.string().max(50) })).default([]),
  avgHeartRate: z.coerce.number().int().positive().max(260).nullable().default(null),
  weather: z.string().trim().max(200).default(""),
  wind: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(5000).default(""),
}).superRefine((value, context) => {
  if (value.placement && value.fieldSize && value.placement > value.fieldSize) {
    context.addIssue({ code: "custom", path: ["placement"], message: "Die Platzierung kann nicht größer als das Teilnehmerfeld sein." });
  }
  if (value.status === "completed" && !value.officialTimeSeconds && !value.placement && !value.legacyResultText) {
    context.addIssue({ code: "custom", path: ["status"], message: "Ein abgeschlossenes Rennen benötigt Zeit, Platzierung oder ein bestehendes Ergebnis." });
  }
});

async function ownedCompetition(supabase: Awaited<ReturnType<typeof getSupabaseForRequest>>, id: string) {
  return supabase.from("goals_and_races").select("id").eq("id", id).eq("type", "race").maybeSingle();
}

function toRow(competitionId: string, value: z.infer<typeof raceInput>) {
  return {
    competition_id: competitionId,
    race_type: value.raceType,
    label: value.label,
    scheduled_at: value.scheduledAt,
    distance_meters: value.distanceMeters,
    boat_class: value.boatClass,
    crew: value.crew,
    status: value.status,
    official_time_seconds: value.officialTimeSeconds,
    placement: value.placement,
    field_size: value.fieldSize,
    result_source: value.resultSource,
    result_source_url: value.resultSourceUrl,
    legacy_result_text: value.legacyResultText,
    splits: value.splits,
    avg_heart_rate: value.avgHeartRate,
    weather: value.weather,
    wind: value.wind,
    notes: value.notes,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = raceInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const supabase = await getSupabaseForRequest();
  const { data: competition, error: competitionError } = await ownedCompetition(supabase, id);
  if (competitionError) throw competitionError;
  if (!competition) return NextResponse.json({ error: "Regatta nicht gefunden." }, { status: 404 });

  const { data, error } = await supabase.from("competition_races").insert(toRow(id, parsed.data)).select("*").single();
  if (error) throw error;
  return NextResponse.json(rowToCompetitionRace(data), { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const raceId = z.string().uuid().safeParse(body.id);
  const parsed = raceInput.safeParse(body);
  if (!raceId.success || !parsed.success) {
    return NextResponse.json({ error: parsed.success ? "Ungültige Rennen-ID." : parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .from("competition_races")
    .update(toRow(id, parsed.data))
    .eq("id", raceId.data)
    .eq("competition_id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return NextResponse.json({ error: "Rennen nicht gefunden." }, { status: 404 });
  return NextResponse.json(rowToCompetitionRace(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.object({ raceId: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Rennen-ID." }, { status: 400 });

  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .from("competition_races")
    .delete()
    .eq("id", parsed.data.raceId)
    .eq("competition_id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return NextResponse.json({ error: "Rennen nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
