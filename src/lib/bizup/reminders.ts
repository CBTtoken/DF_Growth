import { formatZar } from "./money";

// The message a member sends to chase an overdue invoice.
//
// Written to be sendable as-is by someone who is uncomfortable asking for
// money, which is most people. That is the actual product problem here:
// members know who owes them, and do not chase, because writing the message
// is awkward. So it is polite, specific, short, and it ends with a way for
// the customer to act rather than a demand.
//
// Deliberately never accusatory and never escalating with the reminder
// count. A member who wants to be firmer can edit it in WhatsApp before
// pressing send, and a tool that automatically hardens its tone on a
// customer relationship it does not own would be overstepping.

export interface ReminderInput {
  customerName: string | null;
  businessName: string;
  number: string;
  outstandingCents: number;
  dueDate: string | null;
  publicUrl: string;
}

export function reminderMessage(input: ReminderInput): string {
  const greeting = input.customerName ? `Good day ${input.customerName},` : "Good day,";

  const due = input.dueDate ? ` It was due on ${input.dueDate}.` : "";

  return [
    greeting,
    "",
    `Just a friendly reminder about invoice ${input.number} for ${formatZar(input.outstandingCents)}.${due}`,
    "",
    `You can see it here: ${input.publicUrl}`,
    "",
    "If you have already paid, please ignore this and thank you. If anything is not clear, please let me know.",
    "",
    input.businessName,
  ].join("\n");
}

/**
 * How overdue an invoice is, in whole days. Negative means not yet due.
 */
export function daysOverdue(dueDate: string | null, today: string): number {
  if (!dueDate) return 0;
  return Math.floor((Date.parse(today) - Date.parse(dueDate)) / 86400000);
}

/**
 * Plain words for how overdue something is. "31 days" means nothing at a
 * glance; "a month overdue" does.
 */
export function overdueLabel(days: number): string {
  if (days <= 0) return "Not due yet";
  if (days === 1) return "1 day overdue";
  if (days < 14) return `${days} days overdue`;
  if (days < 60) return `${Math.floor(days / 7)} weeks overdue`;
  return `${Math.floor(days / 30)} months overdue`;
}

/**
 * Whether to discourage another reminder right now.
 *
 * A member chasing the same customer twice in one morning is the thing
 * most likely to cost them the relationship, so the button stays available
 * but says when they last did it.
 */
export function remindedRecently(lastRemindedAt: string | null, now: number): boolean {
  if (!lastRemindedAt) return false;
  return now - new Date(lastRemindedAt).getTime() < 3 * 24 * 60 * 60 * 1000;
}

export function remindedAgoLabel(lastRemindedAt: string | null, now: number): string | null {
  if (!lastRemindedAt) return null;
  const days = Math.floor((now - new Date(lastRemindedAt).getTime()) / 86400000);
  if (days <= 0) return "Reminded today";
  if (days === 1) return "Reminded yesterday";
  return `Reminded ${days} days ago`;
}
