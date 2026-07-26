import { stripEmDashes } from "@/lib/text";
import type { AgentService } from "@/lib/agent-page/data";
import type { z } from "zod";
import type { agentPageContentSchema } from "@/lib/schemas/agents";

// Agent Programme Phase 1. The agent's own page content is now editable
// from two places, the admin view and the agent's own dashboard, so the
// mapping from form fields to a database update lives here once. Two
// copies of this would be two chances for the admin and the agent to write
// subtly different rows.

// Sec 1.7: three services, same shape as growth_clients.packages. Read out
// of flat indexed form fields rather than a JSON textarea, so the form
// stays a form for someone who has never seen JSON.
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

// Empty stays empty rather than becoming an empty string: the page checks
// these for null to decide whether a section renders at all, and an empty
// string would render an empty section instead of hiding it.
//
// stripEmDashes on write is the same backstop the AI copy path uses. It
// matters more here, not less: hand-typed copy is usually pasted from
// somewhere, and pasted copy is where em dashes actually come from.
export function agentContentUpdate(
  values: z.infer<typeof agentPageContentSchema>,
  formData: FormData
): Record<string, unknown> {
  return {
    accent_color: values.accentColor,
    town: values.town || null,
    // Empty string, not null: agents.whatsapp_number is NOT NULL from the
    // original application form, where it was a required question. Writing
    // null here fails with a 23502 the moment an agent clears the box,
    // which is a legitimate thing to do now that this doubles as the
    // public contact number (Natasha's application literally carried the
    // text "Not provided"). Empty reads as absent everywhere that matters:
    // agentWhatsAppLink returns null for anything without a dialable
    // number, so the WhatsApp button simply does not render.
    whatsapp_number: values.whatsappNumber ?? "",
    hero_promise: values.heroPromise ? stripEmDashes(values.heroPromise) : null,
    story_text: values.storyText ? stripEmDashes(values.storyText) : null,
    offer_text: values.offerText ? stripEmDashes(values.offerText) : null,
    services: readServices(formData),
  };
}

export function readContentFields(formData: FormData) {
  return {
    accentColor: formData.get("accentColor"),
    town: formData.get("town"),
    whatsappNumber: formData.get("whatsappNumber"),
    heroPromise: formData.get("heroPromise"),
    storyText: formData.get("storyText"),
    offerText: formData.get("offerText"),
  };
}
