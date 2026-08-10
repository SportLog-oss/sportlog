import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  const supabase = token
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : await createSupabaseServerClient();
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  return NextResponse.json({ ok: !!user }, { status: user ? 200 : 401 });
}
