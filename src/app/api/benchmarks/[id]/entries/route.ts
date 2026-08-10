import { NextResponse } from "next/server";
import { getBenchmarks, saveBenchmarks } from "@/lib/data/store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const benchmarks = await getBenchmarks();
  const idx = benchmarks.findIndex((b) => b.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  benchmarks[idx].entries.push({
    date: body.date ?? new Date().toISOString().slice(0, 10),
    value: Number(body.value),
    notes: body.notes ?? "",
  });
  benchmarks[idx].entries.sort((a, b) => a.date.localeCompare(b.date));

  await saveBenchmarks(benchmarks);
  return NextResponse.json(benchmarks[idx]);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const benchmarks = await getBenchmarks();
  const benchmarkIndex = benchmarks.findIndex((benchmark) => benchmark.id === id);
  if (benchmarkIndex === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  const entryIndex = Number(body.entryIndex);
  if (!Number.isInteger(entryIndex) || !benchmarks[benchmarkIndex].entries[entryIndex]) {
    return NextResponse.json({ error: "entry not found" }, { status: 404 });
  }
  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0 || typeof body.date !== "string" || !body.date) {
    return NextResponse.json({ error: "invalid entry" }, { status: 400 });
  }

  benchmarks[benchmarkIndex].entries[entryIndex] = {
    ...benchmarks[benchmarkIndex].entries[entryIndex],
    date: body.date,
    value,
    notes: typeof body.notes === "string" ? body.notes : benchmarks[benchmarkIndex].entries[entryIndex].notes,
  };
  benchmarks[benchmarkIndex].entries.sort((a, b) => a.date.localeCompare(b.date));
  await saveBenchmarks(benchmarks);
  return NextResponse.json(benchmarks[benchmarkIndex]);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const benchmarks = await getBenchmarks();
  const benchmarkIndex = benchmarks.findIndex((benchmark) => benchmark.id === id);
  if (benchmarkIndex === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  const entryIndex = Number(body.entryIndex);
  if (!Number.isInteger(entryIndex) || !benchmarks[benchmarkIndex].entries[entryIndex]) {
    return NextResponse.json({ error: "entry not found" }, { status: 404 });
  }
  benchmarks[benchmarkIndex].entries.splice(entryIndex, 1);
  await saveBenchmarks(benchmarks);
  return NextResponse.json(benchmarks[benchmarkIndex]);
}
