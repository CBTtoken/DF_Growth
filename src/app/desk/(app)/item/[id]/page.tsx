import { notFound } from "next/navigation";
import { getItem, listSprints } from "@/lib/desk/queries";
import { ItemForm } from "@/components/desk/ItemForm";
import { ItemSprint } from "@/components/desk/ItemSprint";
import { Screen } from "@/components/desk/Shell";

// Every field editable, because the seeded items were an extraction of his
// own written record and he will correct them.
export const dynamic = "force-dynamic";

export default async function DeskItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, sprints] = await Promise.all([getItem(id), listSprints()]);
  if (!item) notFound();

  return (
    <Screen back={{ href: "/desk/map", label: "Back" }}>
      <ItemForm item={item} />
      <ItemSprint itemId={item.id} sprintId={item.sprint_id} sprints={sprints} />
    </Screen>
  );
}
