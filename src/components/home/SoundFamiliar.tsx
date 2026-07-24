import Image from "next/image";
import { Check } from "lucide-react";
import { HOME_IMAGES } from "@/lib/home/media";

const painPoints = [
  "It's 9pm and you're still replying to WhatsApp messages about tomorrow's booking.",
  "Your best post is three scrolls down a Facebook feed by the time anyone new sees it.",
  "A competitor with a worse product wins the sale, only because they had somewhere to send people.",
  'Someone asks "do you have a website?" and you don\'t know what to say.',
];

export function SoundFamiliar() {
  const img = HOME_IMAGES.soundFamiliar;

  return (
    <section className="bg-white py-10 lg:py-14 border-b border-neutral-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          {/* Photo */}
          <div className="order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-card-hover aspect-[4/3]">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-ink/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-bold text-base lg:text-lg leading-tight">
                  You didn&apos;t start your business to become a marketer.
                </p>
              </div>
            </div>
          </div>

          {/* Text + checklist */}
          <div className="order-1 lg:order-2">
            <p className="section-eyebrow">Sound Familiar?</p>
            <h2 className="section-heading text-2xl lg:text-3xl mb-3">You&apos;re Great At What You Do</h2>
            <p className="text-sm text-neutral-mid leading-relaxed mb-5">
              You didn&apos;t start your business to become a marketer. You started it because you&apos;re good
              at what you do, not because you wanted a second job replying to messages at midnight and
              hoping the right people see your next post before it disappears. DigitalFlyer gives your
              business the one thing every one of those moments was missing: a real place customers can
              find you, trust you, and reach you, whether you&apos;re online to answer or not.
            </p>

            <div className="bg-neutral-light border border-neutral-border rounded-xl p-4 lg:p-5">
              <ul className="space-y-3">
                {painPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center mt-0.5">
                      <Check size={13} className="text-white" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-neutral-ink leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
