import Image from "next/image";
import type { AgentTheme } from "@/lib/agent-page/themes";
import { agentInitials } from "@/lib/agent-page/identity";

// Agent page v3. The portrait shrank: v1 gave it a full 4:5 frame beside
// the hero headline, v3 puts it in a 44px chip above the headline, because
// the headline is the largest thing on the page and the chip only has to
// establish who is speaking before getting out of the way.
//
// The duotone survives that shrink and is still worth it. Agent portraits
// are phone snapshots, not studio work: of the two real ones on file, one
// is a mid-shot at a restaurant table and the other a tight indoor selfie,
// each with its own background, framing and colour cast. Mapping both onto
// two stops of the theme colour is what stops a page looking like it has
// someone's Facebook photo pasted into it, and it matters more at chip size
// than less, because a busy background at 44px is just noise.
//
// How the blend works: the frame is filled with the highlight stop, the
// greyscaled photo multiplies onto it (white pixels become the highlight,
// black stays black), then the shadow stop lightens over the top (black
// pixels become the shadow, anything brighter is untouched). A true
// two-stop duotone rather than a colour wash, which is what keeps a face
// legible. `isolate` is load-bearing: without it the blend reaches past the
// frame and picks up whatever is behind it.
// The initials size cannot be a percentage: a percentage font-size
// resolves against the inherited font size, not the box, so it would come
// out the same few pixels in both the 44px chip and the 64px avatar. Two
// named sizes instead, since those are the only two the page uses.
const MONOGRAM_TEXT: Record<"chip" | "avatar", string> = {
  chip: "text-base",
  avatar: "text-2xl",
};

export function AgentPortrait({
  photoUrl,
  fullName,
  theme,
  rounded = "xl",
  size = "chip",
  priority = false,
}: {
  photoUrl: string | null;
  fullName: string;
  theme: AgentTheme;
  rounded?: "xl" | "full";
  size?: "chip" | "avatar";
  priority?: boolean;
}) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-2xl";

  if (!photoUrl) {
    return <AgentMonogram fullName={fullName} theme={theme} rounded={rounded} size={size} />;
  }

  return (
    <div
      className={`relative isolate h-full w-full overflow-hidden ${radius}`}
      style={{ backgroundColor: theme.duotoneHighlight }}
    >
      <Image
        src={photoUrl}
        alt={fullName}
        fill
        priority={priority}
        sizes="96px"
        className="object-cover object-top"
        style={{ filter: "grayscale(1) contrast(1.08)", mixBlendMode: "multiply" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: theme.duotoneShadow, mixBlendMode: "lighten" }}
      />
      <div aria-hidden className={`absolute inset-0 ${radius} ring-1 ring-inset ring-black/10`} />
    </div>
  );
}

// Build spec 1.5: for agents with no photo. Explicitly not a stock photo of
// a stranger, and explicitly the same dimensions and framing a portrait
// occupies, so the layout never looks broken by its absence.
//
// The geometric pattern v1 drew inside this is gone: at 44px it was
// invisible noise. Initials on the theme's deep stop is what actually
// reads at chip size.
export function AgentMonogram({
  fullName,
  theme,
  rounded = "xl",
  size = "chip",
}: {
  fullName: string;
  theme: AgentTheme;
  rounded?: "xl" | "full";
  size?: "chip" | "avatar";
}) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-2xl";

  return (
    <div
      className={`flex h-full w-full items-center justify-center overflow-hidden ${radius}`}
      style={{ backgroundColor: theme.heroDeep }}
    >
      <span
        className={`font-[family-name:var(--font-display)] ${MONOGRAM_TEXT[size]} leading-none tracking-tight text-white`}
        aria-hidden
      >
        {agentInitials(fullName)}
      </span>
      <span className="sr-only">{fullName}</span>
    </div>
  );
}
