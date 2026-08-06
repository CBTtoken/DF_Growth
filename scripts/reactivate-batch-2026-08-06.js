#!/usr/bin/env node
// Legacy Reactivation batch, 2026-08-06: 4 real businesses Dewald handed over
// directly (not from the spreadsheet pipeline) — The Falling Feather Inn,
// SA Butlers (Cape Town Butler), Greeff Kitchens, Cottonball. Follows
// docs/GROWTH_LEGACY_REACTIVATION_RUNBOOK.md Section 1 exactly: createUser
// (never inviteUserByEmail/provisionGrowthClient) so nothing emails these
// businesses yet, signup_channel = 'legacy_reactivation' so they're excluded
// from the onboarding-nudge cron and show up in /admin/reactivation
// automatically, trial_starts_at/trial_ends_at left null until Dewald
// triggers the real send later (scripts/send-reactivation-batch.js).
//
// Content below was hand-extracted by browsing each business's own live
// site (see conversation), not spreadsheet fields — same no-fabrication bar
// as the AI-drafted path: every fact traces back to the business's own
// published copy, nothing invented.
//
// Usage:
//   node --env-file=.env.local scripts/reactivate-batch-2026-08-06.js            (dry run)
//   node --env-file=.env.local scripts/reactivate-batch-2026-08-06.js --live      (writes for real)

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const SITE_URL = "https://growth.digitalflyersa.co.za";

const LIVE = process.argv.includes("--live");

const RESERVED_SLUGS = new Set([
  "growth", "stoep", "beta", "app", "www", "admin", "api", "privacy", "terms",
  "pricing", "preview", "sample", "login", "logout", "dashboard", "onboard",
  "auth", "set-password", "forgot-password", "reset-password", "sitemap",
  "robots", "g", "marketplace", "board", "shop", "events", "faq",
  "how-it-works", "guide", "agents", "agent-link", "unsubscribe", "r",
]);

function slugify(input) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const BUSINESSES = [
  {
    key: "tffi",
    businessName: "The Falling Feather Inn",
    contactEmail: "info@tffi.co.za",
    callPhone: "071 383 0984",
    city: "Pretoria",
    businessAddress: "42 Tambotie Avenue, Val-de-Grace, Pretoria",
    industry: "Guest House & Accommodation", // no clean fit in INDUSTRY_TAXONOMY, stored as free text (resolves to "Other" in the picker)
    tagline: "Bed and breakfast in Val-de-Grace, Pretoria East",
    websiteUrl: "https://tffi.co.za",
    facebookUrl: "https://www.facebook.com/thefallingfeatherinn",
    headline: "A warm, comfortable stay in Pretoria East",
    subheadline:
      "Luxury en-suite rooms, a pool and braai area, and a genuine welcome, minutes from the CSIR and the Botanical Gardens.",
    aboutText:
      "The Falling Feather Inn is a stylish and comfortable guest house offering bed and breakfast in the upmarket suburb of Val-de-Grace, Pretoria East. Set in a tranquil area next to the CSIR and close to the Pretoria National Botanical Garden, it is an ideal base for business and leisure alike, only 40 minutes from OR Tambo International Airport. Every room is furnished in a modern classic design with an en-suite bathroom, crisp percale linen, a work desk and satellite TV.",
    servicesText:
      "Single and double en-suite rooms with bath and shower, coffee/tea tray, DSTV, WiFi and a safe in every room, with iron, microwave, fridge and air conditioning available in some units. Guests can also enjoy the swimming pool, braai area, fireplace, laundry service and secure parking.",
    productsServices: "Bed and breakfast accommodation; en-suite rooms; swimming pool and braai area; secure parking; laundry service",
    businessDescription:
      "Guest house offering bed and breakfast accommodation in Val-de-Grace, Pretoria East, close to the CSIR and the Botanical Gardens.",
    brandPrimaryColor: "#8A6D4C",
    brandSecondaryColor: "#4A2F22",
    template: "left-split",
    logoUrl: null, // no dedicated logo found on the legacy site, falls back to Growth's normal flow per the build spec Section 2
    photoUrls: [
      "https://tffi.co.za/wp-content/uploads/2024/03/gallery01.jpg",
      "https://tffi.co.za/wp-content/uploads/2024/03/gallery05.jpg",
      "https://tffi.co.za/wp-content/uploads/2024/03/gallery10.jpg",
      "https://tffi.co.za/wp-content/uploads/2024/03/gallery15.jpg",
      "https://tffi.co.za/wp-content/uploads/2024/03/gallery20.jpg",
      "https://tffi.co.za/wp-content/uploads/2024/03/gallery25.jpg",
    ],
    testimonials: [],
  },
  {
    key: "sa-butlers",
    // Already exists: growth_client id 0093eee9-c48e-4d7b-a933-86953b9911ae,
    // slug "cape-town-butler", part of the original 31-business legacy batch
    // (created 2026-07-16, invited 2026-07-25, trial expires 2026-08-07).
    // Dewald, 2026-08-06: "replace the butler one with your new build" —
    // content/template/images only. Must NOT touch id, slug, contact_email,
    // status, plan, signup_channel, trial_starts_at/trial_ends_at, or the
    // already-sent invite link and live trial break.
    updateExistingId: "0093eee9-c48e-4d7b-a933-86953b9911ae",
    businessName: "Cape Town Butler",
    contactEmail: "ceo@sa-butlers.com",
    industry: "Business Consulting & Coaching",
    tagline: "Hospitality skills training, delivered on-site by André Visser",
    websiteUrl: "https://sa-butlers.com",
    headline: "Seven-star service starts with the right training",
    subheadline:
      "On-site butler, front of house, housekeeping and waiter training for hotels, lodges and villas, led by SAQA-qualified trainer André Visser.",
    aboutText:
      "André Visser is a hospitality professional with more than 10 years in top-end service, recognised by the Butler Alliance of Europe. Training is SAQA-qualified and outcomes-based, delivered on-site while your staff are in service, for hotels, private game and holiday lodges and villas. André's mission is to raise the bar in the service industry, training the next generation of butlers, front of house staff, housekeepers and professional waiters.",
    servicesText:
      "Butler training, Junior Butler training, Professional Waiter training, Housekeeping training and Front of House training, all delivered on-site, outcomes-based and tailored to your property.",
    productsServices:
      "Butler training; Junior Butler training (from R15,500); Professional Waiter training (from R2,750); Housekeeping training (from R2,450); Front of House training (from R4,500)",
    businessDescription:
      "On-site hospitality skills training for hotels, lodges and villas, covering butler, front of house, housekeeping and waiter service.",
    template: "social-proof",
    logoUrl: "https://sa-butlers.com/wp-content/uploads/2024/02/Cape-Town-Butler-PNG-1024x103.png",
    photoUrls: [
      "https://sa-butlers.com/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-08-at-9.48.35-AM-1-1024x798.jpeg",
      "https://sa-butlers.com/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-08-at-10.18.39-AM-2-1024x768.jpeg",
      "https://sa-butlers.com/wp-content/uploads/2023/11/2023-10-18-2.jpg",
      "https://sa-butlers.com/wp-content/uploads/2024/02/WhatsApp-Image-2024-02-20-at-10.12.34-AM.jpeg",
    ],
    testimonials: [
      {
        author_name: "Greici M, Samsara Africa",
        quote:
          "André presented a couple of etiquette workshops for our team at Samsara Africa Travel. I can highly recommend making use of his services as this has enabled our team to grow in their profession and uphold the standard of our company.",
        rating: 5,
      },
      {
        author_name: "Jason W, Catering",
        quote:
          "I have worked with Andre on numerous occasions while catering for UHNW clients, and he is not only very professional, but also has the ability to go far beyond clients' expectations.",
        rating: 5,
      },
      {
        author_name: "Elsa S, Mad Hatter Coffee Shop",
        quote:
          "A massive thank you to Cape Town Butler and trainer/coach André Visser, who conducted onsite waiter training at Mad Hatter Coffee Café. Everyone was so engaged, and this training provides our employees with lifelong skills.",
        rating: 5,
      },
      {
        author_name: "Simon Eeman, Laluka Safari Lodge",
        quote:
          "André Visser from Cape Town Butler came for a week to Laluka Safari Lodge to train our waiters and front of house staff. The training was educational, interesting and even eye-opening in some instances for our team.",
        rating: 5,
      },
    ],
  },
  {
    key: "greeff-kitchens",
    businessName: "Greeff Kitchens",
    contactEmail: "callie@greeffkitchens.co.za",
    callPhone: "082 255 2267",
    city: "Klerksdorp",
    businessAddress: "12 Chronium Road, Uraniaville, Klerksdorp, 2571",
    industry: "Carpentry & Woodworking",
    tagline: "Custom kitchens, cabinetry and cupboards since 1991",
    websiteUrl: "https://greeffkitchens.co.za",
    facebookUrl: null,
    headline: "Custom-built kitchens, designed and installed by hand",
    subheadline:
      "Bespoke kitchens, built-in cupboards and bathroom cabinets, designed and manufactured in Klerksdorp since 1991.",
    aboutText:
      "Greeff Kitchens was established in 1991, growing from Oregon furniture manufacturing into a dedicated kitchen design and manufacturing company under founder Callie Greeff, who has more than 29 years of hands-on experience personally supervising every project. Alongside kitchen designer Elize Greeff, the team has completed projects ranging from private homes to commercial work including the TB and AIDS units at Tshepong Hospital, the radiology sections at Wilmed and Anncron hospitals, and the Grootbosch and Uurpan wedding and conference venues.",
    servicesText:
      "Custom kitchen design and manufacturing, kitchen renovations, built-in cupboards, walk-in closets, bathroom cabinets, bar counters, partition walls and countertops, in a wide range of colours, wood grains and finishes. The process: contact Greeff Kitchens, we draft your design, we consult and present the draft, we build your dream kitchen, we install it.",
    productsServices: "New kitchens; kitchen renovations; walk-in closets; built-in cupboards; bathroom cabinets",
    businessDescription:
      "Custom kitchen design, manufacturing and installation in Klerksdorp, run by founder Callie Greeff since 1991.",
    brandPrimaryColor: "#3B2A20",
    brandSecondaryColor: "#B08D57",
    template: "step-by-step",
    logoUrl: "https://greeffkitchens.co.za/wp-content/uploads/2020/06/Greeff-Kitchens-Logo.png",
    photoUrls: [
      "https://i0.wp.com/greeffkitchens.co.za/wp-content/uploads/2021/08/IMG-20210605-WA0036-1.jpg?w=786&h=637&ssl=1",
      "https://i0.wp.com/greeffkitchens.co.za/wp-content/uploads/2021/08/IMG-20210420-WA0031-1.jpg?w=796&h=597&ssl=1",
      "https://i0.wp.com/greeffkitchens.co.za/wp-content/uploads/2020/07/k.-800x600-1.jpg?w=1196&h=897&ssl=1",
      "https://i0.wp.com/greeffkitchens.co.za/wp-content/uploads/2020/06/y800x600.jpg?w=796&h=597&ssl=1",
      "https://i0.wp.com/greeffkitchens.co.za/wp-content/uploads/2020/06/Radiology-Office-600x800-1.jpg?w=1196&h=1595&ssl=1",
      "https://i0.wp.com/greeffkitchens.co.za/wp-content/uploads/2021/08/IMG-20210416-WA0056-1.jpg?w=619&h=464&ssl=1",
    ],
    testimonials: [],
  },
  {
    key: "cottonball",
    businessName: "Cottonball",
    contactEmail: "nanet@cottonball.co.za",
    callPhone: "082 496 4912",
    city: "Pretoria",
    businessAddress: "710 Lorna Street, Moreleta Park, Pretoria",
    industry: "General Arts & Crafts",
    tagline: "Brother and Juki sewing, embroidery and quilting machines, Pretoria East",
    websiteUrl: "https://cottonball.co.za",
    facebookUrl: null,
    headline: "Your Brother and Juki agency in Pretoria East",
    subheadline:
      "Sewing, embroidery and long-arm quilting machines, plus crochet and quilting classes, come sit, relax and chat all things craft with Nanet.",
    aboutText:
      "Cottonball is an authorised Brother, Babylock and Juki agency based in Moreleta Park, Pretoria East, run by Nanet. It's a place to explore your creative side over a cuppa, whether you're choosing a new embroidery machine, a Juki long-arm quilting machine, or just want to chat about crochet, quilting and sewing.",
    servicesText:
      "Brother embroidery, sewing machines and ScanNCut; Babylock sergers and coverstitch machines; Juki sewing, embroidery, overlockers and long-arm quilting machines; crochet and quilting classes; ScanNCut foil and heat vinyl transfer classes.",
    productsServices: "Sewing and embroidery machines; long-arm quilting machines; crochet classes; quilting classes; ScanNCut classes",
    businessDescription:
      "Authorised Brother, Babylock and Juki sewing, embroidery and quilting machine agency in Moreleta Park, Pretoria East, with crochet and quilting classes.",
    brandPrimaryColor: "#B76E79",
    brandSecondaryColor: "#F5EDE4",
    template: "storyteller",
    logoUrl: "https://cottonball.co.za/wp-content/uploads/2021/05/cottonball-logo.jpg",
    photoUrls: [
      "https://cottonball.co.za/wp-content/uploads/2024/06/SAM_0099.jpg",
      "https://cottonball.co.za/wp-content/uploads/2024/06/SAM_0103.jpg",
      "https://cottonball.co.za/wp-content/uploads/2024/06/SAM_0107.jpg",
      "https://cottonball.co.za/wp-content/uploads/2024/06/SAM_0111.jpg",
      "https://cottonball.co.za/wp-content/uploads/2024/06/SAM_0115.jpg",
    ],
    testimonials: [],
  },
];

async function uniqueSlug(admin, businessName) {
  const base = slugify(businessName);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 && !RESERVED_SLUGS.has(base) ? base : `${base}-${crypto.randomBytes(2).toString("hex")}`;
    const { data: client } = await admin.from("growth_clients").select("id").eq("slug", candidate).maybeSingle();
    const { data: agent } = await admin.from("agents").select("id").eq("page_slug", candidate).maybeSingle();
    if (!client && !agent) return candidate;
  }
  throw new Error(`Could not find a free slug for "${businessName}"`);
}

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    return { buffer, contentType };
  } catch {
    return null;
  }
}

function extFromContentType(contentType) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

// Content/template/image refresh on an already-live growth_client — never
// touches id, slug, contact_email, status, plan, signup_channel, or trial
// dates, so the account's existing invite link and trial keep working.
async function updateExistingBusiness(admin, biz) {
  const clientId = biz.updateExistingId;

  const { error: updateError } = await admin
    .from("growth_clients")
    .update({
      industry: biz.industry,
      tagline: biz.tagline,
      business_description: biz.businessDescription,
      products_services: biz.productsServices,
      website_url: biz.websiteUrl,
      template: biz.template,
    })
    .eq("id", clientId);
  if (updateError) {
    console.error(`  Failed to update growth_client: ${updateError.message}`);
    return;
  }
  console.log(`  growth_client content updated.`);

  if (biz.logoUrl) {
    const logo = await downloadImage(biz.logoUrl);
    if (logo) {
      const path = `${clientId}/logo.${extFromContentType(logo.contentType)}`;
      const { error: logoUploadError } = await admin.storage
        .from("client-logos")
        .upload(path, logo.buffer, { contentType: logo.contentType, upsert: true });
      if (logoUploadError) {
        console.error(`  Logo upload failed: ${logoUploadError.message}`);
      } else {
        await admin.from("growth_clients").update({ logo_path: path }).eq("id", clientId);
        console.log(`  Logo uploaded: ${path}`);
      }
    } else {
      console.log(`  Logo fetch failed, leaving existing logo_path as-is.`);
    }
  }

  const { data: existingPhotos } = await admin.from("client_photos").select("id").eq("growth_client_id", clientId);
  let position = existingPhotos ? existingPhotos.length : 0;
  let uploaded = 0;
  for (const photoUrl of biz.photoUrls) {
    const photo = await downloadImage(photoUrl);
    if (!photo) {
      console.log(`  Photo fetch failed, skipping: ${photoUrl}`);
      continue;
    }
    const path = `${clientId}/${crypto.randomUUID()}.${extFromContentType(photo.contentType)}`;
    const { error: photoUploadError } = await admin.storage
      .from("client-photos")
      .upload(path, photo.buffer, { contentType: photo.contentType });
    if (photoUploadError) {
      console.error(`  Photo upload failed: ${photoUploadError.message}`);
      continue;
    }
    await admin.from("client_photos").insert({ growth_client_id: clientId, storage_path: path, position });
    position++;
    uploaded++;
  }
  console.log(`  ${uploaded} photo(s) added.`);

  const { error: pageError } = await admin
    .from("landing_pages")
    .update({
      headline: biz.headline,
      subheadline: biz.subheadline,
      about_text: biz.aboutText,
      services_text: biz.servicesText,
    })
    .eq("growth_client_id", clientId);
  if (pageError) console.error(`  Failed to update landing_page: ${pageError.message}`);
  else console.log(`  Landing page content updated.`);

  const { data: existingTestimonials } = await admin
    .from("testimonials")
    .select("id")
    .eq("growth_client_id", clientId);
  if ((existingTestimonials ?? []).length > 0) {
    console.log(`  Skipping testimonials: ${existingTestimonials.length} already exist for this client.`);
  } else {
    for (const t of biz.testimonials) {
      const { error: testimonialError } = await admin.from("testimonials").insert({ growth_client_id: clientId, ...t });
      if (testimonialError) console.error(`  Testimonial insert failed: ${testimonialError.message}`);
    }
    if (biz.testimonials.length > 0) console.log(`  ${biz.testimonials.length} testimonial(s) added.`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars.");
    process.exit(1);
  }

  console.log(
    LIVE
      ? "LIVE run — this will create real accounts, pages and storage objects. No email will be sent.\n"
      : "DRY RUN — nothing will be written. Pass --live to actually run this.\n"
  );

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  for (const biz of BUSINESSES) {
    console.log(`\n=== ${biz.businessName} ===`);

    if (biz.updateExistingId) {
      console.log(`  Updating existing growth_client ${biz.updateExistingId} (content/template/images only).`);
      console.log(`  Template: ${biz.template}`);
      console.log(`  Industry: ${biz.industry}`);
      if (!LIVE) continue;
      await updateExistingBusiness(admin, biz);
      continue;
    }

    const { data: existing } = await admin
      .from("growth_clients")
      .select("id, slug")
      .eq("contact_email", biz.contactEmail)
      .maybeSingle();
    if (existing) {
      console.log(`  Skipping: a growth_client already exists for ${biz.contactEmail} (slug "${existing.slug}", id ${existing.id}).`);
      continue;
    }

    const slug = await uniqueSlug(admin, biz.businessName);
    console.log(`  Slug: ${slug}`);
    console.log(`  Template: ${biz.template}`);
    console.log(`  Industry: ${biz.industry}`);
    console.log(`  City: ${biz.city}`);

    if (!LIVE) continue;

    // 1. Auth user, no email sent (createUser + email_confirm, not inviteUserByEmail).
    const password = crypto.randomBytes(24).toString("base64url");
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: biz.contactEmail,
      password,
      email_confirm: true,
    });
    if (userError) {
      console.error(`  Failed to create auth user: ${userError.message}`);
      continue;
    }
    const userId = userData.user.id;
    console.log(`  Auth user created: ${userId}`);

    // 2. growth_clients row.
    const { data: client, error: clientError } = await admin
      .from("growth_clients")
      .insert({
        business_name: biz.businessName,
        slug,
        plan: "foundation",
        status: "active",
        signup_channel: "legacy_reactivation",
        contact_email: biz.contactEmail,
        call_phone: biz.callPhone,
        whatsapp_phone: biz.callPhone,
        city: biz.city,
        business_address: biz.businessAddress,
        industry: biz.industry,
        tagline: biz.tagline,
        business_description: biz.businessDescription,
        products_services: biz.productsServices,
        website_url: biz.websiteUrl,
        facebook_url: biz.facebookUrl,
        brand_primary_color: biz.brandPrimaryColor,
        brand_secondary_color: biz.brandSecondaryColor,
        template: biz.template,
        trial_starts_at: null,
        trial_ends_at: null,
        consented_at: null,
        marketing_consent: false,
      })
      .select("id, slug")
      .single();
    if (clientError) {
      console.error(`  Failed to create growth_client: ${clientError.message}`);
      continue;
    }
    console.log(`  growth_client created: ${client.id}`);

    // 3. Link the account as owner.
    const { error: memberError } = await admin
      .from("growth_members")
      .insert({ user_id: userId, growth_client_id: client.id, role: "growth_owner" });
    if (memberError) console.error(`  Failed to link growth_members: ${memberError.message}`);

    // 4. Logo.
    if (biz.logoUrl) {
      const logo = await downloadImage(biz.logoUrl);
      if (logo) {
        const path = `${client.id}/logo.${extFromContentType(logo.contentType)}`;
        const { error: logoUploadError } = await admin.storage
          .from("client-logos")
          .upload(path, logo.buffer, { contentType: logo.contentType, upsert: true });
        if (logoUploadError) {
          console.error(`  Logo upload failed: ${logoUploadError.message}`);
        } else {
          await admin.from("growth_clients").update({ logo_path: path }).eq("id", client.id);
          console.log(`  Logo uploaded: ${path}`);
        }
      } else {
        console.log(`  Logo fetch failed, leaving null (falls back to Growth's normal flow).`);
      }
    }

    // 5. Gallery photos.
    let position = 0;
    for (const photoUrl of biz.photoUrls) {
      const photo = await downloadImage(photoUrl);
      if (!photo) {
        console.log(`  Photo fetch failed, skipping: ${photoUrl}`);
        continue;
      }
      const path = `${client.id}/${crypto.randomUUID()}.${extFromContentType(photo.contentType)}`;
      const { error: photoUploadError } = await admin.storage
        .from("client-photos")
        .upload(path, photo.buffer, { contentType: photo.contentType });
      if (photoUploadError) {
        console.error(`  Photo upload failed: ${photoUploadError.message}`);
        continue;
      }
      await admin.from("client_photos").insert({ growth_client_id: client.id, storage_path: path, position });
      position++;
    }
    console.log(`  ${position} photo(s) uploaded.`);

    // 6. Landing page, published immediately per Dewald's instruction for this batch.
    const { error: pageError } = await admin.from("landing_pages").insert({
      growth_client_id: client.id,
      slug: client.slug,
      headline: biz.headline,
      subheadline: biz.subheadline,
      about_text: biz.aboutText,
      services_text: biz.servicesText,
      cta_label: "Get Started",
      cta_href: "#lead-form",
      published: true,
      page_type: "template",
    });
    if (pageError) console.error(`  Failed to create landing_page: ${pageError.message}`);
    else console.log(`  Landing page published at ${SITE_URL}/${client.slug}`);

    // 7. Testimonials, where the legacy site had real ones.
    for (const t of biz.testimonials) {
      const { error: testimonialError } = await admin
        .from("testimonials")
        .insert({ growth_client_id: client.id, ...t });
      if (testimonialError) console.error(`  Testimonial insert failed: ${testimonialError.message}`);
    }
    if (biz.testimonials.length > 0) console.log(`  ${biz.testimonials.length} testimonial(s) added.`);
  }

  console.log(LIVE ? "\nDone." : "\nDry run complete. Re-run with --live to execute for real.");
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
