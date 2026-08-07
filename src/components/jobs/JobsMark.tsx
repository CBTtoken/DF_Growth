// The KJ placeholder mark (handoff Job 10): drawn in CSS in the KatisoBiz
// family colours, one component so Dewald's real logo swaps in here
// without touching any page. Keep the amber and the ink; they are what
// make it read as the same family as katisobiz.co.za.
export function JobsMark({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 text-lg" : "h-9 w-9 text-base";
  const word = size === "lg" ? "text-lg" : "text-base";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${box} inline-flex items-center justify-center rounded-xl bg-accent font-extrabold text-white shadow-sm`}
      >
        KJ
      </span>
      <span className={`${word} font-extrabold tracking-tight text-neutral-ink`}>
        KatisoBiz <span className="text-accent">Jobs</span>
      </span>
    </span>
  );
}
