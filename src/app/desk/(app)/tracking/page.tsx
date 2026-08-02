import { buildExport } from "@/lib/desk/export";
import { CopyBlock } from "@/components/desk/CopyBlock";
import { Screen } from "@/components/desk/Shell";

// Business tracking. The whole picture, as text.
//
// Renamed from Export on Dewald's note, and the name matters because the old
// one was being mistaken for a way to send work out. It is the opposite: it
// is what he and a business agent read to touch base on where everything
// stands. Sending work to CC is what Sprints are for.
export const dynamic = "force-dynamic";

export default async function DeskTrackingPage() {
  const markdown = await buildExport();

  return (
    <Screen
      title="Business tracking"
      subtitle="Where everything stands, as plain text. Paste it into any chat to bring it up to speed."
      back={{ href: "/desk/more", label: "More" }}
    >
      <CopyBlock text={markdown} />
      <p className="text-xs leading-relaxed text-neutral-400">
        This is context, not an instruction. To hand a piece of work to CC, put it in a sprint:
        that produces a brief with a goal and acceptance criteria. The same text as this page is at
        /desk/tracking/raw, behind this login, if fetching it is easier than copying it.
      </p>
    </Screen>
  );
}
