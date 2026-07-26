import Image from "next/image";
import { agentInitials } from "@/lib/agent-page/identity";
import { SAND, type AgentAccent } from "@/lib/agent-page/themes";

// The hero portrait from the Bolt design: a 4:5 frame with a soft rotated
// panel offset behind it, and the "active since" badge floating off the
// bottom left corner.
//
// The photo is shown as it is, in colour. An earlier version put a duotone
// over it to unify the two very different snapshots on file, which solved a
// real problem, but this design surrounds the photo with warm sand and a
// tinted panel instead, and that does the same job without recolouring
// someone's face.
export function AgentPortrait({
  photoUrl,
  fullName,
  accent,
  activeSince,
}: {
  photoUrl: string | null;
  fullName: string;
  accent: AgentAccent;
  activeSince: string | null;
}) {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
      {/* The offset panel. Purely decorative, so it is hidden from
          assistive tech and sits behind the frame. */}
      <div
        aria-hidden
        className="absolute -inset-3 -rotate-2 rounded-[2rem]"
        style={{ background: `linear-gradient(135deg, ${accent[200]}99, ${SAND[300]}99)` }}
      />

      <div
        className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-white/60 shadow-[0_2px_4px_rgba(26,23,20,0.06),0_18px_40px_rgba(26,23,20,0.12)]"
        style={{ backgroundColor: SAND[100] }}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={fullName}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 420px"
            className="object-cover object-top"
          />
        ) : (
          // The Bolt file shows a "photo appears here" placeholder, which
          // is right in a design preview and wrong on a live page: it tells
          // a customer the page is unfinished. Initials on the agent's own
          // colour read as a deliberate mark instead, and it is still never
          // a stock photo of a stranger.
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent[700]}, ${accent[950]})` }}
          >
            <span aria-hidden className="font-display text-[clamp(3.5rem,14vw,6rem)] font-semibold text-white/90">
              {agentInitials(fullName)}
            </span>
            <span className="sr-only">{fullName}</span>
          </div>
        )}
      </div>

      {activeSince && (
        <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-[0_1px_2px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.06)] sm:-left-6">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden>
            <path
              d="M12 2.5l2.2 1.6 2.7-.3 1 2.5 2.4 1.3-.7 2.6.7 2.6-2.4 1.3-1 2.5-2.7-.3L12 21.5l-2.2-1.6-2.7.3-1-2.5-2.4-1.3.7-2.6-.7-2.6 2.4-1.3 1-2.5 2.7.3z"
              fill={accent[600]}
            />
            <path d="M8.8 12.2l2.1 2.1 4.3-4.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: INK_TEXT }}>
            Active since {activeSince}
          </span>
        </div>
      )}
    </div>
  );
}

const INK_TEXT = "#1a1714";
