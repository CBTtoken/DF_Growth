import { HELPLIFT_LIME_DARK, HELPLIFT_INK, HELPLIFT_CREAM } from "./brand";

// Sec 3 Our Story: a shorter version of their own established narrative (the
// "Dr and Shelton" story) as a supporting section beneath the impact
// numbers, in their own voice. The real narrative text was NOT supplied in
// the scope doc — the copy below is a faithful, factual placeholder written
// only from the confirmed description (connecting donor resources to
// community needs). Replace `STORY_PARAGRAPHS` with Helplift's own words
// before publishing; flagged to Dewald.
const STORY_PARAGRAPHS: string[] = [
  "Helplift Network Vaal Triangle began with a simple conviction: that the resources already present in a community — generosity, skill, time, and care — can be connected directly to the people who need them most.",
  "From that idea grew a registered non-profit that links donors and volunteers to real community needs across the Vaal Triangle, through giving, dignified retail, skills training, and emotional support.",
];

export function OurStory() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-24" style={{ backgroundColor: HELPLIFT_CREAM }}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HELPLIFT_LIME_DARK }}>
            Our Story
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: HELPLIFT_INK }}>
            Where it started
          </h2>
        </div>

        <div
          className="mt-8 space-y-5 border-l-4 pl-6 text-lg leading-relaxed text-gray-700"
          style={{ borderColor: HELPLIFT_LIME_DARK }}
        >
          {STORY_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <p className="mt-6 text-sm italic text-gray-400">
          Placeholder narrative — to be replaced with Helplift&rsquo;s own founding story before this page is published.
        </p>
      </div>
    </section>
  );
}
