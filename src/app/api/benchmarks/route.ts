import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getBenchmarks, saveBenchmarks } from "@/lib/data/store";
import type { Benchmark } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getBenchmarks());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const benchmarks = await getBenchmarks();

  const entry: Benchmark = {
    id: randomUUID(),
    name: body.name,
    kind: body.kind ?? "time",
    unit: body.unit ?? "",
    lowerIsBetter: body.lowerIsBetter ?? true,
    entries: body.firstValue
      ? [{ date: body.firstDate ?? new Date().toISOString().slice(0, 10), value: Number(body.firstValue), notes: body.firstNotes ?? "" }]
      : [],
    createdAt: new Date().toISOString().slice(0, 10),
  };

  benchmarks.push(entry);
  await saveBenchmarks(benchmarks);
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const benchmarks = (await getBenchmarks()).filter((b) => b.id !== id);
  await saveBenchmarks(benchmarks);
  return NextResponse.json({ ok: true });
}
