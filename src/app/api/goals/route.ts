import { NextRequest, NextResponse } from "next/server";
import { getGoals, saveGoals } from "@/lib/data/store";
import type { Goal } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getGoals());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const goals = await getGoals();

  const newGoal: Goal = {
    id: `goal-${Date.now()}`,
    title: body.title,
    category: body.category ?? "sonstiges",
    targetDate: body.targetDate,
    metricLabel: body.metricLabel ?? "",
    targetValue: body.targetValue ?? null,
    unit: body.unit ?? "",
    currentValue: body.currentValue ?? null,
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
