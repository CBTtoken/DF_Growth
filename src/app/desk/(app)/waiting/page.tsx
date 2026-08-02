import { listItems } from "@/lib/desk/queries";
import { WaitingList } from "@/components/desk/WaitingList";
import { Screen } from "@/components/desk/Shell";

// Screen 3. Everything that is not yours to move right now.
export const dynamic = "force-dynamic";

export default async function DeskWaitingPage() {
  const items = await listItems({ status: "open", blockedByMe: false });

  return (
    <Screen title="Waiting on" subtitle="Grouped by who has it, longest wait first.">
      <WaitingList items={items} />
    </Screen>
  );
}
