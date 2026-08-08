#!/usr/bin/env node
// Mila's Place, rebuilt on Stays and Tours.
// Sprint: scripts/handoff-stays-and-tours-phase1.md
//
// The guesthouse the module was built for. This uploads his own photographs,
// rewrites the page copy from his own words, and sets up the property and
// its room types so that switching bookings on is one tap once he has given
// us his rates.
//
// Deliberately does NOT switch Stays and Tours on. A date picker over rooms
// with no prices answers every search with "nothing available", which is
// worse than not being there at all. The rooms carry no rate until Mila
// gives us one, so nothing is bookable and nothing is shown.
//
// Nothing here invents a fact. Every sentence below is drawn from Mila's own
// business description already on his record, or from what is visible in the
// photographs he sent. The two things this cannot know, his nightly rates and
// his cancellation terms, are left empty rather than guessed at.
//
// Dry run (default): says exactly what it would do and writes nothing.
//   node --env-file=.env.local scripts/build-milas-place.js
//
// Apply:
//   node --env-file=.env.local scripts/build-milas-place.js --apply

/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS script, same pattern as scripts/provision-buffelskop.js */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const APPLY = process.argv.includes("--apply");

const CLIENT_ID = "53d32a17-b4bf-4c7f-ac8c-33359b27429f";
const PHOTO_DIR = "C:/Users/dewal/OneDrive/Business 2026/DigitalFlyer/Clients/MilasPlace";

// In the order they should appear down his page. The first one is the hero:
// the view over the park to the Helderberg mountains, which is the single
// most specific thing about where he is and the thing no stock photograph
// could stand in for.
const PHOTOS = [
  "WhatsApp Image 2026-08-07 at 19.11.41 (1).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (8).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (5).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (9).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (11).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (6).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (12).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (13).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (14).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (3).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (2).jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.41.jpeg",
  "WhatsApp Image 2026-08-07 at 19.11.43 (21).jpeg",
];

async function rest(pathname, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function uploadPhoto(fileName) {
  const storagePath = `${CLIENT_ID}/${crypto.randomUUID()}.jpeg`;
  const body = fs.readFileSync(path.join(PHOTO_DIR, fileName));

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/client-photos/${storagePath}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "image/jpeg",
      "cache-control": "31536000",
    },
    body,
  });

  if (!res.ok) throw new Error(`upload ${fileName} -> ${res.status} ${await res.text()}`);
  return storagePath;
}

// ============================================================
// The words
// ============================================================

const HEADLINE = "A quiet Christian guest house in Somerset West";

const SUBHEADLINE =
  "Four bedrooms, a garden under an old oak, and views over the park to the Helderberg mountains. Ten minutes from the beach, twenty from Stellenbosch.";

const ABOUT = `Mila's Place is a family run guest house in a quiet street in Somerset West, looking out over a park with tennis courts, walking trails and a mountain bike course, and past it to the Helderberg mountains.

There are four bedrooms, two with their own bathrooms and two sharing one, and they can be taken one at a time or all together as a unit. Guests share a lounge, a fully equipped kitchen and an outdoor dining area, and breakfast is continental, vegetarian or halal, eaten under the oak tree or looking over the park.

We are a Christian guest house, and we run it the way we live: quietly, respectfully, and with room to breathe. Wine farms, golf, the beach and Stellenbosch are all a short drive away, and Cape Town International is 26 kilometres from the front door.`;

const SERVICES = `Four bedrooms, taken singly or as a whole unit
Two rooms with their own bathroom, two sharing
Family room with a king bed or twins, and a sleeper couch for children under 12
Continental, vegetarian or halal breakfast
Tea and coffee, extra blankets and toiletries in every room
Shared lounge, fully equipped kitchen and outdoor dining
Free WiFi and free private parking
Garden with seating under an old oak
Airport shuttle and executive lounge access, on request`;

// The house rules. These are not fine print for Mila's Place, they are the
// reason a particular kind of guest chooses it, so they are said plainly and
// up front rather than discovered after somebody has paid.
const STORY = `Mila's Place is a Christian guest house, guided by respect, peace and wholesome living, and there are three house rules we ask every guest to keep.

There is no smoking and no alcohol on the premises.

Only married couples share a room.

Saturday check in is between 19:00 and 21:00.

We say all of this before you book rather than after, so that the guests who come to us are the guests who are glad to be here.`;

const STAY_INTRO = `Four bedrooms, two of them with their own bathroom. Take one room or take the whole house.

Breakfast is included and can be continental, vegetarian or halal. There is a guest lounge, a fully equipped kitchen and an outdoor table under the oak tree.

Please note before you book: no smoking or alcohol on the premises, only married couples share a room, and Saturday check in is between 19:00 and 21:00.`;

const PROPERTY_AMENITIES = [
  "wifi",
  "parking",
  "breakfast",
  "garden",
  "shared_kitchen",
  "shared_lounge",
  "outdoor_dining",
  "family_friendly",
  "non_smoking",
  "airport_shuttle",
];

// Photo indexes into PHOTOS above, resolved to real ids after upload.
const ROOM_TYPES = [
  {
    name: "Room with its own bathroom",
    description:
      "A double room with its own bathroom, a TV, tea and coffee, extra blankets and toiletries. Two of these.",
    max_adults: 2,
    max_children: 0,
    units_count: 2,
    amenities: ["ensuite", "shower", "tv", "tea_coffee", "desk"],
    photos: [2, 5],
    position: 0,
  },
  {
    name: "Room with shared bathroom",
    description:
      "A double room sharing a bathroom with one other room. Tea and coffee, extra blankets and toiletries. Two of these.",
    max_adults: 2,
    max_children: 0,
    units_count: 2,
    amenities: ["shared_bathroom", "bath", "shower", "tea_coffee"],
    photos: [1, 3, 4],
    position: 1,
  },
  {
    name: "Family room",
    description:
      "A king size bed, or twins if you prefer, and a sleeper couch for children under 12. TV, bar fridge and microwave.",
    max_adults: 2,
    max_children: 2,
    units_count: 1,
    amenities: ["tv", "fridge", "tea_coffee", "sleeper_couch"],
    photos: [3, 7],
    position: 2,
  },
];

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase environment variables");

  const [client] = await rest(`growth_clients?id=eq.${CLIENT_ID}&select=id,business_name,slug`);
  if (!client) throw new Error("Mila's Place not found");

  const existingPhotos = await rest(`client_photos?growth_client_id=eq.${CLIENT_ID}&select=id`);
  const [landingPage] = await rest(`landing_pages?growth_client_id=eq.${CLIENT_ID}&select=id,slug`);

  console.log(`Client: ${client.business_name} (/${client.slug})`);
  console.log(`Photos already on record: ${existingPhotos.length}`);
  console.log(`Photos to upload: ${PHOTOS.length}`);
  console.log(`Landing page: ${landingPage ? landingPage.slug : "none"}`);
  console.log("");

  for (const file of PHOTOS) {
    const full = path.join(PHOTO_DIR, file);
    if (!fs.existsSync(full)) throw new Error(`Missing photo: ${full}`);
  }

  if (!APPLY) {
    console.log("Dry run. Nothing written. Re-run with --apply to write.");
    console.log("");
    console.log("Would upload 13 photographs and set the first as the hero.");
    console.log("Would rewrite headline, subheadline, about, services and the story.");
    console.log("Would create the property record with 10 amenities, switched OFF.");
    console.log("Would create 3 room types with no rates, so nothing is bookable yet.");
    return;
  }

  // Photos first, because everything else refers to them.
  const photoIds = [];
  for (const [index, file] of PHOTOS.entries()) {
    const storagePath = await uploadPhoto(file);
    const [row] = await rest("client_photos", {
      method: "POST",
      body: JSON.stringify({
        growth_client_id: CLIENT_ID,
        storage_path: storagePath,
        position: index,
      }),
    });
    photoIds.push(row.id);
    console.log(`  uploaded ${index + 1}/${PHOTOS.length}`);
  }

  await rest(`growth_clients?id=eq.${CLIENT_ID}`, {
    method: "PATCH",
    body: JSON.stringify({
      hero_photo_id: photoIds[0],
      // The stock Pexels image that stood in while he had no photographs of
      // his own. He has thirteen now, so a stock picture of somebody else's
      // guesthouse must not be what a link preview shows.
      fallback_photo_url: null,
      business_description: ABOUT,
      additional_notes: STORY,
      tagline: "Quiet rooms, a garden, and a view of the mountains",
    }),
  });
  console.log("  client record updated");

  if (landingPage) {
    await rest(`landing_pages?id=eq.${landingPage.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        headline: HEADLINE,
        subheadline: SUBHEADLINE,
        about_text: ABOUT,
        services_text: SERVICES,
        cta_label: "Check your dates",
      }),
    });
    console.log("  landing page copy rewritten");
  }

  await rest("stays_properties", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      growth_client_id: CLIENT_ID,
      // Off on purpose. See the note at the top of this file.
      enabled: false,
      intro: STAY_INTRO,
      amenities: PROPERTY_AMENITIES,
      balance_due_days: 7,
    }),
  });
  console.log("  property created, switched off");

  for (const room of ROOM_TYPES) {
    await rest("stays_room_types", {
      method: "POST",
      body: JSON.stringify({
        growth_client_id: CLIENT_ID,
        name: room.name,
        description: room.description,
        max_adults: room.max_adults,
        max_children: room.max_children,
        units_count: room.units_count,
        // No rate. Mila has not given us one, and a price we do not know is
        // not a price we may guess at.
        rate_cents: null,
        amenities: room.amenities,
        photo_ids: room.photos.map((index) => photoIds[index]),
        position: room.position,
      }),
    });
    console.log(`  room type: ${room.name}`);
  }

  console.log("");
  console.log("Done. Nothing is bookable until rates are added and the switch is turned on.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
