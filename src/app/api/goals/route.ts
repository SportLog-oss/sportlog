import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGoals, saveGoals } from "@/lib/data/store";
import type { Goal } from "@/lib/types";
import { getSupabaseForRequest } from "@/lib/data/supabaseClient";

export async function GET() {
  const goals = await getGoals();
  const linkedKinds = [...new Set(goals.map((goal) => goal.performanceKind).filter(Boolean))] as string[];

  if (linkedKinds.length === 0) {
    return NextResponse.json(goals.map((goal) => ({
      ...goal,
      currentValueSource: goal.currentValue === null ? null : "manual",
    })));
  }

  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .from("performance_bests")
    .select("kind,value,occurred_at")
    .in("kind", linkedKinds);

  if (error) {
    return NextResponse.json({ error: "Ziele konnten nicht mit Bestleistungen verbunden werden." }, { status: 500 });
  }

  const bestByKind = new Map((data ?? []).map((best) => [best.kind, best]));
  return NextResponse.json(goals.map((goal) => {
    const best = goal.performanceKind ? bestByKind.get(goal.performanceKind) : undefined;
    return {
      ...goal,
      currentValue: best ? Number(best.value) : goal.currentValue,
      currentValueSource: best ? "performance_best" : goal.currentValue === null ? null : "manual",
      linkedPerformanceDate: best?.occurred_at ?? null,
    };
  }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const goals = await getGoals();

  const newGoal: Goal = {
    id: randomUUID(),
    title: body.title,
    category: body.category ?? "sonstiges",
    targetDate: body.targetDate,
    metricLabel: body.metricLabel ?? "",
    targetValue: body.targetValue ?? null,
    unit: body.unit ?? "",
    currentValue: body.currentValue ?? null,
    performanceKind: body.performanceKind ?? null,
    notes: body.notes ?? "",
    achieved: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  goals.push(newGoal);
  await saveGoals(goals);
  return NextResponse.json(newGoal, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const goals = await getGoals();
  const idx = goals.findIndex((g) => g.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  goals[idx] = { ...goals[idx], ...body };
  await saveGoals(goals);
  return NextResponse.json(goals[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const goals = (await getGoals()).filter((g) => g.id !== id);
  await saveGoals(goals);
  return NextResponse.json({ ok: true });
}
