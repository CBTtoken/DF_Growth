import type { ReactNode } from "react";
import type { ComposedPlan, ComposedSection, ComposedElement, ComposedCell } from "@/lib/generated-page/composed-schema";
import { PALETTES, ICONS, TYPE_PAIRINGS, type Palette } from "@/lib/generated-page/design";
import { ensureContrast } from "@/lib/color";

// Renders a composed plan: elements placed on a grid, rather than sections
// picked off a shelf.
//
// Everything here is deliberately dumb. All the design lives in the plan. The
// only judgements this file makes are the ones a model should never be trusted
// with: contrast, responsive collapse, and the type scale.

type Ctx = {
  palette: Palette;
  accent: string;
  headingClass: string;
  eyebrowClass: string;
  photos: Record<string, string>;
};

type Surface = { bg: string; ink: string; inkMuted: string; card: string; border: string; accent: string };

function surfaceFor(ctx: Ctx, band: ComposedSection["band"]): Surface {
  const p = ctx.palette;
  if (band === "deep") {
    return {
      bg: p.surfaceDeep,
      ink: p.inkOnDeep,
      inkMuted: p.inkMutedOnDeep,
      card: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.14)",
      // The palette accent usually fails contrast on the deep band, so it is
      // lifted rather than used raw. This is exactly the kind of decision the
      // model must not be allowed to make.
      accent: ensureContrast(ctx.accent, p.surfaceDeep, 3),
    };
  }
  if (band === "accent") {
    return {
      bg: ctx.accent,
      ink: p.onAccent,
      inkMuted: p.onAccent,
      card: "rgba(255,255,255,0.12)",
      border: "rgba(255,255,255,0.25)",
      accent: p.onAccent,
    };
  }
  const bg = band === "tinted" ? p.surfaceAlt : p.surface;
  return { bg, ink: p.ink, inkMuted: p.inkMuted, card: p.card, border: p.border, accent: ctx.accent };
}

// Fixed steps. The model picks a step, never a size.
const HEADING_SCALE = {
  display: "text-5xl sm:text-7xl leading-[1.02]",
  xl: "text-4xl sm:text-5xl leading-[1.08]",
  lg: "text-3xl sm:text-4xl leading-tight",
  md: "text-xl sm:text-2xl leading-snug",
} as const;

const BODY_SCALE = { lg: "text-lg sm:text-xl", base: "text-base sm:text-lg", sm: "text-sm sm:text-base" } as const;

const ASPECT = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/9]",
  tall: "aspect-[3/4]",
} as const;

const PADDING = { sm: "py-10", md: "py-14 sm:py-16", lg: "py-16 sm:py-24", xl: "py-24 sm:py-32" } as const;
const WIDTH = { narrow: "max-w-3xl", normal: "max-w-5xl", wide: "max-w-6xl", full: "max-w-none" } as const;

function Media({ el, ctx, s }: { el: Extract<ComposedElement, { kind: "media" }>; ctx: Ctx; s: Surface }) {
  const url = ctx.photos[el.slot.slotId];
  const shape =
    el.treatment === "plain"
      ? ""
      : el.treatment === "framed"
        ? "rounded-3xl shadow-2xl shadow-black/25"
        : el.treatment === "bleed"
          ? "rounded-2xl lg:scale-[1.06]"
          : "rounded-2xl";

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- preview route; the live route uses next/image once slots resolve to stored paths.
    return <img src={url} alt={el.slot.brief} className={`w-full ${ASPECT[el.aspect]} object-cover ${shape}`} />;
  }
  return (
    <div
      className={`flex w-full ${ASPECT[el.aspect]} flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-center ${shape}`}
      style={{ borderColor: s.border, backgroundColor: ctx.palette.surfaceAlt }}
    >
      <span className={ctx.eyebrowClass} style={{ color: s.accent }}>Photo needed</span>
      <span className="max-w-xs text-sm" style={{ color: s.inkMuted }}>{el.slot.brief}</span>
    </div>
  );
}

function List({ el, ctx, s }: { el: Extract<ComposedElement, { kind: "list" }>; ctx: Ctx; s: Surface }) {
  if (el.style === "cards") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {el.items.map((item, i) => {
          const Icon = item.icon ? ICONS[item.icon] : null;
          return (
            <div key={i} className="rounded-2xl border p-6" style={{ backgroundColor: s.card, borderColor: s.border }}>
              {Icon && <Icon size={22} aria-hidden style={{ color: s.accent }} />}
              <h3 className={`${Icon ? "mt-4" : ""} text-base font-semibold`} style={{ color: s.ink }}>{item.title}</h3>
              {item.body && <p className="mt-2 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{item.body}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  const Tag = el.style === "numbered" ? "ol" : "ul";
  return (
    <Tag className="flex flex-col">
      {el.items.map((item, i) => {
        const Icon = item.icon ? ICONS[item.icon] : null;
        return (
          <li
            key={i}
            className={
              el.style === "rules"
                ? "border-t py-5"
                : el.style === "plain"
                  ? "py-2.5"
                  : "flex gap-4 py-3"
            }
            style={el.style === "rules" ? { borderColor: s.border } : undefined}
          >
            {el.style === "checks" && (
              <span className="mt-0.5 shrink-0 text-lg font-bold" style={{ color: s.accent }} aria-hidden>✓</span>
            )}
            {el.style === "numbered" && (
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold"
                style={{ backgroundColor: s.accent, color: ctx.palette.onAccent }}
              >
                {i + 1}
              </span>
            )}
            <div>
              <span className="flex items-center gap-2 text-base font-semibold" style={{ color: s.ink }}>
                {Icon && el.style !== "checks" && el.style !== "numbered" && (
                  <Icon size={18} aria-hidden style={{ color: s.accent }} />
                )}
                {item.title}
              </span>
              {item.body && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: s.inkMuted }}>{item.body}</p>}
            </div>
          </li>
        );
      })}
    </Tag>
  );
}

function Element({ el, ctx, s }: { el: ComposedElement; ctx: Ctx; s: Surface }) {
  switch (el.kind) {
    case "eyebrow":
      return <p className={ctx.eyebrowClass} style={{ color: s.accent }}>{el.text}</p>;
    case "heading":
      return (
        <h2 className={`${HEADING_SCALE[el.scale]} ${ctx.headingClass}`} style={{ color: s.ink }}>
          {el.text}
        </h2>
      );
    case "body":
      return (
        <p className={`${BODY_SCALE[el.scale]} leading-relaxed`} style={{ color: s.inkMuted }}>
          {el.text}
        </p>
      );
    case "media":
      return <Media el={el} ctx={ctx} s={s} />;
    case "list":
      return <List el={el} ctx={ctx} s={s} />;
    case "badges":
      return (
        <div className="flex flex-wrap gap-3">
          {el.items.map((b, i) => {
            const Icon = ICONS[b.icon];
            return (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: s.border, backgroundColor: s.card, color: s.ink }}
              >
                <Icon size={16} aria-hidden style={{ color: s.accent }} />
                {b.label}
              </span>
            );
          })}
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 pl-6" style={{ borderColor: s.accent }}>
          <p className="text-xl leading-relaxed sm:text-2xl" style={{ color: s.ink }}>{el.text}</p>
          {el.attribution && (
            <footer className="mt-3 text-sm font-semibold" style={{ color: s.inkMuted }}>{el.attribution}</footer>
          )}
        </blockquote>
      );
  }
}

function Cell({ cell, ctx, s }: { cell: ComposedCell; ctx: Ctx; s: Surface }) {
  // Span and start ride as custom properties consumed by .gp-cell in
  // globals.css. Spans are data, so Tailwind cannot generate the classes at
  // build time, and putting `grid-column` inline would apply it on mobile too,
  // where a span inside a one-column grid creates implicit columns rather than
  // clamping. The CSS only applies the span from the md breakpoint up.
  const align = cell.align === "center" ? "justify-center" : cell.align === "end" ? "justify-end" : "justify-start";
  return (
    <div
      className={`gp-cell flex flex-col ${align}`}
      style={
        {
          "--gp-span": cell.span,
          ...(cell.start ? { "--gp-start": cell.start } : {}),
          order: cell.order,
        } as React.CSSProperties
      }
    >
      <Element el={cell.element} ctx={ctx} s={s} />
    </div>
  );
}

function Section({ section, ctx }: { section: ComposedSection; ctx: Ctx }) {
  const s = surfaceFor(ctx, section.band);
  return (
    <section
      className={`overflow-hidden px-5 sm:px-8 ${PADDING[section.padding]}`}
      style={{ backgroundColor: s.bg }}
    >
      <div
        className={`gp-grid mx-auto gap-6 sm:gap-10 ${WIDTH[section.width]}`}
        style={{ "--gp-cols": section.columns } as React.CSSProperties}
      >
        {section.cells.map((cell, i) => (
          <Cell key={i} cell={cell} ctx={ctx} s={s} />
        ))}
      </div>
    </section>
  );
}

export function ComposedPage({
  plan,
  brandColor,
  photos = {},
  contactActions,
}: {
  plan: ComposedPlan;
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
    headingClass: `${pairing.headingClass} ${pairing.headingTone}`,
    eyebrowClass: pairing.eyebrowClass,
    photos,
  };

  return (
    <main className={pairing.variable} style={{ backgroundColor: palette.surface }}>
      {plan.sections.map((section, i) => (
        <div key={i}>
          <Section section={section} ctx={ctx} />
          {/* Contact actions ride directly under the first section, which is
              always the hero. Placement is ours, not the model's: it was
              decided on conversion grounds in Handoff 02 and is not up for
              negotiation by a design pass. */}
          {i === 0 && contactActions && (
            <div className="px-5 pb-12 sm:px-8" style={{ backgroundColor: palette.surface }}>
              <div className="mx-auto max-w-6xl">{contactActions}</div>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
