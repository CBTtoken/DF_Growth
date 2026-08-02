import { listAssets, listItems } from "@/lib/desk/queries";
import { daysLabel, STREAMS, type DeskAsset, type DeskItem } from "@/lib/desk/types";

// The bridge between this database and every Claude session the operator
// works in, none of which can see it. Plain markdown, tight enough to paste
// into a chat without eating the context window.

function rand(value: number): string {
  return `R${value.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function ventureOf(item: DeskItem): string {
  return item.venture?.trim() || "Unfiled";
}

function assetTotals(assets: DeskAsset[]) {
  const active = assets.filter((a) => a.status !== "cancel");
  const sum = (rows: DeskAsset[]) =>
    rows.reduce((total, a) => total + Number(a.cost_zar_monthly ?? 0), 0);

  return {
    business: sum(active.filter((a) => a.area === "business")),
    personal: sum(active.filter((a) => a.area === "personal")),
    total: sum(active),
    unpriced: active.filter((a) => a.cost_zar_monthly === null).length,
    count: active.length,
  };
}

export async function buildExport(): Promise<string> {
  const [items, assets] = await Promise.all([listItems(), listAssets()]);

  const open = items.filter((i) => i.status === "open" && i.blocked_by === "me");
  const waiting = items.filter((i) => i.status === "open" && i.blocked_by !== "me");
  const parked = items.filter((i) => i.status === "parked");
  const totals = assetTotals(assets);

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push(`# The Desk, ${today}`);
  lines.push("");
  lines.push(
    `${open.length} open on me, ${waiting.length} waiting on someone else, ${parked.length} parked.`
  );
  lines.push("");

  lines.push("## Open");
  if (open.length === 0) {
    lines.push("Nothing open.");
  } else {
    // Stream first, so anyone reading this can see at once how much of it is
    // his own work and how much belongs to somebody else.
    for (const stream of STREAMS) {
      const inStream = open.filter((item) => item.stream === stream.key);
      if (inStream.length === 0) continue;

      lines.push("");
      lines.push(`### ${stream.label} (${inStream.length})`);

      const byVenture = new Map<string, DeskItem[]>();
      for (const item of inStream) {
        const key = ventureOf(item);
        byVenture.set(key, [...(byVenture.get(key) ?? []), item]);
      }

      for (const venture of [...byVenture.keys()].sort()) {
        lines.push("");
        lines.push(`#### ${venture}`);
        for (const item of byVenture.get(venture)!) {
          const bits: string[] = [item.effort];
          if (item.due_date) bits.push(`due ${item.due_date}`);
          if (item.area === "personal") bits.push("personal");
          lines.push(`- ${item.title.replace(/\n+/g, " ")} (${bits.join(", ")})`);
          if (item.next_action) lines.push(`  next: ${item.next_action}`);
        }
      }
    }
  }
  lines.push("");

  lines.push("## Waiting on");
  if (waiting.length === 0) {
    lines.push("Nothing waiting.");
  } else {
    const byPerson = new Map<string, DeskItem[]>();
    for (const item of waiting) {
      byPerson.set(item.blocked_by, [...(byPerson.get(item.blocked_by) ?? []), item]);
    }
    for (const person of [...byPerson.keys()].sort()) {
      lines.push("");
      lines.push(`### ${person}`);
      for (const item of byPerson.get(person)!) {
        lines.push(`- ${item.title} (waiting ${daysLabel(item.blocked_since)})`);
      }
    }
  }
  lines.push("");

  lines.push("## Parked");
  if (parked.length === 0) {
    lines.push("Nothing parked.");
  } else {
    for (const item of parked) {
      lines.push(`- ${item.title}`);
      lines.push(`  trigger: ${item.park_trigger ?? "none recorded"}`);
    }
  }
  lines.push("");

  lines.push("## Register");
  lines.push(
    `${totals.count} active records. Business ${rand(totals.business)} a month, personal ${rand(
      totals.personal
    )}, total ${rand(totals.total)}.`
  );
  if (totals.unpriced > 0) {
    lines.push(`${totals.unpriced} of those have no cost captured yet, so the total is a floor.`);
  }

  const soon = assets
    .filter((a) => {
      if (!a.renewal_date) return false;
      const days = Math.floor(
        (new Date(`${a.renewal_date}T00:00:00Z`).getTime() - Date.now()) / 86_400_000
      );
      return days <= 30;
    })
    .sort((a, b) => (a.renewal_date! < b.renewal_date! ? -1 : 1));

  if (soon.length > 0) {
    lines.push("");
    lines.push("Renewing inside 30 days:");
    for (const asset of soon) {
      lines.push(`- ${asset.name}, ${asset.renewal_date}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
