/** Shared Z1-Z5 Herzfrequenz-Zonenfarben (Teil 6: einheitliche Teal-Farbwelt statt der
 * vorherigen Blau/Grün/Gelb/Orange/Rot-Skala) — ein monotoner Verlauf von gedämpftem
 * Teal bei niedriger Intensität zu hellem, leuchtendem Türkis bei maximaler Intensität,
 * damit die Zonenfarbe selbst schon die steigende Belastung ausdrückt. Verwendet sowohl
 * in HrZonesChart (Trainingsseite, "Intensitätsverteilung") als auch in ActivityHrZones
 * (Zonenaufschlüsselung je Aktivität), damit beide immer identisch aussehen. */
export const HR_ZONE_COLORS: Record<"z1" | "z2" | "z3" | "z4" | "z5", string> = {
  z1: "#3a5a58",
  z2: "#2f7d74",
  z3: "#1fa89a",
  z4: "#25d8cf",
  z5: "#8ffbef",
};
