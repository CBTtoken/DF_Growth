import { sprintItems, getSprint, listVentures } from "@/lib/desk/queries";
import { effortLabel, type DeskItem } from "@/lib/desk/types";

// A sprint, written out as the brief a build actually starts from.
//
// This is the piece that was missing. Export is the whole picture, for
// context, and it answers "where does everything stand". A brief answers
// "build this", which is a different document with different parts: what it
// is for, what must not be touched, one section per piece of work with the
// next physical step already written, and a place for acceptance criteria
// that only he can fill in.
//
// It is written to be pasted into a fresh Claude Code session in the
// DigitalFlyer Growth folder and worked from directly.
export async function buildBrief(sprintId: string): Promise<string> {
  const [sprint, items, ventures] = await Promise.all([
    getSprint(sprintId),
    sprintItems(sprintId),
    listVentures(),
  ]);

  if (!sprint) return "";

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push(`# ${sprint.name}`);
  lines.push("");
  lines.push(`Sprint brief from The Desk, ${today}. ${items.length} pieces of work.`);
  lines.push("");

  lines.push("## What this is for");
  lines.push("");
  lines.push(sprint.goal?.trim() || "_Not written yet. Say what this sprint is for before starting._");
  lines.push("");

  if (sprint.context?.trim()) {
    lines.push("## What you need to know");
    lines.push("");
    lines.push(sprint.context.trim());
    lines.push("");
  }

  const byVenture = new Map<string, DeskItem[]>();
  for (const item of items) {
    const key = item.venture?.trim() || "Unfiled";
    byVenture.set(key, [...(byVenture.get(key) ?? []), item]);
  }

  lines.push("## The work");

  for (const venture of [...byVenture.keys()].sort()) {
    const endState = ventures.find((v) => v.name === venture)?.end_state;

    lines.push("");
    lines.push(`### ${venture}`);
    if (endState) {
      lines.push("");
      lines.push(`Where this venture is going: ${endState}`);
    }

    for (const item of byVenture.get(venture)!) {
      lines.push("");
      lines.push(`**${item.title.replace(/\n+/g, " ")}**`);
      if (item.next_action) lines.push(`- Next physical step: ${item.next_action}`);
      if (item.notes) lines.push(`- Notes: ${item.notes}`);
      lines.push(`- Effort: ${effortLabel(item.effort)}`);
      if (item.due_date) lines.push(`- Due: ${item.due_date}`);
      // The steps he wrote on the item, ticks included, so one task carrying
      // five questions arrives as one task carrying five questions.
      for (const step of item.checklist ?? []) {
        lines.push(`- [${step.done ? "x" : " "}] ${step.text}`);
      }
    }
  }

  lines.push("");
  lines.push("## Acceptance criteria");
  lines.push("");
  lines.push("_Yours to write. One line per thing that has to be true before this is finished._");
  lines.push("");
  lines.push("## House rules for this codebase");
  lines.push("");
  lines.push("- Read the project's CLAUDE.md before building.");
  lines.push("- No em dashes anywhere a person can read them.");
  lines.push("- Verify against the live site by fetching it, not by reading the code.");
  lines.push("- Ask before touching anything outside the scope above.");
  lines.push("");

  return lines.join("\n");
}
