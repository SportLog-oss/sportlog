import { getActivities } from "@/lib/data/store";
import { TrainingDetailTabs } from "@/components/training/TrainingDetailTabs";
import { activityLabel, formatDate } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { activities } = await getActivities();
  const activity = activities.find((item) => String(item.activityId) === id);
  if (!activity) notFound();

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <Link href="/training" className="flex items-center gap-1.5 text-xs text-muted hover:text-accent mb-2">
          <ArrowLeft size={13} /> Zurück zu Training
        </Link>
        <h1 className="text-xl font-semibold">{activity.activityName}</h1>
        <p className="text-sm text-muted mt-0.5">{activityLabel(activity.activityType)} · {formatDate(activity.startTimeInSeconds)}</p>
      </header>
      <div className="p-8 space-y-6">
        <TrainingDetailTabs activity={activity} />
      </div>
    </div>
  );
}
