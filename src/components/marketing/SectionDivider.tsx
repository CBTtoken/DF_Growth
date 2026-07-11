// Real UAT: flat white-space gaps between sections read as empty rather
// than intentional. A thin gradient line with a small centered mark gives
// the page some personality at the seams without adding real visual
// complexity — just brand-colour tints, no new shapes or imagery.
export function SectionDivider() {
  return (
    <div className="relative flex items-center justify-center py-2" aria-hidden>
      <span className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-brand/25 to-transparent" />
      <span className="absolute grid size-2 rotate-45 place-items-center bg-spark" />
    </div>
  );
}
