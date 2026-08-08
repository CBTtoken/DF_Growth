import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatePicker } from "@/components/stays/DatePicker";
import { RoomResultCard } from "@/components/stays/RoomResultCard";
import { getStaysOwnerWithGateway, photoUrlsByIds, searchAvailability } from "@/lib/stays/queries";
import { staySearchSchema } from "@/lib/schemas/stays";
import { STAY_COPY } from "@/lib/stays/copy";
import { longDate } from "@/lib/stays/money";

// What is actually free, for these dates, for this party.
//
// Never cached and never indexed. It is one search by one person, it
// changes the moment somebody else books, and a cached copy of "two rooms
// available" served to the next visitor is a double booking waiting to
// happen. The member's own page is the indexable surface; this is the
// answer to a question only one visitor asked.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Available rooms",
  robots: { index: false, follow: true },
};

export default async function StaySearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clientSlug } = await params;
  const query = await searchParams;

  const owner = await getStaysOwnerWithGateway(clientSlug);
  if (!owner) return notFound();

  const parsed = staySearchSchema.safeParse({
    checkIn: first(query.checkIn),
    checkOut: first(query.checkOut),
    adults: first(query.adults) ?? "2",
    children: first(query.children) ?? "0",
  });

  const accentColor = owner.brandPrimaryColor || "#1081b8";

  // A bad or missing search is not an error page. It is the picker again,
  // with a plain sentence about what went wrong, which is the interface
  // standard's "errors say what to do next".
  if (!parsed.success) {
    return (
      <Shell owner={owner} clientSlug={clientSlug} accentColor={accentColor}>
        <p className="mt-2 text-base text-gray-600">
          {parsed.error.issues[0]?.message ?? "Choose your dates and we will show you what is free."}
        </p>
        <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-5 shadow-sm sm:p-6">
          <DatePicker action={`/${clientSlug}/stay`} accentColor={accentColor} />
        </div>
      </Shell>
    );
  }

  const { checkIn, checkOut, adults, children } = parsed.data;
  const rooms = await searchAvailability({ growthClientId: owner.id, checkIn, checkOut, adults, children });

  // Every room's photos in one query rather than one query per room.
  const photoIds = [...new Set(rooms.flatMap((room) => room.roomType.photoIds))];
  const photos = await photoUrlsByIds(owner.id, photoIds);

  const nights = rooms[0]?.nights ?? nightsFallback(checkIn, checkOut);

  return (
    <Shell owner={owner} clientSlug={clientSlug} accentColor={accentColor}>
      <p className="mt-2 text-base text-gray-600">
        {STAY_COPY.resultsLead(nights, longDate(checkIn), longDate(checkOut))}
      </p>

      <details className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900">Change your dates</summary>
        <div className="mt-4">
          <DatePicker
            action={`/${clientSlug}/stay`}
            accentColor={accentColor}
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            children={children}
            compact
          />
        </div>
      </details>

      {rooms.length === 0 ? (
        // Nothing false, no invented alternatives, no "similar dates"
        // guessing. Handoff Job 2 says so in as many words, and a guessed
        // alternative is a promise the member never made.
        <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{STAY_COPY.nothingAvailable}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
            {STAY_COPY.nothingAvailableBody}
          </p>
          {owner.whatsappPhone && (
            <a
              href={`https://wa.me/${owner.whatsappPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
            >
              Send a message on WhatsApp
            </a>
          )}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          {rooms.map((room) => (
            <RoomResultCard
              key={room.roomType.id}
              clientSlug={clientSlug}
              room={room}
              checkIn={checkIn}
              checkOut={checkOut}
              adults={adults}
              children={children}
              accentColor={accentColor}
              imageUrls={room.roomType.photoIds
                .map((id) => photos.get(id))
                .filter((url): url is string => Boolean(url))}
              balanceDueDays={owner.property.balanceDueDays}
              cancellationTerms={owner.property.cancellationTerms}
              canPayOnline={owner.hasGateway}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({
  owner,
  clientSlug,
  accentColor,
  children,
}: {
  owner: { businessName: string };
  clientSlug: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${clientSlug}`}
          className="text-sm font-semibold text-gray-500 underline-offset-4 hover:underline"
          style={{ color: accentColor }}
        >
          ← Back to {owner.businessName}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {STAY_COPY.resultsTitle}
        </h1>
        {children}
      </div>
    </main>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function nightsFallback(checkIn: string, checkOut: string): number {
  return Math.max(
    0,
    Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000)
  );
}
