import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { HELP_GUIDES, guideBySlug } from "@/lib/svc/help-content";

// A step's screenshot renders only when the file is actually in public/,
// so guides ship complete in words today and pictures drop in as they
// are captured, with no broken images in between.
function imageExists(publicPath: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", publicPath));
  } catch {
    return false;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: svcCanonical(`/help/${guide.slug}`) },
  };
}

// One guide: numbered steps, phone screenshots where they exist, and the
// next guide waiting at the bottom. Built for a mid-range phone held in
// one hand.
export default async function HelpGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const helpHref = await svcPath("/help");
  const contactHref = await svcPath("/contact");
  const index = HELP_GUIDES.findIndex((g) => g.slug === guide!.slug);
  const next = HELP_GUIDES[index + 1];
  const helpBase = helpHref;

  return (
    <div>
      <section className="bg-svc-blue px-4 py-10 text-white sm:py-14">
        <div className="mx-auto w-full max-w-2xl">
          <Link href={helpHref} className="text-sm font-semibold text-white underline">
            Help Centre
          </Link>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/60">{guide!.category}</p>
          <h1 className="mt-1 font-svc-heading text-3xl font-bold">{guide!.title}</h1>
          <p className="mt-2 text-base leading-relaxed text-white/85">{guide!.summary}</p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-2xl">
          <ol className="space-y-8">
            {guide!.steps.map((step, i) => (
              <li key={step.title} className="border-l-4 border-svc-green pl-4">
                <p className="font-svc-heading text-sm font-bold text-svc-green">Step {i + 1}</p>
                <h2 className="mt-1 font-svc-heading text-xl font-bold">{step.title}</h2>
                <p className="mt-2 text-base leading-relaxed">{step.body}</p>
                {step.image && imageExists(step.image) && (
                  <div className="mt-4 inline-block border-4 border-svc-ink/80 bg-white">
                    <Image
                      src={step.image}
                      alt={step.imageAlt ?? step.title}
                      width={360}
                      height={720}
                      className="h-auto w-full max-w-[280px]"
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-12 space-y-3 border-t-2 border-svc-ink/10 pt-6">
            {next && (
              <Link
                href={`${helpBase}/${next.slug}`}
                className="flex min-h-14 items-center justify-between border-2 border-svc-green bg-white/60 px-5 text-base font-semibold text-svc-green hover:bg-svc-green hover:text-white"
              >
                <span>Next guide: {next.title}</span>
                <span aria-hidden>&gt;</span>
              </Link>
            )}
            <Link
              href={contactHref}
              className="flex min-h-14 items-center justify-center bg-svc-green px-5 text-base font-semibold text-white hover:bg-svc-ink"
            >
              Still stuck? Talk to a person
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
