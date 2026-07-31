import type { PagePlan, PageSection, PhotoSlot } from "@/lib/generated-page/schema";
import { PALETTES, ICONS, isDarkPalette, type Palette } from "@/lib/generated-page/design";
import { HEADING_FONT_CLASS, HEADING_FONT_VARIABLE, type HeadingFontKey } from "@/lib/templates/anchors";
import { ensureContrast } from "@/lib/color";

// Renders a generated page plan.
//
// The whole library is server components and plain markup. Nothing here is
// clever, which is the point: everything that makes one member's page differ
// from another's lives in the plan, not in the code. That is what makes the
// result editable by the member later, and reviewable by us now.

type Ctx = {
  palette: Palette;
  accent: string;
  dark: boolean;
  headingClass: string;
  /** Resolved photo URL per slotId, empty until the member uploads. */
  photos: Record<string, string>;
  businessName: string;
};

// Placeholder for a photo the plan asked for and the member has not sent yet.
// Deliberately states the brief on the page in preview mode: this is the same
// text the member gets emailed, and seeing it in position is what makes the
// ask concrete rather than an abstract "add images".
function PhotoFrame({ slot, ctx, aspect }: { slot: PhotoSlot; ctx: Ctx; aspect: string }) {
  const url = ctx.photos[slot.slotId];
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- preview route only; the real route uses next/image once slots resolve to stored paths.
    return <img src={url} alt={slot.brief} className={`w-full ${aspect} rounded-2xl object-cover`} />;
  }
  return (
    <div
      className={`flex w-full ${aspect} flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center`}
      style={{ borderColor: ctx.palette.border, backgroundColor: ctx.palette.surfaceAlt }}
    >
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: ctx.accent }}>
        Photo needed
      </span>
      <span className="max-w-xs text-sm" style={{ color: ctx.palette.inkMuted }}>
        {slot.brief}
      </span>
    </div>
  );
}

function SectionHeading({ eyebrow, heading, ctx }: { eyebrow?: string; heading: string; ctx: Ctx }) {
  return (
    <>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ctx.accent }}>
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${ctx.headingClass}`}
        style={{ color: ctx.palette.ink }}
      >
        {heading}
      </h2>
    </>
  );
}

function Band({
  children,
  ctx,
  alt = false,
}: {
  children: React.ReactNode;
  ctx: Ctx;
  alt?: boolean;
}) {
  return (
    <section
      className="px-5 py-14 sm:px-8 sm:py-20"
      style={{ backgroundColor: alt ? ctx.palette.surfaceAlt : ctx.palette.surface }}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

function Hero({ section, ctx }: { section: Extract<PageSection, { type: "hero" }>; ctx: Ctx }) {
  const hasPhoto = Boolean(section.photoSlot);
  return (
    <header className="px-5 py-16 sm:px-8 sm:py-24" style={{ backgroundColor: ctx.palette.surface }}>
      <div className={`mx-auto grid max-w-5xl gap-10 ${hasPhoto ? "lg:grid-cols-2 lg:items-center" : ""}`}>
        <div>
          {section.eyebrow && (
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ctx.accent }}>
              {section.eyebrow}
            </p>
          )}
          <h1
            className={`mt-3 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl ${ctx.headingClass}`}
            style={{ color: ctx.palette.ink }}
          >
            {section.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
            {section.subheadline}
          </p>
        </div>
        {section.photoSlot && <PhotoFrame slot={section.photoSlot} ctx={ctx} aspect="aspect-[4/3]" />}
      </div>
    </header>
  );
}

function Intro({ section, ctx, alt }: { section: Extract<PageSection, { type: "intro" }>; ctx: Ctx; alt: boolean }) {
  return (
    <Band ctx={ctx} alt={alt}>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1.5fr] md:gap-14">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl ${ctx.headingClass}`}
          style={{ color: ctx.palette.ink }}
        >
          {section.heading}
        </h2>
        <div className="flex flex-col gap-4">
          {section.paragraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
              {p}
            </p>
          ))}
        </div>
      </div>
    </Band>
  );
}

function Pillars({ section, ctx, alt }: { section: Extract<PageSection, { type: "pillars" }>; ctx: Ctx; alt: boolean }) {
  return (
    <Band ctx={ctx} alt={alt}>
      <div className="max-w-2xl">
        <SectionHeading eyebrow={section.eyebrow} heading={section.heading} ctx={ctx} />
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {section.items.map((item, i) => {
          const Icon = ICONS[item.icon];
          return (
            <div
              key={i}
              className="rounded-2xl border p-6"
              style={{ backgroundColor: ctx.palette.card, borderColor: ctx.palette.border }}
            >
              <span
                className="grid size-11 place-items-center rounded-xl"
                style={{ backgroundColor: `${ctx.accent}1a`, color: ctx.accent }}
              >
                <Icon size={20} aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold" style={{ color: ctx.palette.ink }}>
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </Band>
  );
}

function Services({ section, ctx, alt }: { section: Extract<PageSection, { type: "services" }>; ctx: Ctx; alt: boolean }) {
  const described = section.items.some((i) => i.description);
  return (
    <Band ctx={ctx} alt={alt}>
      <div className="max-w-2xl">
        <SectionHeading eyebrow={section.eyebrow} heading={section.heading} ctx={ctx} />
      </div>
      <div className={`mt-10 grid gap-4 ${described ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {section.items.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border px-5 py-4"
            style={{ backgroundColor: ctx.palette.card, borderColor: ctx.palette.border }}
          >
            <h3 className="text-base font-semibold" style={{ color: ctx.palette.ink }}>
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </Band>
  );
}

function Process({ section, ctx, alt }: { section: Extract<PageSection, { type: "process" }>; ctx: Ctx; alt: boolean }) {
  return (
    <Band ctx={ctx} alt={alt}>
      <div className="max-w-2xl">
        <SectionHeading eyebrow={section.eyebrow} heading={section.heading} ctx={ctx} />
      </div>
      <ol className="mt-10 flex flex-col gap-4">
        {section.steps.map((step, i) => (
          <li key={i} className="flex gap-5">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold"
              style={{ backgroundColor: ctx.accent, color: ctx.palette.onAccent }}
            >
              {i + 1}
            </span>
            <div className="pt-1">
              <h3 className="text-lg font-semibold" style={{ color: ctx.palette.ink }}>
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Band>
  );
}

function FeatureSplit({
  section,
  ctx,
  alt,
}: {
  section: Extract<PageSection, { type: "featureSplit" }>;
  ctx: Ctx;
  alt: boolean;
}) {
  const media = section.photoSlot && <PhotoFrame slot={section.photoSlot} ctx={ctx} aspect="aspect-[4/3]" />;
  const copy = (
    <div>
      <h2
        className={`text-3xl font-bold tracking-tight sm:text-4xl ${ctx.headingClass}`}
        style={{ color: ctx.palette.ink }}
      >
        {section.heading}
      </h2>
      <p className="mt-4 text-lg leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
        {section.body}
      </p>
    </div>
  );
  return (
    <Band ctx={ctx} alt={alt}>
      <div className={`grid gap-10 ${media ? "lg:grid-cols-2 lg:items-center" : ""}`}>
        {section.mediaSide === "left" && media}
        {copy}
        {section.mediaSide === "right" && media}
      </div>
    </Band>
  );
}

function Faq({ section, ctx, alt }: { section: Extract<PageSection, { type: "faq" }>; ctx: Ctx; alt: boolean }) {
  return (
    <Band ctx={ctx} alt={alt}>
      <div className="max-w-2xl">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl ${ctx.headingClass}`}
          style={{ color: ctx.palette.ink }}
        >
          {section.heading}
        </h2>
      </div>
      <dl className="mt-10 flex flex-col gap-5">
        {section.items.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border p-6"
            style={{ backgroundColor: ctx.palette.card, borderColor: ctx.palette.border }}
          >
            <dt className="text-base font-semibold" style={{ color: ctx.palette.ink }}>
              {item.question}
            </dt>
            <dd className="mt-2 text-sm leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </Band>
  );
}

function Gallery({ section, ctx, alt }: { section: Extract<PageSection, { type: "gallery" }>; ctx: Ctx; alt: boolean }) {
  return (
    <Band ctx={ctx} alt={alt}>
      <h2
        className={`text-3xl font-bold tracking-tight sm:text-4xl ${ctx.headingClass}`}
        style={{ color: ctx.palette.ink }}
      >
        {section.heading}
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.photoSlots.map((slot) => (
          <PhotoFrame key={slot.slotId} slot={slot} ctx={ctx} aspect="aspect-[4/3]" />
        ))}
      </div>
    </Band>
  );
}

function Notice({ section, ctx }: { section: Extract<PageSection, { type: "notice" }>; ctx: Ctx }) {
  const Icon = ICONS[section.icon];
  return (
    <section className="px-5 py-6 sm:px-8" style={{ backgroundColor: ctx.accent }}>
      <div
        className="mx-auto flex max-w-5xl items-center justify-center gap-3 text-center text-base font-semibold"
        style={{ color: ctx.palette.onAccent }}
      >
        <Icon size={20} aria-hidden className="shrink-0" />
        {section.text}
      </div>
    </section>
  );
}

function CtaBand({ section, ctx }: { section: Extract<PageSection, { type: "ctaBand" }>; ctx: Ctx }) {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20" style={{ backgroundColor: ctx.palette.surfaceAlt }}>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl ${ctx.headingClass}`}
          style={{ color: ctx.palette.ink }}
        >
          {section.heading}
        </h2>
        {section.body && (
          <p className="text-lg leading-relaxed" style={{ color: ctx.palette.inkMuted }}>
            {section.body}
          </p>
        )}
      </div>
    </section>
  );
}

export function GeneratedPage({
  plan,
  businessName,
  brandColor,
  photos = {},
  contactActions,
}: {
  plan: PagePlan;
  businessName: string;
  /** The member's own colour, which overrides the palette accent where they have one. */
  brandColor?: string | null;
  photos?: Record<string, string>;
  contactActions?: React.ReactNode;
}) {
  const palette = PALETTES[plan.palette];
  const dark = isDarkPalette(plan.palette);
  // The member's brand colour wins where it is readable on this palette's
  // surface. Where it is not, the designed accent wins, because an unreadable
  // page is worse than one slightly off-brand.
  const accent = brandColor ? ensureContrast(brandColor, palette.surface) : palette.accent;
  const headingFont = plan.headingFont as HeadingFontKey;

  const ctx: Ctx = {
    palette,
    accent,
    dark,
    headingClass: HEADING_FONT_CLASS[headingFont],
    photos,
    businessName,
  };

  // Alternating bands so consecutive sections separate without hairlines.
  // Full-bleed sections (notice, cta) do not participate in the alternation.
  let bandIndex = 0;

  return (
    <main className={HEADING_FONT_VARIABLE[headingFont]} style={{ backgroundColor: palette.surface }}>
      {plan.sections.map((section, i) => {
        if (section.type === "hero") {
          return (
            <div key={i}>
              <Hero section={section} ctx={ctx} />
              {contactActions && (
                <div className="px-5 pb-14 sm:px-8">
                  <div className="mx-auto max-w-5xl">{contactActions}</div>
                </div>
              )}
            </div>
          );
        }
        if (section.type === "notice") return <Notice key={i} section={section} ctx={ctx} />;
        if (section.type === "ctaBand") return <CtaBand key={i} section={section} ctx={ctx} />;

        const alt = bandIndex++ % 2 === 1;
        switch (section.type) {
          case "intro":
            return <Intro key={i} section={section} ctx={ctx} alt={alt} />;
          case "pillars":
            return <Pillars key={i} section={section} ctx={ctx} alt={alt} />;
          case "services":
            return <Services key={i} section={section} ctx={ctx} alt={alt} />;
          case "process":
            return <Process key={i} section={section} ctx={ctx} alt={alt} />;
          case "featureSplit":
            return <FeatureSplit key={i} section={section} ctx={ctx} alt={alt} />;
          case "faq":
            return <Faq key={i} section={section} ctx={ctx} alt={alt} />;
          case "gallery":
            return <Gallery key={i} section={section} ctx={ctx} alt={alt} />;
        }
      })}
    </main>
  );
}
