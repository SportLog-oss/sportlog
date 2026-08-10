import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
