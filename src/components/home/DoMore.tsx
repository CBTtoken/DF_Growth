import Image from "next/image";
import { CalendarCheck, ShoppingCart, Megaphone, HandCoins } from "lucide-react";
import { HOME_IMAGES } from "@/lib/home/media";

const items = [
  {
    icon: CalendarCheck,
    title: "Booking",
    body: "A real appointment, rental, or slot calendar built into your page. Visitors see live availability and book directly, no double-bookings, no back-and-forth messaging.",
  },
  {
    icon: ShoppingCart,
    title: "Shop",
    body: "A product catalog and cart built into your page. Add products one at a time or upload many at once, with real stock tracking so you never oversell.",
  },
  {
    icon: Megaphone,
    title: "List Your Event, Free",
    body: "Running a market, workshop or community event? List it on DigitalFlyer at no cost, ever, no account fees, no ticketing step.",
  },
  {
    icon: HandCoins,
    title: "Become An Agent",
    body: "Earn recurring commission promoting DigitalFlyer to your own network, you don't need to be a member yourself to apply.",
  },
];

export function DoMore() {
  const img = HOME_IMAGES.doMore;

  return (
    <section id="do-more" className="bg-neutral-light py-10 lg:py-14 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center mb-6 lg:mb-8">
          <div>
            <p className="section-eyebrow">Built-in Tools</p>
            <h2 className="section-heading text-2xl lg:text-3xl">Do More With Your Page</h2>
            <p className="mt-1.5 text-sm text-neutral-mid leading-relaxed">
              Two extra tools built into Growth and above, no separate setup, no separate login.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-card-hover aspect-[16/9]">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white border border-neutral-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-brand-blue/30 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-blue flex items-center justify-center mb-3">
                  <Icon size={20} className="text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-neutral-ink mb-1.5">{item.title}</h3>
                <p className="text-xs text-neutral-mid leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
