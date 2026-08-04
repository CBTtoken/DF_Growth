import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { untriagedItems } from "@/lib/desk/queries";
import { DumpForm } from "@/components/desk/DumpForm";
import { SortPanel } from "@/components/desk/SortPanel";
import { Screen } from "@/components/desk/Shell";

// Screen 1, and the home screen. Capture is the thing that has to be
// frictionless, so it is what opens.
export const dynamic = "force-dynamic";

export default async function DeskDumpPage() {
  // One quiet sentence, on this screen only, so the pile never grows in
  // silence. Not a badge and not on the nav; that rule stands.
  const untriaged = (await untriagedItems()).length;

  return (
    <Screen>
      <DumpForm />

      {/* The other kind of thing that arrives in your head. Put here rather
          than only in the nav, because this is the screen you are already on
          when an idea turns up. */}
      <Link
        href="/desk/think"
        className="flex items-center gap-2 rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500"
      >
        <Lightbulb size={16} />
        Not a task, just an idea? Put it in Think.
      </Link>

      {untriaged > 0 ? (
        <p className="text-sm text-neutral-500">
          {untriaged} {untriaged === 1 ? "capture has" : "captures have"} no next step yet. Sort
          fills them in below; you stay the one who accepts.
        </p>
      ) : null}

      <SortPanel />
    </Screen>
  );
}
