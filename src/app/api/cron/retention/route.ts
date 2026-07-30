import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRetentionReport } from "@/lib/retention/policy";

// The daily retention job. It reports and it stops.
//
// It deletes nothing, ever. Deletion is a button on /admin/retention with a
// person's name against it, which is Dewald's standing preference for
// deletion runs on this project and, separately, the right posture for a
// job that can remove a paying member's entire history.
//
// What this does buy is the thing POPIA actually asks for: evidence that
// the policy is live and looked at. Every run writes a row to
// retention_runs, so the answer to "how do you know your retention policy
// works" is a table rather than an assurance.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await buildRetentionReport();
  const summary = {
    growthClientsDue: report.growthClients.length,
    growthClientsUnknownDate: report.growthClientsUnknownDate.length,
    publicIdentitiesDue: report.publicIdentities.length,
    katisoBizProtectedDocuments: report.protectedKatisoBiz.documents,
  };

  const admin = createAdminClient();
  await admin.from("retention_runs").insert({ mode: "report", actor: "cron", summary });

  return NextResponse.json({ ran: true, ...summary });
}
