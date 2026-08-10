import { Activity as ActivityIcon, Bike, Dumbbell, Footprints, Waves } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDuration, formatDistance } from "@/lib/format";
import type { Activity } from "@/lib/types";

const ICONS: Record<string, typeof Bike> = {
  CYCLING: Bike,
  STRENGTH_TRAINING: Dumbbell,
  ROWING_V2: Waves,
  INDOOR_ROWING: Waves,
  RUNNING: Footprints,
  WALKING: Footprints,
};

export function TodayActivitiesCard({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;

  return (
    <Card title="Aktivitäten von heute">
      <div className="space-y-1">
        {activities.map((activity) => {
          const Icon = ICONS[activity.activityType] ?? ActivityIcon;
          return (
            <Link
              key={activity.activityId}
              href={`/training/${activity.activityId}`}
              className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`${activity.activityName} öffnen`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-accent">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{activity.activityName}</p>
                <p className="text-xs text-muted mt-0.5">
                  {activity.durationInSeconds ? formatDuration(activity.durationInSeconds) : "–"}
                  {activity.distanceInMeters ? ` · ${formatDistance(activity.distanceInMeters)}` : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
