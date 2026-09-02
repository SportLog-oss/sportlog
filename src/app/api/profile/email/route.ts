import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  if (!email?.trim()) return NextResponse.json({ error: "E-Mail-Adresse erforderlich" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) return NextResponse.json({ error: "E-Mail-Änderung fehlgeschlagen" }, { status: 400 });

  // Supabase requires clicking a confirmation link before the change takes effect — never
  // report success as if the address changed immediately.
  return NextResponse.json({ pendingConfirmation: true });
}
