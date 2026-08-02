import { buildExport } from "@/lib/desk/export";
import { CopyBlock } from "@/components/desk/CopyBlock";
import { Screen } from "@/components/desk/Shell";

// The bridge to every Claude session that cannot see this database. Plain
// markdown, one button, nothing else.
export const dynamic = "force-dynamic";

export default async function DeskExportPage() {
  const markdown = await buildExport();

  return (
    <Screen
      title="Export"
      subtitle="The whole state as plain text, to paste into any chat."
      back={{ href: "/desk/more", label: "More" }}
    >
      <CopyBlock text={markdown} />
      <p className="text-xs text-neutral-400">
        The same text is at /desk/export/raw, behind this same login, if fetching it is easier than
        copying it.
      </p>
    </Screen>
  );
}
