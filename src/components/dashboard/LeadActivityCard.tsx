import { Card } from "@/components/ui/Card";
import { Phone, MessageCircle, Mail } from "lucide-react";

// Handoff 02 D: this month's activity, by action, against last month.
//
// The brief calls this "the number that carries the renewal conversation",
// which is why it is written for someone who is not comfortable with
// dashboards: whole sentences, no percentages, no sparklines, and the
// comparison stated in words rather than left as an arrow to interpret.
//
// Counts come from lead_events, where a call tap, a WhatsApp tap and a form
// submission all land, so the three numbers are genuinely comparable.

export type LeadCounts = { call: number; whatsapp: number; form: number };

const ACTIONS = [
  { key: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
  { key: "call" as const, label: "Phone calls", icon: Phone },
  { key: "form" as const, label: "Messages through your form", icon: Mail },
];

function comparison(thisMonth: number, lastMonth: number): string {
  if (lastMonth === 0 && thisMonth === 0) return "Nothing yet this month.";
  if (lastMonth === 0) return "Your first month with activity.";
  if (thisMonth === lastMonth) return "The same as last month.";
  const diff = thisMonth - lastMonth;
  const word = diff > 0 ? "more" : "fewer";
  return `${Math.abs(diff)} ${word} than last month.`;
}

export function LeadActivityCard({
  thisMonth,
  lastMonth,
  hasNumber,
}: {
  thisMonth: LeadCounts;
  lastMonth: LeadCounts;
  /** Members with no number on record never see call or WhatsApp taps, so the
      card explains the zeros rather than looking broken. */
  hasNumber: boolean;
}) {
  const total = thisMonth.call + thisMonth.whatsapp + thisMonth.form;
  const lastTotal = lastMonth.call + lastMonth.whatsapp + lastMonth.form;
  const monthName = new Date().toLocaleDateString("en-ZA", { month: "long" });

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-neutral-ink">People getting in touch</h2>
        <p className="mt-1 text-sm text-neutral-muted">
          How many people reached out to you in {monthName}.
        </p>
      </div>

      <div>
        <p className="text-4xl font-extrabold text-neutral-ink">{total}</p>
        <p className="mt-1 text-sm text-neutral-muted">{comparison(total, lastTotal)}</p>
      </div>

      <div className="flex flex-col divide-y divide-neutral-border border-t border-neutral-border">
        {ACTIONS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-medium text-neutral-ink">
              <Icon size={16} className="text-brand-blue" aria-hidden />
              {label}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-neutral-ink">{thisMonth[key]}</span>
              <span className="text-xs text-neutral-muted">was {lastMonth[key]}</span>
            </span>
          </div>
        ))}
      </div>

      {!hasNumber && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your phone number is not on your page yet, so nobody can call or WhatsApp you from it. Add
          it below and both buttons appear on your page straight away.
        </p>
      )}

      <p className="text-xs text-neutral-muted">
        Each tap counts once. Somebody tapping twice by accident is not counted twice. A tap means
        somebody tried to reach you, which is not the same as a job, but it is the closest thing to
        it we can see.
      </p>
    </Card>
  );
}
