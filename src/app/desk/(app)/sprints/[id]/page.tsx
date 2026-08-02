import { notFound } from "next/navigation";
import { buildBrief } from "@/lib/desk/brief";
import { getSprint, sprintCandidates, sprintItems } from "@/lib/desk/queries";
import { SprintEditor } from "@/components/desk/SprintEditor";
import { Screen } from "@/components/desk/Shell";

export const dynamic = "force-dynamic";

export default async function DeskSprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [sprint, inSprint, candidates, brief] = await Promise.all([
    getSprint(id),
    sprintItems(id),
    sprintCandidates(),
    buildBrief(id),
  ]);

  if (!sprint) notFound();

  return (
    <Screen title={sprint.name} back={{ href: "/desk/sprints", label: "Sprints" }}>
      <SprintEditor sprint={sprint} inSprint={inSprint} candidates={candidates} brief={brief} />
    </Screen>
  );
}
