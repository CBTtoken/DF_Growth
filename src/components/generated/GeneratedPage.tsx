import type { ReactNode } from "react";
import type { PagePlan, PageSection, PhotoSlot, FeatureStrip } from "@/lib/generated-page/schema";
import { PALETTES, ICONS, TYPE_PAIRINGS, RHYTHM, type Palette, type RhythmKey } from "@/lib/generated-page/design";
import { ensureContrast } from "@/lib/color";

// Renders a generated page plan.
//
// Every section type has several genuinely different layouts and the model
// picks one, because Dewald's review of the first version was that only the
// font changed while the layout stayed identical, which is precisely what
// makes a page feel template-driven. Nothing here is clever: all the variety
// lives in the plan, which is what keeps it editable by the member later.

type Ctx = {
  palette: Palette;
  accent: string;
  rhythm: (typeof RHYTHM)[RhythmKey];
  headingClass: string;
  eyebrowClass: string;
  photos: Record<string, string>;
};

/** Resolved colours for whichever surface a section sits on. */
type Surface = { bg: string; ink: string; inkMuted: string; card: string; border: string; onDeep: boolean };

function surfaceFor(ctx: Ctx, band: "plain" | "tinted" | "deep"): Surface {
  const p = ctx.palette;
  if (band === "deep") {
    return {
      bg: p.surfaceDeep,
      ink: p.inkOnDeep,
      inkMuted: p.inkMutedOnDeep,
      card: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.14)",
      onDeep: true,
    };
  }
  return {
    bg: band === "tinted" ? p.surfaceAlt : p.surface,
    ink: p.ink,
    inkMuted: p.inkMuted,
    card: p.card,
    border: p.border,
    onDeep: false,
  };
}

// On a deep band the palette accent often fails contrast, so it is lifted
// against that background rather than used raw.
function accentOn(ctx: Ctx, s: Surface): string {
  return s.onDeep ? ensureContrast(ctx.accent, s.bg, 3) : ctx.accent;
}

function PhotoFrame({
  slot,
  ctx,
  s,
  aspect,
  className = "",
}: {
  slot: PhotoSlot;
  ctx: Ctx;
  s: Surface;
  aspect: string;
  className?: string;
}) {
  const url = ctx.photos[slot.slotId];
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- preview route; the live route uses next/image once slots resolve to stored paths.
    return <img src={url} alt={slot.brief} className={`w-full ${aspect} object-cover ${className}`} />;
  }
  // States the brief in position. This is the same text the member gets
  // emailed, and seeing it where the photo will go is what makes the ask
  // concrete rather than an abstract "add images".
  return (
    <div
      className={`flex w-full ${aspect} flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-center ${className}`}
      style={{ borderColor: s.border, backgroundColor: s.onDeep ? "rgba(255,255,255,0.04)" : ctx.palette.surfaceAlt }}
    >
      <span className={ctx.eyebrowClass} style={{ color: accentOn(ctx, s) }}>
        Photo needed
      </span>
      <span className="max-w-xs text-sm" style={{ color: s.inkMuted }}>
        {slot.brief}
      </span>
    </div>
  );
}

function Eyebrow({ text, ctx, s }: { text?: string; ctx: Ctx; s: Surface }) {
  if (!text) return null;
  return (
    <p className={ctx.eyebrowClass} style={{ color: accentOn(ctx, s) }}>
      {text}
    </p>
  );
}

function Heading({ children, ctx, s, className = "" }: { children: ReactNode; ctx: Ctx; s: Surface; className?: string }) {
  return (
    <h2 className={`${ctx.rhythm.heading} ${ctx.headingClass} ${className}`} style={{ color: s.ink }}>
      {children}
    </h2>
  );
}

function Band({ children, ctx, s, wide = false }: { children: ReactNode; ctx: Ctx; s: Surface; wide?: boolean }) {
  return (
    <section className={`px-5 sm:px-8 ${ctx.rhythm.band}`} style={{ backgroundColor: s.bg }}>
      <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-5xl"}`}>{children}</div>
    </section>
  );
}

// The Buffelskop badge row. One section carrying two layout ideas is a large
// part of why that page reads as designed rather than assembled.
function Strip({ items, ctx, s }: { items: FeatureStrip; ctx: Ctx; s: Surface }) {
  return (
    <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((f, i) => {
        const Icon = ICONS[f.icon];
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-2xl border px-4 py-6 text-center"
            style={{ backgroundColor: s.card, borderColor: s.border }}
          >
            <Icon size={22} aria-hidden style={{ color: accentOn(ctx, s) }} />
            <span className="text-sm font-semibold" style={{ color: s.ink }}>
              {f.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({ section, ctx }: { section: Extract<PageSection, { type: "hero" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.layout === "framed" ? "deep" : "plain");
  const copy = (
    <div>
      <Eyebrow text={section.eyebrow} ctx={ctx} s={s} />
      <h1
        className={`mt-4 leading-[1.05] ${ctx.headingClass} ${
          section.layout === "editorial" ? "text-5xl sm:text-7xl" : "text-4xl sm:text-6xl"
        }`}
        style={{ color: s.ink }}
      >
        {section.headline}
      </h1>
      <p
        className={`mt-6 text-lg leading-relaxed ${section.layout === "editorial" ? "max-w-xl sm:ml-16" : "max-w-xl"}`}
        style={{ color: s.inkMuted }}
      >
        {section.subheadline}
      </p>
    </div>
  );

  return (
    <header className={`px-5 sm:px-8 ${ctx.rhythm.band}`} style={{ backgroundColor: s.bg }}>
      <div className={`mx-auto max-w-6xl ${section.layout === "stacked" ? "text-center" : ""}`}>
        {section.layout === "split" && section.photoSlot ? (
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {copy}
            <PhotoFrame slot={section.photoSlot} ctx={ctx} s={s} aspect="aspect-[4/3]" className="rounded-3xl" />
          </div>
        ) : (
          <div className={section.layout === "stacked" ? "mx-auto max-w-3xl" : "max-w-4xl"}>{copy}</div>
        )}
        {section.layout !== "split" && section.photoSlot && (
          <div className="mt-12">
            <PhotoFrame slot={section.photoSlot} ctx={ctx} s={s} aspect="aspect-[21/9]" className="rounded-3xl" />
          </div>
        )}
        {section.featureStrip && <Strip items={section.featureStrip} ctx={ctx} s={s} />}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------

function Intro({ section, ctx }: { section: Extract<PageSection, { type: "intro" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  const body = section.paragraphs.map((p, i) => (
    <p key={i} className="text-lg leading-relaxed" style={{ color: s.inkMuted }}>
      {p}
    </p>
  ));

  return (
    <Band ctx={ctx} s={s}>
      {section.layout === "statement" && (
        <div className="mx-auto max-w-3xl text-center">
          <Heading ctx={ctx} s={s}>{section.heading}</Heading>
          <div className="mt-6 flex flex-col gap-5">{body}</div>
        </div>
      )}
      {section.layout === "split-heading" && (
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1.6fr] md:gap-16">
          <Heading ctx={ctx} s={s}>{section.heading}</Heading>
          <div className="flex flex-col gap-5">{body}</div>
        </div>
      )}
      {section.layout === "columns" && (
        <>
          <Heading ctx={ctx} s={s} className="max-w-3xl">{section.heading}</Heading>
          <div className="mt-8 flex flex-col gap-5 md:columns-2 md:gap-12">{body}</div>
        </>
      )}
      {section.featureStrip && <Strip items={section.featureStrip} ctx={ctx} s={s} />}
    </Band>
  );
}

// ---------------------------------------------------------------------------
// Pillars
// ---------------------------------------------------------------------------

function Pillars({ section, ctx }: { section: Extract<PageSection, { type: "pillars" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  const accent = accentOn(ctx, s);

  return (
    <Band ctx={ctx} s={s} wide={section.layout === "wide-rows"}>
      <div className={`max-w-2xl ${section.layout === "numbered" ? "mx-auto text-center" : ""}`}>
        <Eyebrow text={section.eyebrow} ctx={ctx} s={s} />
        <Heading ctx={ctx} s={s} className="mt-3">{section.heading}</Heading>
      </div>

      {section.layout === "icon-cards" && (
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {section.items.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <div key={i} className="rounded-2xl border p-7" style={{ backgroundColor: s.card, borderColor: s.border }}>
                <span
                  className="grid size-12 place-items-center rounded-xl"
                  style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold" style={{ color: s.ink }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{item.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {section.layout === "numbered" && (
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item, i) => (
            <div key={i} className="border-t pt-5" style={{ borderColor: accent }}>
              <span className={`text-4xl ${ctx.headingClass}`} style={{ color: accent }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-lg font-semibold" style={{ color: s.ink }}>{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{item.body}</p>
            </div>
          ))}
        </div>
      )}

      {section.layout === "wide-rows" && (
        <div className="mt-12 flex flex-col">
          {section.items.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <div
                key={i}
                className="grid gap-5 border-t py-8 md:grid-cols-[auto_minmax(0,1fr)_2fr] md:items-start md:gap-10"
                style={{ borderColor: s.border }}
              >
                <Icon size={30} aria-hidden style={{ color: accent }} />
                <h3 className="text-xl font-semibold" style={{ color: s.ink }}>{item.title}</h3>
                <p className="text-base leading-relaxed" style={{ color: s.inkMuted }}>{item.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {section.layout === "quiet" && (
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {section.items.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <div key={i}>
                <Icon size={24} aria-hidden style={{ color: accent }} />
                <h3 className="mt-4 text-lg font-semibold" style={{ color: s.ink }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{item.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </Band>
  );
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

function Services({ section, ctx }: { section: Extract<PageSection, { type: "services" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  const accent = accentOn(ctx, s);
  const header = (
    <div className="max-w-2xl">
      <Eyebrow text={section.eyebrow} ctx={ctx} s={s} />
      <Heading ctx={ctx} s={s} className="mt-3">{section.heading}</Heading>
    </div>
  );

  if (section.layout === "two-column") {
    return (
      <Band ctx={ctx} s={s}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_1.6fr] md:gap-16">
          {header}
          <div className="flex flex-col">
            {section.items.map((item, i) => (
              <div key={i} className="border-t py-5" style={{ borderColor: s.border }}>
                <h3 className="text-base font-semibold" style={{ color: s.ink }}>{item.name}</h3>
                {item.description && (
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Band>
    );
  }

  return (
    <Band ctx={ctx} s={s}>
      {header}
      {section.layout === "cards" && (
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {section.items.map((item, i) => (
            <div key={i} className="rounded-2xl border p-6" style={{ backgroundColor: s.card, borderColor: s.border }}>
              <h3 className="text-base font-semibold" style={{ color: s.ink }}>{item.name}</h3>
              {item.description && (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {section.layout === "list-rows" && (
        <div className="mt-12 flex flex-col">
          {section.items.map((item, i) => (
            <div
              key={i}
              className="grid gap-2 border-t py-6 md:grid-cols-[1fr_2fr] md:gap-10"
              style={{ borderColor: s.border }}
            >
              <h3 className="text-lg font-semibold" style={{ color: s.ink }}>{item.name}</h3>
              {item.description && (
                <p className="text-base leading-relaxed" style={{ color: s.inkMuted }}>{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {section.layout === "tiles" && (
        <div className="mt-12 flex flex-wrap gap-3">
          {section.items.map((item, i) => (
            <span
              key={i}
              className="rounded-full border px-5 py-2.5 text-sm font-semibold"
              style={{ borderColor: accent, color: s.ink, backgroundColor: s.card }}
            >
              {item.name}
            </span>
          ))}
        </div>
      )}
    </Band>
  );
}

// ---------------------------------------------------------------------------
// Process
// ---------------------------------------------------------------------------

function Process({ section, ctx }: { section: Extract<PageSection, { type: "process" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  const accent = accentOn(ctx, s);

  return (
    <Band ctx={ctx} s={s} wide={section.layout === "timeline"}>
      <div className={`max-w-2xl ${section.layout === "timeline" ? "mx-auto text-center" : ""}`}>
        <Eyebrow text={section.eyebrow} ctx={ctx} s={s} />
        <Heading ctx={ctx} s={s} className="mt-3">{section.heading}</Heading>
      </div>

      {section.layout === "steps" && (
        <ol className="mt-12 flex flex-col gap-6">
          {section.steps.map((step, i) => (
            <li key={i} className="flex gap-6">
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold"
                style={{ backgroundColor: accent, color: ctx.palette.onAccent }}
              >
                {i + 1}
              </span>
              <div className="pt-1.5">
                <h3 className="text-lg font-semibold" style={{ color: s.ink }}>{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {section.layout === "timeline" && (
        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {section.steps.map((step, i) => (
            <li key={i} className="border-t pt-5" style={{ borderColor: accent }}>
              <span className="text-xs font-bold" style={{ color: accent }}>STEP {i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold" style={{ color: s.ink }}>{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{step.body}</p>
            </li>
          ))}
        </ol>
      )}

      {section.layout === "big-numbers" && (
        <div className="mt-12 flex flex-col gap-10">
          {section.steps.map((step, i) => (
            <div key={i} className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
              <span className={`text-6xl leading-none ${ctx.headingClass}`} style={{ color: `${accent}44` }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-xl font-semibold" style={{ color: s.ink }}>{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed" style={{ color: s.inkMuted }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Band>
  );
}

// ---------------------------------------------------------------------------
// Feature split
// ---------------------------------------------------------------------------

function FeatureSplit({ section, ctx }: { section: Extract<PageSection, { type: "featureSplit" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  const frame =
    section.layout === "framed" ? "rounded-3xl shadow-2xl shadow-black/20" : section.layout === "offset" ? "rounded-2xl lg:-mb-14 lg:mt-14" : "rounded-2xl";
  const media = section.photoSlot && (
    <PhotoFrame slot={section.photoSlot} ctx={ctx} s={s} aspect="aspect-[4/5]" className={frame} />
  );
  const copy = (
    <div>
      <Heading ctx={ctx} s={s}>{section.heading}</Heading>
      <p className="mt-5 text-lg leading-relaxed" style={{ color: s.inkMuted }}>{section.body}</p>
    </div>
  );

  return (
    <Band ctx={ctx} s={s} wide>
      <div className={`grid ${ctx.rhythm.gap} ${media ? "lg:grid-cols-2 lg:items-center" : ""}`}>
        {media && section.mediaSide === "left" && media}
        {copy}
        {media && section.mediaSide === "right" && media}
      </div>
      {section.featureStrip && <Strip items={section.featureStrip} ctx={ctx} s={s} />}
    </Band>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

function Faq({ section, ctx }: { section: Extract<PageSection, { type: "faq" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  const item = (q: string, a: string, key: number, boxed: boolean) => (
    <div
      key={key}
      className={boxed ? "rounded-2xl border p-6" : "border-t py-6"}
      style={boxed ? { backgroundColor: s.card, borderColor: s.border } : { borderColor: s.border }}
    >
      <dt className="text-base font-semibold" style={{ color: s.ink }}>{q}</dt>
      <dd className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{a}</dd>
    </div>
  );

  return (
    <Band ctx={ctx} s={s}>
      <Heading ctx={ctx} s={s} className="max-w-2xl">{section.heading}</Heading>
      <dl
        className={`mt-10 ${
          section.layout === "cards" ? "flex flex-col gap-5" : section.layout === "two-column" ? "grid gap-x-12 sm:grid-cols-2" : "flex flex-col"
        }`}
      >
        {section.items.map((f, i) => item(f.question, f.answer, i, section.layout === "cards"))}
      </dl>
    </Band>
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

function Gallery({ section, ctx }: { section: Extract<PageSection, { type: "gallery" }>; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  return (
    <Band ctx={ctx} s={s} wide>
      <Heading ctx={ctx} s={s}>{section.heading}</Heading>
      {section.layout === "grid" && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.photoSlots.map((slot) => (
            <PhotoFrame key={slot.slotId} slot={slot} ctx={ctx} s={s} aspect="aspect-[4/3]" className="rounded-2xl" />
          ))}
        </div>
      )}
      {section.layout === "feature" && (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {section.photoSlots.map((slot, i) => (
            <PhotoFrame
              key={slot.slotId}
              slot={slot}
              ctx={ctx}
              s={s}
              aspect={i === 0 ? "aspect-[16/10]" : "aspect-[4/3]"}
              className={`rounded-2xl ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}
            />
          ))}
        </div>
      )}
      {section.layout === "strip" && (
        <div className="mt-10 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(section.photoSlots.length, 4)}, minmax(0,1fr))` }}>
          {section.photoSlots.slice(0, 4).map((slot) => (
            <PhotoFrame key={slot.slotId} slot={slot} ctx={ctx} s={s} aspect="aspect-[3/4]" className="rounded-2xl" />
          ))}
        </div>
      )}
    </Band>
  );
}

// ---------------------------------------------------------------------------
// Full-bleed pieces
// ---------------------------------------------------------------------------

function Notice({ section, ctx }: { section: Extract<PageSection, { type: "notice" }>; ctx: Ctx }) {
  const Icon = ICONS[section.icon];
  return (
    <section className="px-5 py-7 sm:px-8" style={{ backgroundColor: ctx.accent }}>
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
  const s = surfaceFor(ctx, section.band === "plain" ? "tinted" : section.band);
  return (
    <Band ctx={ctx} s={s}>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <Heading ctx={ctx} s={s}>{section.heading}</Heading>
        {section.body && (
          <p className="text-lg leading-relaxed" style={{ color: s.inkMuted }}>{section.body}</p>
        )}
      </div>
    </Band>
  );
}

// ---------------------------------------------------------------------------

export function GeneratedPage({
  plan,
  brandColor,
  photos = {},
  contactActions,
}: {
  plan: PagePlan;
  /** The member's own colour, which overrides the palette accent where it stays readable. */
  brandColor?: string | null;
  photos?: Record<string, string>;
  contactActions?: ReactNode;
}) {
  const palette = PALETTES[plan.palette];
  const pairing = TYPE_PAIRINGS[plan.typePairing];
  const accent = brandColor ? ensureContrast(brandColor, palette.surface) : palette.accent;

  const ctx: Ctx = {
    palette,
    accent,
    rhythm: RHYTHM[plan.rhythm],
    headingClass: `${pairing.headingClass} ${pairing.headingTone}`,
    eyebrowClass: pairing.eyebrowClass,
    photos,
  };

  return (
    <main className={pairing.variable} style={{ backgroundColor: palette.surface }}>
      {plan.sections.map((section, i) => {
        switch (section.type) {
          case "hero":
            return (
              <div key={i}>
                <Hero section={section} ctx={ctx} />
                {contactActions && (
                  <div className="px-5 pb-12 sm:px-8" style={{ backgroundColor: palette.surface }}>
                    <div className="mx-auto max-w-6xl">{contactActions}</div>
                  </div>
                )}
              </div>
            );
          case "intro":
            return <Intro key={i} section={section} ctx={ctx} />;
          case "pillars":
            return <Pillars key={i} section={section} ctx={ctx} />;
          case "services":
            return <Services key={i} section={section} ctx={ctx} />;
          case "process":
            return <Process key={i} section={section} ctx={ctx} />;
          case "featureSplit":
            return <FeatureSplit key={i} section={section} ctx={ctx} />;
          case "faq":
            return <Faq key={i} section={section} ctx={ctx} />;
          case "gallery":
            return <Gallery key={i} section={section} ctx={ctx} />;
          case "notice":
            return <Notice key={i} section={section} ctx={ctx} />;
          case "ctaBand":
            return <CtaBand key={i} section={section} ctx={ctx} />;
        }
      })}
    </main>
  );
}
