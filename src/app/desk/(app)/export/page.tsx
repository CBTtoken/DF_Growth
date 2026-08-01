import { buildExport } from "@/lib/desk/export";
import { CopyBlock } from "@/components/desk/CopyBlock";

// The bridge to every Claude session that cannot see this database. Plain
// markdown, one button, nothing else.
export const dynamic = "force-dynamic";

export default async function DeskExportPage() {
  const markdown = await buildExport();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-5">
      <CopyBlock text={markdown} />
      <p className="text-xs text-neutral-400">
        The same text is at /desk/export/raw, behind this same login, if fetching it is easier than
        copying it.
      </p>
    </div>
  );
}
