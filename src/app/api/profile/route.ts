import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/data/store";
import type { Profile, ProfileFieldName } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getProfile());
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Partial<Profile> & { adoptImported?: ProfileFieldName };
  const current = await getProfile();
  const masterData =
    (current.settings.athleteDataMasterData as Record<string, unknown> | undefined) ?? {};
  const selectedSources = {
    ...((masterData.selectedSources as Profile["fieldSources"] | undefined) ?? {}),
  };
  const patch: Partial<Profile> = { ...body };
  delete (patch as { adoptImported?: ProfileFieldName }).adoptImported;

  if (body.adoptImported) {
    const imported = current.importedValues[body.adoptImported];
    if (!imported) return NextResponse.json({ error: "Kein importierter Wert vorhanden" }, { status: 400 });
    if (body.adoptImported !== "ftpWatts") patch[body.adoptImported] = imported.value;
    selectedSources[body.adoptImported] = "Garmin / AthleteData";
  }

  for (const field of ["weightKg", "hrRest", "hrMax", "vo2max"] as const) {
    if (body[field] !== undefined) selectedSources[field] = "manual";
  }
  patch.settings = {
    ...current.settings,
    ...(body.settings ?? {}),
    athleteDataMasterData: { ...masterData, selectedSources },
  };
  return NextResponse.json(await updateProfile(patch));
}
