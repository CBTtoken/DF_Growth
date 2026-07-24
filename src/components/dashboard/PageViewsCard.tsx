import { Card } from "@/components/ui/Card";
// Consolidated Sprint Sec 3.4: "a simple count, ideally a basic trend" —
// bucketing happens here (client-render-time, on data already fetched by
// the dashboard's own Promise.all) rather than a database query, simple
// enough at this volume and avoids a second round-trip.
export function PageViewsCard({
  totalViews,
  recentViews,
}: {
  totalViews: number;
  recentViews: { viewed_at: string }[];
}) {
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const count = recentViews.filter((v) => {
      const viewedAt = new Date(v.viewed_at);
      return viewedAt >= date && viewedAt < nextDate;
    }).length;
    days.push({ label: date.toLocaleDateString("en-ZA", { weekday: "short" }), count });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const last7DaysTotal = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-ink">Page views</h2>
        <p className="text-xs text-gray-400">{last7DaysTotal} in the last 7 days</p>
      </div>
      <p className="text-3xl font-bold tracking-tight text-ink">{totalViews.toLocaleString()}</p>
      <div className="flex items-end justify-between gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-sm bg-brand/20"
              style={{ height: `${Math.max(4, (d.count / maxCount) * 48)}px` }}
              title={`${d.count} views`}
            />
            <span className="text-[10px] uppercase text-gray-400">{d.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
