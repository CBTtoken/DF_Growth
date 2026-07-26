import { stripEmDashes } from "@/lib/text";
import type { AgentService } from "@/lib/agent-page/data";
import type { z } from "zod";
import type { agentPageContentSchema } from "@/lib/schemas/agents";

// Agent page v3. The agent's own page content is editable from two places,
// the admin view and the agent's own dashboard, so the mapping from form
// fields to a database update lives here once. Two copies would be two
// chances for the admin and the agent to write subtly different rows.

// Build spec 1.7: same shape as growth_clients.packages, deliberately not a
// parallel model. v3 stopped displaying the price on the page (services
// render as pills now) but the field stays in the data, because "we do not
// show it today" and "throw the agent's data away" are different decisions.
export function readServices(formData: FormData): AgentService[] {
  const services: AgentService[] = [];
  for (let i = 0; i < 3; i++) {
    const name = String(formData.get(`serviceName${i}`) ?? "").trim();
    if (!name) continue;
    const type = String(formData.get(`serviceType${i}`) ?? "package");
    services.push({
      name: stripEmDashes(name).slice(0, 80),
      price: stripEmDashes(String(formData.get(`servicePrice${i}`) ?? "").trim()).slice(0, 40),
      description: stripEmDashes(String(formData.get(`serviceDescription${i}`) ?? "").trim()).slice(0, 300),
      type: type === "special" || type === "discount" ? type : "package",
    });
  }
  return services;
}

// Empty stays empty rather than becoming an empty string, because the page
// checks these for null to decide whether a block renders at all, and an
// empty string would render an empty block instead of the designed
// fallback.
//
// stripEmDashes on write is the same backstop the rest of the codebase
// uses. It matters more for a hand-typed bio, not less: typed copy is
// usually pasted from somewhere, and pasted copy is where em dashes come
// from.
export function agentContentUpdate(
  values: z.infer<typeof agentPageContentSchema>,
  formData: FormData
): Record<string, unknown> {
  return {
    page_theme: values.pageTheme,
    town: values.town || null,
    // Empty string, not null. agents.whatsapp_number was NOT NULL from the
    // original application form, where it was a required question, so
    // writing null threw a 23502 the moment an agent cleared the box.
    // The Phase 3 migration drops that constraint, but this deliberately
    // still writes an empty string so the code does not depend on which of
    // the two shipped first. Empty reads as absent everywhere: agentContact
    // falls through to email when there is no dialable number.
    whatsapp_number: values.whatsappNumber ?? "",
    bio: values.bio ? stripEmDashes(values.bio) : null,
    services: readServices(formData),
  };
}

export function readContentFields(formData: FormData) {
  return {
    pageTheme: formData.get("pageTheme"),
    town: formData.get("town"),
    whatsappNumber: formData.get("whatsappNumber"),
    bio: formData.get("bio"),
  };
}
