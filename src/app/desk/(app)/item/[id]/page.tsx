import { notFound } from "next/navigation";
import { getItem } from "@/lib/desk/queries";
import { ItemForm } from "@/components/desk/ItemForm";

// Every field editable, because the seed data was extracted from the
// operator's own written record and he will correct it.
export const dynamic = "force-dynamic";

export default async function DeskItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl p-5">
      <ItemForm item={item} />
    </div>
  );
}
