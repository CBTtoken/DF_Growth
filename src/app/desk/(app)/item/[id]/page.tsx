import { notFound } from "next/navigation";
import { getItem, listSprints, listVentures } from "@/lib/desk/queries";
import { ItemChecklist } from "@/components/desk/ItemChecklist";
import { ItemForm } from "@/components/desk/ItemForm";
import { ItemSprint } from "@/components/desk/ItemSprint";
import { Screen } from "@/components/desk/Shell";

// Every field editable, because the seeded items were an extraction of his
// own written record and he will correct them.
export const dynamic = "force-dynamic";

export default async function DeskItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, sprints, ventures] = await Promise.all([getItem(id), listSprints(), listVentures()]);
  if (!item) notFound();

  return (
    <Screen back={{ href: "/desk/map", label: "Back" }}>
      {/* Filing first: where it belongs and whether it is a build for CC is
          the decision he kept not finding when it sat under the form. */}
      <ItemSprint itemId={item.id} sprintId={item.sprint_id} sprints={sprints} />
      <ItemChecklist itemId={item.id} checklist={item.checklist ?? []} />
      <ItemForm item={item} ventures={ventures.map((v) => v.name)} />
    </Screen>
  );
}
