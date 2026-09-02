import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

export async function PATCH(req: NextRequest) {
  const { currentPassword, newPassword } = (await req.json()) as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) return NextResponse.json({ error: "Aktuelles und neues Passwort erforderlich" }, { status: 400 });
  if (newPassword.length < 10) return NextResponse.json({ error: "Neues Passwort muss mindestens 10 Zeichen haben" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Re-verify the current password on a throwaway client (persistSession: false) so this check
  // never disturbs the caller's actual session — signInWithPassword is the only way Supabase
  // exposes to confirm a password without already knowing it hashed.
  const verifyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: verifyError } = await verifyClient.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: "Passwort konnte nicht geändert werden" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
