import Link from "next/link";
import { DumpForm } from "@/components/desk/DumpForm";
import { SortPanel } from "@/components/desk/SortPanel";

// Screen 1, and the home screen. Capture is the thing that has to be
// frictionless, so it is what opens.
export const dynamic = "force-dynamic";

export default function DeskDumpPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-5">
      <DumpForm />
      <SortPanel />
      <Link href="/desk/all" className="text-xs text-neutral-400 underline">
        Everything, to edit
      </Link>
    </div>
  );
}
