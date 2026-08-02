import { listNotes } from "@/lib/desk/queries";
import { GoAwayDoc } from "@/components/desk/GoAwayDoc";
import { Screen } from "@/components/desk/Shell";

export const dynamic = "force-dynamic";

export default async function DeskGoAwayPage() {
  const notes = await listNotes();

  return (
    <Screen
      title="If I go away"
      subtitle="What your family would need to know, in your words."
      back={{ href: "/desk/more", label: "More" }}
    >
      <GoAwayDoc notes={notes} />
    </Screen>
  );
}
