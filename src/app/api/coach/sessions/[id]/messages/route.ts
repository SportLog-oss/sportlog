import { NextResponse } from "next/server";
import { getChatMessages } from "@/lib/data/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const messages = await getChatMessages(id);
  return NextResponse.json(messages);
}
