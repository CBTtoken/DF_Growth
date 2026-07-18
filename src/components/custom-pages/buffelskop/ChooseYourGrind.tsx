import Image from "next/image";

const GRINDS = [
  {
    name: "Fine Powder",
    image: "/custom-pages/buffelskop/fine-bag.jpg",
    idealFor: ["Spice blends", "Sauces", "Marinades", "Seasonings", "Food manufacturing"],
  },
  {
    name: "Coarse Powder",
    image: "/custom-pages/buffelskop/coarse-bag.jpg",
    idealFor: ["BBQ rubs", "Biltong spices", "Meat seasoning", "Gourmet cooking", "Restaurant kitchens"],
  },
];

export function ChooseYourGrind() {
  return (
    <section className="bg-[#1C1410] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E7B36A]">Two Grinds, One Standard</p>
          <h2 className="mt-3 font-[family-name:var(--font-buffelskop-serif)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Choose Your Grind
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {GRINDS.map((grind) => (
            <div
              key={grind.name}
              className="overflow-hidden rounded-3xl border border-white/10 bg-[#241A13] shadow-xl shadow-black/40"
            >
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={grind.image}
                  alt={`Buffelskop ${grind.name.toLowerCase()} sundried cayenne chilli`}
                  fill
                  sizes="(min-width: 640px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-4 p-8">
                <h3 className="font-[family-name:var(--font-buffelskop-serif)] text-2xl font-semibold text-white">
                  {grind.name}
                </h3>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E7B36A]">Ideal for</p>
                <ul className="flex flex-col gap-2">
                  {grind.idealFor.map((use) => (
                    <li key={use} className="flex items-center gap-2.5 text-sm text-white/80">
                      <span aria-hidden className="text-[#E7B36A]">
                        &#10003;
                      </span>
                      {use}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
