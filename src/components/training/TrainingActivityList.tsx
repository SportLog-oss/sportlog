"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity as ActivityIcon, Bike, ChevronDown, ChevronRight, Dumbbell, Footprints, Waves } from "lucide-react";
import { activityLabel, formatActivityPace, formatDate, formatDistance, formatDuration } from "@/lib/format";
import type { Activity } from "@/lib/types";

const PAGE_SIZE = 10;
const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "ROWING", label: "Rudern" },
  { value: "STRENGTH_TRAINING", label: "Kraft" },
  { value: "CYCLING", label: "Rad" },
  { value: "RUNNING", label: "Laufen" },
] as const;

function matchesFilter(activity: Activity, filter: string) {
  if (filter === "all") return true;
  if (filter === "ROWING") return activity.activityType === "ROWING_V2" || activity.activityType === "INDOOR_ROWING";
  return activity.activityType === filter;
}

function ActivityIconFor({ type }: { type: string }) {
  const className = "text-accent";
  if (type === "CYCLING") return <Bike size={17} className={className} />;
  if (type === "STRENGTH_TRAINING") return <Dumbbell size={17} className={className} />;
  if (type === "ROWING_V2" || type === "INDOOR_ROWING") return <Waves size={17} className={className} />;
  if (type === "RUNNING" || type === "WALKING") return <Footprints size={17} className={className} />;
  return <ActivityIcon size={17} className={className} />;
}

export function TrainingActivityList({ activities }: { activities: Activity[] }) {
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const filtered = useMemo(() => activities.filter((activity) => matchesFilter(activity, filter)), [activities, filter]);
  const visible = filtered.slice(0, visibleCount);

  function selectFilter(nextFilter: string) {
    setFilter(nextFilter);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            onClick={() => selectFilter(item.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              filter === item.value
                ? "border-accent/60 bg-accent-soft text-accent"
                : "border-border text-muted hover:border-accent/30 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map((activity) => {
          const pace = formatActivityPace(activity);
          return (
            <Link
              key={activity.activityId}
              href={`/training/${activity.activityId}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/50 hover:bg-surface-raised"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                <ActivityIconFor type={activity.activityType} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{activity.activityName}</span>
                  <span className="shrink-0 text-xs text-muted">{activityLabel(activity.activityType)}</span>
                </div>
                <span className="text-xs text-muted">{formatDate(activity.startTimeInSeconds)}</span>
              </div>
              <div className="hidden shrink-0 items-center gap-6 text-sm sm:flex">
                <span className="w-16 text-right text-muted">{formatDuration(activity.durationInSeconds)}</span>
                <span className="w-16 text-right text-muted">{formatDistance(activity.distanceInMeters)}</span>
                {pace && <span className="w-20 text-right text-muted">{pace}</span>}
                <span className="w-20 text-right text-muted">
                  {activity.averageHeartRateInBeatsPerMinute ? `Ø ${activity.averageHeartRateInBeatsPerMinute} bpm` : "–"}
                </span>
                <span className="w-16 text-right text-muted">{activity.activeKilocalories} kcal</span>
                <ChevronRight size={17} className="text-muted" />
              </div>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          Keine Einheiten für diesen Filter.
        </div>
      )}

      {visibleCount < filtered.length && (
        <button
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          className="mx-auto flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          Weitere Einheiten laden
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
