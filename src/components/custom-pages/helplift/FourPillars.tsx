import { HeartHandshake, ShoppingBag, GraduationCap, HandHeart } from "lucide-react";
import { HELPLIFT_BLUE, HELPLIFT_LIME_DARK, HELPLIFT_INK, HELPLIFT_CREAM } from "./brand";

// Sec 3 The Four Pillars: their own established framework, as four clear
// cards. Icon-based treatment (three of the four have no supporting photo;
// Skills Development's real photos live in the gallery below).
const PILLARS = [
  {
    icon: HeartHandshake,
    title: "Linking Givers with Receivers",
    body: "A managed voucher programme that connects donor resources directly to the people who need them, with dignity and accountability.",
  },
  {
    icon: ShoppingBag,
    title: "Affordable Charity Stores",
    body: "Dignified, low-cost retail access to essential items — clothing, household goods and more — for families across the Vaal Triangle.",
  },
  {
    icon: GraduationCap,
    title: "Skills Development",
    body: "Knitting, crocheting, sewing and art training that equips participants with practical, self-sustaining skills for the future.",
  },
  {
    icon: HandHeart,
    title: "Emotional Support",
    body: "Professional counselling and emotional support sessions, because real help means caring for people, not just their circumstances.",
  },
];

export function FourPillars() {
  return (
    <section className="px-5 py-14 sm:px-8 sm:py-16" style={{ backgroundColor: HELPLIFT_CREAM }}>
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HELPLIFT_LIME_DARK }}>
            How We Help
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: HELPLIFT_INK }}>
            Four ways we lift the community
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-7">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: `${HELPLIFT_BLUE}14`, color: HELPLIFT_BLUE }}
                >
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-helplift-heading)] text-lg font-bold" style={{ color: HELPLIFT_INK }}>
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
