import Image from "next/image";
import type { AgentPalette } from "@/lib/agent-page/palette";
import { agentInitials } from "@/lib/agent-page/identity";

// Agent Programme Phase 1, the design decision the whole page hangs on.
//
// Agent portraits are phone snapshots, not studio work: of the two real
// ones on file, one is a mid-shot at a restaurant table and the other a
// tight indoor selfie, each with its own background, framing and colour
// cast. Dropped in raw they read as someone's Facebook photo pasted onto a
// page. The accent duotone maps every photo onto the same two stops of the
// agent's own accent colour, and the fixed 4:5 frame gives both of those
// shots the same crop, so a casual snapshot arrives looking deliberate and
// ten different agents' pages still look like one product.
//
// How the blend works: the frame is filled with the highlight stop, the
// greyscaled photo multiplies onto it (white pixels become the highlight,
// black stays black), then the shadow stop lightens over the top (black
// pixels become the shadow, anything brighter is untouched). The result is
// a true two-stop duotone rather than a colour wash, which is what keeps a
// face legible instead of flattening it. `isolate` is load-bearing: without
// it the blend reaches past the frame and picks up the hero field behind.
export function AgentPortrait({
  photoUrl,
  fullName,
  palette,
  priority = false,
}: {
  photoUrl: string | null;
  fullName: string;
  palette: AgentPalette;
  priority?: boolean;
}) {
  if (!photoUrl) {
    return <AgentMonogram fullName={fullName} palette={palette} />;
  }

  return (
    <div
      className="relative isolate aspect-[4/5] w-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: palette.duotoneHighlight }}
    >
      <Image
        src={photoUrl}
        alt={fullName}
        fill
        priority={priority}
        sizes="(max-width: 640px) 92vw, 420px"
        className="object-cover object-top"
        style={{ filter: "grayscale(1) contrast(1.08)", mixBlendMode: "multiply" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: palette.duotoneShadow, mixBlendMode: "lighten" }}
      />
      {/* Hairline inside the frame rather than a border on it, so the
          rounded corner stays clean over the hero field behind. */}
      <div aria-hidden className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />
    </div>
  );
}

// Sec 1.5: for agents with no photo. Explicitly not a stock photo of a
// stranger, and explicitly the same dimensions and framing a portrait
// occupies, so the hero layout never looks broken by its absence.
export function AgentMonogram({ fullName, palette }: { fullName: string; palette: AgentPalette }) {
  const initials = agentInitials(fullName);

  return (
    <div
      className="relative isolate flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl"
      style={{ backgroundColor: palette.heroDeep }}
    >
      <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="agent-monogram-rules" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M-2 12 L12 -2 M0 14 L14 0 M2 16 L16 2" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#agent-monogram-rules)" />
        {/* Two off-centre rings, the same geometry the badge would be
            struck with. Kept faint so the initials stay the only thing
            actually read at a glance. */}
        <circle cx="50%" cy="42%" r="34%" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
        <circle cx="50%" cy="42%" r="44%" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
      </svg>

      <span
        className="font-[family-name:var(--font-display)] text-[clamp(4rem,22vw,8rem)] leading-none tracking-tight text-white"
        aria-hidden
      >
        {initials}
      </span>
      <span className="sr-only">{fullName}</span>

      <span className="absolute bottom-5 left-0 right-0 text-center text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/55">
        DigitalFlyer SA
      </span>
    </div>
  );
}
