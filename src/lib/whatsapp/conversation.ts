import { createAdminClient } from "@/lib/supabase/admin";
import { provisionGrowthClient } from "@/lib/growth-client/provision";
import { generateLandingCopy } from "@/lib/ai/draft-copy";
import { initializePaystackCheckout } from "@/lib/paystack/checkout";
import { fetchWhatsAppMedia } from "@/lib/whatsapp/graph-api";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { trackBetaEvent } from "@/lib/metrics/track";
import { PROVINCES } from "@/lib/schemas/intake";
import { INDUSTRY_TAXONOMY, OTHER_INDUSTRY } from "@/lib/industries";
import type { IncomingWhatsAppMessage } from "@/lib/whatsapp/parse-webhook";
import type { BillingInterval } from "@/lib/paystack/plans";

// Combined spec Sec 32.3. Deliberately reordered from the spec's own listed
// sequence: tier/billing choice moves up right after contact_email (was
// step 7, last) so the growth_clients row can be provisioned immediately
// once business_name + email + tier/billing are known — mirrors exactly
// how the web flow already works (tier picked on /pricing, account
// provisioned, *then* the wizard collects profile details), rather than
// collecting a whole profile before knowing what to even provision.
// Template (spec step 4) isn't its own step here — confirmed with Dewald
// (AskUserQuestion) that every WhatsApp signup auto-assigns "Classic
// Conversion", so it's just written at provisioning time with a one-line
// mention, not a question.
//
// Public Beta Polish Sprint Sec 2: WhatsApp was Growth-only at first —
// confirmed decision that it should offer Foundation's free trial too,
// not just paid Growth, since it's an entry channel, not a separate paid
// product. "tier" is the new step this adds; "billing_cycle" is now only
// ever reached for Growth (Foundation has no monthly/annual choice, same
// as the web wizard).
type StepId =
  | "business_name"
  | "contact_email"
  | "tier"
  | "billing_cycle"
  | "province"
  | "industry_category"
  | "industry_subcategory"
  | "industry_other"
  | "business_address"
  | "business_description"
  | "tagline"
  | "products_services"
  | "additional_notes"
  | "brand_color"
  | "logo"
  | "landing_copy_review"
  | "packages"
  | "payment"
  | "done";

type ConversationRow = {
  id: string;
  bsuid: string;
  phone_number: string | null;
  growth_client_id: string | null;
  current_step: string;
  step_data: Record<string, unknown>;
};

type StepResult = {
  reply: string;
  nextStep: StepId;
  stepData: Record<string, unknown>;
  growthClientId: string | null;
};

const SKIP_WORDS = ["skip", "none", "n/a", "na", "no"];
function isSkip(text: string): boolean {
  return SKIP_WORDS.includes(text.trim().toLowerCase());
}

// Curated, not a free-text hex field — asking a non-technical WhatsApp user
// to type a hex code produces exactly the kind of garbage input CLAUDE.md's
// Meta-Pixel-step precedent already learned this lesson from (see the
// project memory on that step's "I don't know / need help" redesign).
// Secondary color always defaults to white here (same fallback the web
// wizard itself uses when unset) — not asked, changeable later in the
// dashboard's own color picker like everything else in this list.
const BRAND_COLORS: { label: string; hex: string }[] = [
  { label: "Navy Blue", hex: "#1081b8" },
  { label: "Forest Green", hex: "#1f7a4d" },
  { label: "Warm Orange", hex: "#e0592a" },
  { label: "Deep Purple", hex: "#6b3fa0" },
  { label: "Charcoal Black", hex: "#1a1a1a" },
  { label: "Ruby Red", hex: "#b8253a" },
  { label: "Teal", hex: "#0d8a8a" },
  { label: "Gold", hex: "#c9a227" },
];

function brandColorPrompt(): string {
  const lines = BRAND_COLORS.map((c, i) => `${i + 1}) ${c.label}`).join("\n");
  return `Pick a brand color for your page, just reply with the number:\n${lines}`;
}

// Public Beta Polish Sprint Sec 6: same fixed taxonomy as the web wizard's
// Step2BusinessProfile.tsx, adapted into WhatsApp's numbered-list pattern —
// top-level category first, sub-category as a follow-up numbered message,
// consistent with how brandColorPrompt already works.
function industryCategoryPrompt(): string {
  const lines = INDUSTRY_TAXONOMY.map((c, i) => `${i + 1}) ${c.name}`).join("\n");
  return `What industry is your business in? Reply with the number:\n${lines}\n${INDUSTRY_TAXONOMY.length + 1}) ${OTHER_INDUSTRY}`;
}

function industrySubcategoryPrompt(categoryName: string): string {
  const category = INDUSTRY_TAXONOMY.find((c) => c.name === categoryName);
  const lines = (category?.subcategories ?? []).map((s, i) => `${i + 1}) ${s}`).join("\n");
  return `Which is the closest match? Reply with the number:\n${lines}`;
}

export async function advanceConversation(
  conversation: ConversationRow,
  message: IncomingWhatsAppMessage
): Promise<StepResult> {
  const step = conversation.current_step as StepId;
  const text = (message.text ?? "").trim();
  const stepData = conversation.step_data;
  const admin = createAdminClient();

  switch (step) {
    case "business_name": {
      if (text.length < 2) {
        return { reply: "What's your business name?", nextStep: "business_name", stepData, growthClientId: null };
      }
      return {
        reply: "Great! What email should we use for your account (this is where your login link goes)?",
        nextStep: "contact_email",
        stepData: { ...stepData, businessName: text },
        growthClientId: null,
      };
    }

    case "contact_email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return {
          reply: "That doesn't look like a valid email, please try again.",
          nextStep: "contact_email",
          stepData,
          growthClientId: null,
        };
      }
      return {
        reply:
          "Which sounds right for you?\n1️⃣ Foundation, free for 7 days, then R100/month. A professional page, leads, and our full ecosystem.\n2️⃣ Growth, R180/month or R1,199/year. Everything in Foundation, plus ad tracking and campaign pages.\nReply 1 or 2.",
        nextStep: "tier",
        stepData: { ...stepData, contactEmail: text },
        growthClientId: null,
      };
    }

    case "tier": {
      if (text === "1") {
        const businessName = String(stepData.businessName);
        const contactEmail = String(stepData.contactEmail);

        // Foundation has no monthly/annual choice (same as web) — provision
        // immediately, same as Growth does once its own billing_cycle
        // answer comes in below.
        const result = await provisionGrowthClient({
          businessName,
          email: contactEmail,
          plan: "foundation",
          status: "pending_intake",
          paystackReference: null,
          consentedAt: new Date().toISOString(),
          marketingConsent: false,
          billingCycle: "monthly",
          foundingSignupNumber: null,
        });

        if ("error" in result) {
          return {
            reply: "Something went wrong setting up your account, please try again in a moment.",
            nextStep: "tier",
            stepData,
            growthClientId: null,
          };
        }

        await admin
          .from("growth_clients")
          .update({ signup_channel: "whatsapp", template: "conversion" })
          .eq("id", result.id);

        return {
          reply:
            "You're all set up! I've picked our classic page layout for you, you can change it any time from your dashboard later.\n\nNow let's get your business page details. Which province are you in? (e.g. Gauteng, Western Cape)",
          nextStep: "province",
          stepData: { ...stepData, tier: "foundation" },
          growthClientId: result.id,
        };
      }

      if (text === "2") {
        return {
          reply:
            "DigitalFlyer Growth is R180/month, or R1,199/year (locks in a lower price for life if you're one of our first 10 Day One Businesses).\n\nReply 1 for monthly or 2 for annual.",
          nextStep: "billing_cycle",
          stepData: { ...stepData, tier: "growth_engine" },
          growthClientId: null,
        };
      }

      return {
        reply: "Please reply 1 for Foundation (free trial) or 2 for Growth.",
        nextStep: "tier",
        stepData,
        growthClientId: null,
      };
    }

    case "billing_cycle": {
      const interval: BillingInterval | null = text === "1" ? "monthly" : text === "2" ? "annual" : null;
      if (!interval) {
        return {
          reply: "Please reply 1 for monthly (R180/mo) or 2 for annual (R1,199/yr).",
          nextStep: "billing_cycle",
          stepData,
          growthClientId: null,
        };
      }

      const businessName = String(stepData.businessName);
      const contactEmail = String(stepData.contactEmail);

      // Combined spec Sec 32.1: same provisioning path the web trial/paid
      // signup already uses (slug disambiguation, invite-by-email, growth_
      // member linking) — this is a second entry channel into the exact
      // same account creation, not a parallel implementation of it.
      const result = await provisionGrowthClient({
        businessName,
        email: contactEmail,
        plan: "growth_engine",
        status: "pending_intake",
        paystackReference: null,
        // No separate consent checkbox in a WhatsApp conversation — reusing
        // the web flow's field just to record *when* provisioning happened,
        // not a claim that an explicit legal-consent UI was shown here.
        // The payment step's own message links the real Terms before any
        // money changes hands, which is the actual consent moment.
        consentedAt: new Date().toISOString(),
        marketingConsent: false,
        billingCycle: interval,
        // Founding-member number assignment happens on first successful
        // charge.success, same as web — not decided here.
        foundingSignupNumber: null,
      });

      if ("error" in result) {
        return {
          reply: "Something went wrong setting up your account, please try again in a moment.",
          nextStep: "billing_cycle",
          stepData,
          growthClientId: null,
        };
      }

      await admin
        .from("growth_clients")
        .update({ signup_channel: "whatsapp", template: "conversion" })
        .eq("id", result.id);

      return {
        reply:
          "You're all set up! I've picked our classic page layout for you, you can change it any time from your dashboard later.\n\nNow let's get your business page details. Which province are you in? (e.g. Gauteng, Western Cape)",
        nextStep: "province",
        stepData: { ...stepData, billingCycle: interval },
        growthClientId: result.id,
      };
    }

    case "province": {
      const match = PROVINCES.find((p) => p.toLowerCase() === text.toLowerCase());
      if (!match) {
        return {
          reply: `Please reply with one of: ${PROVINCES.join(", ")}.`,
          nextStep: "province",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }
      return {
        reply: industryCategoryPrompt(),
        nextStep: "industry_category",
        stepData: { ...stepData, province: match },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "industry_category": {
      const index = Number(text) - 1;
      const isOtherChoice = index === INDUSTRY_TAXONOMY.length;
      const category = INDUSTRY_TAXONOMY[index];

      if (isOtherChoice) {
        return {
          reply: "No problem, tell us your specific industry:",
          nextStep: "industry_other",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }
      if (!category) {
        return { reply: industryCategoryPrompt(), nextStep: "industry_category", stepData, growthClientId: conversation.growth_client_id };
      }
      return {
        reply: industrySubcategoryPrompt(category.name),
        nextStep: "industry_subcategory",
        stepData: { ...stepData, industryCategory: category.name },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "industry_subcategory": {
      const categoryName = String(stepData.industryCategory ?? "");
      const category = INDUSTRY_TAXONOMY.find((c) => c.name === categoryName);
      const index = Number(text) - 1;
      const subcategory = category?.subcategories[index];

      if (!subcategory) {
        return {
          reply: industrySubcategoryPrompt(categoryName),
          nextStep: "industry_subcategory",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }
      return {
        reply: "What's your business address?",
        nextStep: "business_address",
        stepData: { ...stepData, industry: subcategory },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "industry_other": {
      if (text.length < 2) {
        return {
          reply: "Tell us your specific industry:",
          nextStep: "industry_other",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }
      return {
        reply: "What's your business address?",
        nextStep: "business_address",
        stepData: { ...stepData, industry: text },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "business_address": {
      if (text.length < 2) {
        return {
          reply: "What's your business address?",
          nextStep: "business_address",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }
      return {
        reply: "Now tell me a bit about your business, what do you do and who do you help? (a sentence or two is great)",
        nextStep: "business_description",
        stepData: { ...stepData, businessAddress: text },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "business_description": {
      if (text.length < 10) {
        return {
          reply: "Just a little more detail please, what does your business actually do?",
          nextStep: "business_description",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }
      return {
        reply: 'Got it! Do you have a short tagline or slogan? (reply "skip" if not)',
        nextStep: "tagline",
        stepData: { ...stepData, businessDescription: text },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "tagline": {
      const value = isSkip(text) ? "" : text;
      return {
        reply: 'What products or services do you offer? List a few, one message is fine. (reply "skip" if you\'d rather not list them)',
        nextStep: "products_services",
        stepData: { ...stepData, tagline: value },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "products_services": {
      const value = isSkip(text) ? "" : text;
      return {
        reply: 'Anything else worth knowing, your story, how long you\'ve been open, what makes you different? ("skip" if not)',
        nextStep: "additional_notes",
        stepData: { ...stepData, productsServices: value },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "additional_notes": {
      const value = isSkip(text) ? "" : text;
      return {
        reply: brandColorPrompt(),
        nextStep: "brand_color",
        stepData: { ...stepData, additionalNotes: value },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "brand_color": {
      const index = Number(text) - 1;
      const picked = BRAND_COLORS[index];
      if (!picked) {
        return { reply: brandColorPrompt(), nextStep: "brand_color", stepData, growthClientId: conversation.growth_client_id };
      }
      return {
        reply:
          'Last thing before I put your page together: send your logo as a photo, or reply "skip" to add one later from your dashboard.',
        nextStep: "logo",
        stepData: { ...stepData, brandPrimaryColor: picked.hex, brandSecondaryColor: "#ffffff" },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "logo": {
      let logoPath: string | null = null;

      if (message.mediaId && conversation.growth_client_id) {
        const media = await fetchWhatsAppMedia(message.mediaId);
        if (media) {
          const ext = media.mimeType.split("/")[1] ?? "jpg";
          const path = `${conversation.growth_client_id}/logo.${ext}`;
          const { error: uploadError } = await admin.storage
            .from("client-logos")
            .upload(path, media.buffer, { contentType: media.mimeType, upsert: true });
          if (!uploadError) logoPath = path;
        }
      } else if (!isSkip(text) && !message.mediaId) {
        // Neither a photo nor "skip" — re-prompt rather than silently
        // treating stray text as an implicit skip.
        return {
          reply: 'Please send your logo as a photo, or reply "skip".',
          nextStep: "logo",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }

      // Flush the whole profile collected so far now that it's complete —
      // matches saveStep2's own shape in src/app/onboard/actions.ts.
      if (conversation.growth_client_id) {
        await admin
          .from("growth_clients")
          .update({
            province: stepData.province,
            industry: stepData.industry,
            business_address: stepData.businessAddress,
            business_description: stepData.businessDescription,
            tagline: stepData.tagline || null,
            products_services: stepData.productsServices || null,
            additional_notes: stepData.additionalNotes || null,
            brand_primary_color: stepData.brandPrimaryColor,
            brand_secondary_color: stepData.brandSecondaryColor,
            ...(logoPath ? { logo_path: logoPath } : {}),
          })
          .eq("id", conversation.growth_client_id);
      }

      // Best-effort, same as the web wizard's own saveStep2 — a failed AI
      // call just means a blank draft to review/replace next, never blocks
      // the conversation.
      const draft = await generateLandingCopy({
        businessName: String(stepData.businessName),
        industry: String(stepData.industry),
        province: String(stepData.province),
        businessDescription: String(stepData.businessDescription),
        tagline: String(stepData.tagline ?? ""),
        productsServices: String(stepData.productsServices ?? ""),
        additionalNotes: String(stepData.additionalNotes ?? ""),
      });

      if (draft && conversation.growth_client_id) {
        await admin
          .from("growth_clients")
          .update({ ai_landing_draft: draft })
          .eq("id", conversation.growth_client_id);
      }

      if (!draft) {
        return {
          reply:
            'I couldn\'t draft your page copy automatically, no problem, you can write it yourself any time from your dashboard. For now, reply with any packages or pricing you\'d like listed, or "skip".',
          nextStep: "packages",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }

      return {
        reply: `Here's a draft for your page:\n\n"${draft.headline}"\n${draft.subheadline}\n\n${draft.aboutText}\n\nReply YES to use this, or type your own version instead.`,
        nextStep: "landing_copy_review",
        stepData: { ...stepData, aiDraft: draft },
        growthClientId: conversation.growth_client_id,
      };
    }

    case "landing_copy_review": {
      const draft = stepData.aiDraft as
        | { headline: string; subheadline: string; aboutText: string; servicesText: string }
        | undefined;
      const accepted = ["yes", "y", "accept", "looks good", "use this"].includes(text.toLowerCase());

      if (conversation.growth_client_id && draft) {
        const aboutText = accepted ? draft.aboutText : text;
        await admin.from("landing_pages").upsert(
          {
            growth_client_id: conversation.growth_client_id,
            slug: (
              await admin.from("growth_clients").select("slug").eq("id", conversation.growth_client_id).single()
            ).data?.slug,
            headline: draft.headline,
            subheadline: draft.subheadline,
            about_text: aboutText,
            services_text: String(stepData.productsServices ?? ""),
            cta_label: "Get in touch",
            cta_href: "#lead-form",
            published: false,
          },
          { onConflict: "growth_client_id,slug" }
        );
      }

      return {
        reply: 'Do you have any packages or pricing to list? Send them as one message, or reply "skip".',
        nextStep: "packages",
        stepData,
        growthClientId: conversation.growth_client_id,
      };
    }

    case "packages": {
      if (conversation.growth_client_id && !isSkip(text) && text.length > 0) {
        // Spec Sec 32.3 step 6: "optional, captured as simple text" — not
        // parsed into the web wizard's 3 structured name/price/description
        // slots (that structure doesn't map cleanly onto one free-text
        // WhatsApp message). One package entry with the raw text as its
        // description; a client can restructure this properly into named
        // packages any time from the dashboard.
        await admin
          .from("growth_clients")
          .update({ packages: [{ type: "package", name: "Our Packages", price: "", description: text }] })
          .eq("id", conversation.growth_client_id);
      }

      if (!conversation.growth_client_id) {
        return {
          reply: "Something went wrong finding your account, please message us again to restart.",
          nextStep: "done",
          stepData,
          growthClientId: null,
        };
      }

      const { data: growthClient } = await admin
        .from("growth_clients")
        .select("contact_email, billing_cycle, business_name, slug, status")
        .eq("id", conversation.growth_client_id)
        .single();

      if (!growthClient?.contact_email) {
        return {
          reply: "Something went wrong finding your account, please message us again to restart.",
          nextStep: "done",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }

      // Public Beta Polish Sprint Sec 2: Foundation has no payment step at
      // all — mirrors saveStep6's exact activation block in
      // src/app/onboard/actions.ts (the web wizard's Foundation finish
      // line) rather than a parallel implementation of it. Trial clock
      // starts now, at onboarding completion, not back at the tier choice.
      if (stepData.tier === "foundation") {
        if (growthClient.status !== "active") {
          const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await admin
            .from("growth_clients")
            .update({ status: "active", trial_ends_at: trialEndsAt })
            .eq("id", conversation.growth_client_id);
          await admin
            .from("landing_pages")
            .update({ published: true })
            .eq("growth_client_id", conversation.growth_client_id);
          await sendWelcomeEmail({
            businessName: growthClient.business_name,
            contactEmail: growthClient.contact_email,
            slug: growthClient.slug,
          });
          void trackBetaEvent("onboarding_completed");
        }

        return {
          reply: `Your page is live! ${process.env.NEXT_PUBLIC_SITE_URL}/g/${growthClient.slug}\n\nYour free 7-day trial has started, no card needed. We've emailed you a link into your dashboard.`,
          nextStep: "done",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }

      const checkout = await initializePaystackCheckout({
        growthClientId: conversation.growth_client_id,
        email: growthClient.contact_email,
        tier: "growth_engine",
        interval: (growthClient.billing_cycle as BillingInterval) ?? "monthly",
        callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing/success`,
      });

      if ("error" in checkout) {
        return {
          reply: "Something went wrong generating your payment link, please message us again in a moment.",
          nextStep: "packages",
          stepData,
          growthClientId: conversation.growth_client_id,
        };
      }

      return {
        reply: `Almost there! Complete payment here to go live:\n${checkout.authorizationUrl}\n\nOnce that's done we'll email you a link straight into your dashboard.`,
        nextStep: "done",
        stepData,
        growthClientId: conversation.growth_client_id,
      };
    }

    case "payment":
    case "done":
    default: {
      return {
        reply: "You're all set, check your email for a link into your dashboard once payment's through!",
        nextStep: "done",
        stepData,
        growthClientId: conversation.growth_client_id,
      };
    }
  }
}
