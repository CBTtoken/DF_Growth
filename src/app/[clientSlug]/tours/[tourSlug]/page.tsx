import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, MapPin } from "lucide-react";
import { TourBookingForm } from "@/components/stays/TourBookingForm";
import { getStaysOwner, getStaysOwnerWithGateway, getTourBySlug, photoUrlsByIds } from "@/lib/stays/queries";
import { TOUR_COPY } from "@/lib/stays/copy";
import { depositCents as calcDeposit, longDate, rand, todayInSA } from "@/lib/stays/money";
import { truncateOnWord } from "@/lib/text";

// A tour's own page. This is the indexable unit of the tours half of the
// module (handoff Job 6: "Each tour gets its own indexable page carrying
// the itinerary and photos. This is what Google finds and what the member
// shares"), so it gets real metadata, a canonical, a share image and a row
// in the sitemap, exactly like a shop product page does.
//
// Rendered fresh rather than cached, because the seat count on it has to be
// true. A cached "three seats left" is the one number on this page that
// costs somebody something when it is wrong.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string; tourSlug: string }>;
}): Promise<Metadata> {
  const { clientSlug, tourSlug } = await params;
  const owner = await getStaysOwner(clientSlug);
  if (!owner) return {};

  const tour = await getTourBySlug(owner.id, tourSlug);
  if (!tour || !tour.isPublished) return {};

  const title = `${tour.title} | ${owner.businessName}`;
  const description = truncateOnWord(
    tour.summary || tour.description || `${tour.title} with ${owner.businessName}${owner.city ? ` in ${owner.city}` : ""}.`,
    155
  );
  const url = `/${clientSlug}/tours/${tourSlug}`;

  const photos = await photoUrlsByIds(owner.id, tour.photoIds.slice(0, 1));
  const image = [...photos.values()][0];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "en_ZA",
      images: image ? [image] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ clientSlug: string; tourSlug: string }>;
}) {
  const { clientSlug, tourSlug } = await params;

  const owner = await getStaysOwnerWithGateway(clientSlug);
  if (!owner) return notFound();

  const tour = await getTourBySlug(owner.id, tourSlug);
  if (!tour || !tour.isPublished) return notFound();

  const photos = await photoUrlsByIds(owner.id, tour.photoIds);
  const images = tour.photoIds.map((id) => photos.get(id)).filter((url): url is string => Boolean(url));

  const accentColor = owner.brandPrimaryColor || "#1081b8";
  const hasRun = tour.departureDate < todayInSA();
  const depositCents = calcDeposit(tour.priceCents, tour.depositKind, tour.depositPercent, tour.depositFixedCents);

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {images[0] && (
        <div className="relative h-56 w-full sm:h-80">
          <Image src={images[0]} alt={tour.title} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href={`/${clientSlug}#tours`}
          className="text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: accentColor }}
        >
          ← Back to {owner.businessName}
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{tour.title}</h1>
        {tour.summary && <p className="mt-3 text-lg leading-relaxed text-gray-600">{tour.summary}</p>}

        <dl className="mt-6 grid gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-3">
          <Fact icon={Calendar} label={TOUR_COPY.departs} value={longDate(tour.departureDate)} accentColor={accentColor}>
            {tour.departureTime}
          </Fact>
          {tour.durationText && (
            <Fact icon={Clock} label={TOUR_COPY.howLong} value={tour.durationText} accentColor={accentColor} />
          )}
          {tour.meetingPoint && (
            <Fact icon={MapPin} label={TOUR_COPY.meetAt} value={tour.meetingPoint} accentColor={accentColor} />
          )}
        </dl>

        {tour.description && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">{TOUR_COPY.whatWeDo}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-700">{tour.description}</p>
          </section>
        )}

        {tour.itinerary && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">{TOUR_COPY.itinerary}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-700">{tour.itinerary}</p>
          </section>
        )}

        {images.length > 1 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.slice(1, 7).map((url) => (
              <div key={url} className="relative aspect-4/3 overflow-hidden rounded-2xl bg-gray-100">
                <Image src={url} alt={tour.title} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          {hasRun ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <p className="text-base font-semibold text-gray-900">This trip has already run</p>
              <p className="mt-2 text-sm text-gray-600">
                Look out for the next date, or ask {owner.businessName} when it is going again.
              </p>
              <p className="mt-3 text-sm font-semibold text-gray-900">
                {rand(tour.priceCents)} {TOUR_COPY.perPerson}
              </p>
            </div>
          ) : (
            <TourBookingForm
              clientSlug={clientSlug}
              tourSlug={tourSlug}
              tourId={tour.id}
              seatsLeft={tour.seatsLeft}
              priceCents={tour.priceCents}
              depositCents={depositCents}
              accentColor={accentColor}
              canPayOnline={owner.hasGateway}
              cancellationTerms={owner.property.cancellationTerms}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  accentColor,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  accentColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentColor }} />
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="text-sm font-semibold text-gray-900">
          {value}
          {children ? `, ${children}` : ""}
        </dd>
      </div>
    </div>
  );
}
