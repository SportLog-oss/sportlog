import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForRequest } from "@/lib/data/supabaseClient";
import { updateProfile } from "@/lib/data/store";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseForRequest();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Keine Datei erhalten" }, { status: 400 });
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Nur JPG oder PNG erlaubt" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Datei zu groß (max. 5 MB)" }, { status: 400 });

  const path = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });

  // Overwriting with a different extension than last time would otherwise leave the old file behind.
  const staleExt = ext === "jpg" ? "png" : "jpg";
  await supabase.storage.from("avatars").remove([`${user.id}/avatar.${staleExt}`]);

  return NextResponse.json(await updateProfile({ avatarPath: path }));
}

export async function DELETE() {
  const supabase = await getSupabaseForRequest();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`]);
  return NextResponse.json(await updateProfile({ avatarPath: null }));
}
