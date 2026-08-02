import { listIdeas } from "@/lib/desk/queries";
import { IdeaBoard } from "@/components/desk/IdeaBoard";
import { Screen } from "@/components/desk/Shell";

// The room with no clock in it.
export const dynamic = "force-dynamic";

export default async function DeskThinkPage() {
  const ideas = await listIdeas();

  return (
    <Screen
      title="Think"
      subtitle="Ideas, not tasks. Nothing here is counted, chased or scored."
    >
      <IdeaBoard ideas={ideas} />
    </Screen>
  );
}
