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
