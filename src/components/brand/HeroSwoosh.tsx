// Abstract, not a redraw of the logo itself — just echoes the same
// flowing-motion language as the paper-airplane trail, in the site's own
// two accent colors. Decorative only, so it's aria-hidden.
export function HeroSwoosh() {
  return (
    <svg
      viewBox="0 0 600 600"
      aria-hidden
      className="pointer-events-none absolute -right-24 -top-24 h-[480px] w-[480px] opacity-90 sm:h-[600px] sm:w-[600px]"
    >
      <path
        d="M80 460C220 460 260 380 200 300C150 234 230 160 340 160C420 160 480 210 520 280"
        fill="none"
        stroke="#f2994a"
        strokeWidth="34"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M40 360C170 360 210 290 160 220C120 164 190 100 290 100"
        fill="none"
        stroke="#ffffff"
        strokeWidth="20"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
