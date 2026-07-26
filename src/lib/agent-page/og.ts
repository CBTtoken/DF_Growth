import type { Metadata } from "next";
import { truncateOnWord } from "@/lib/text";
import type { AgentPage } from "@/lib/agent-page/data";

// Agent Programme Phase 1 Sec 1.2: "Full Open Graph per agent... Most
// traffic arrives from a link pasted into WhatsApp, so the preview card
// matters more than any other single element on the page."
//
// The card is always rendered by our own route rather than pointing
// og:image straight at the uploaded photo. Three reasons that matter for a
// WhatsApp preview specifically: the raw upload is whatever aspect ratio
// the agent's phone produced and gets centre-cropped unpredictably, an
// agent with no photo would otherwise have no image at all, and a bare
// photo carries no name, town or brand mark. One route covers both cases.
export function agentOgImageUrl(slug: string): string {
  return `/api/og/agent/${encodeURIComponent(slug)}`;
}

export function agentPageMetadata(agent: AgentPage): Metadata {
  const location = agent.town ? `${agent.town}, ` : "";
  const title = `${agent.fullName} | ${location}DigitalFlyer SA Agent`;
  const description = truncateOnWord(
    agent.heroPromise ??
      `${agent.fullName} helps South African businesses get found online with DigitalFlyer SA.`,
    160
  );
  const url = `/${agent.slug}`;
  const image = agentOgImageUrl(agent.slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [image], type: "profile" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
