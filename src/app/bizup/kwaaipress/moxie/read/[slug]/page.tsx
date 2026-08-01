import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublication } from "@/lib/emag/access";
import { assembleEdition } from "@/lib/emag/assemble";
import { MoxiePage } from "@/components/emag/Page";
import { ReaderControls } from "@/components/emag/ReaderControls";
import { CodeGate, hasAccess, submitCode } from "./gate";

// The published edition, as a reader gets it.
//
// No login. There is no subscription check in front of this yet, which is a
// decision not yet made rather than an oversight, and the publish screen
// says so plainly rather than implying a gate that does not exist.
//
// Fixed A4 pages, scrolled. On a phone the reader pinches and zooms, which
// is how every digital magazine works, and what keeps this identical to the
// PDF.

async function findEdition(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("emag_editions")
    .select("id, status, access_code")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await findEdition(slug);
  if (!found || found.status !== "published") return { title: "Not found", robots: { index: false } };

  const [edition, publication] = await Promise.all([assembleEdition(found.id), getPublication()]);
  if (!edition) return { title: "Not found" };

  return {
    title: `${edition.title} | ${publication?.name ?? ""}`,
    description: publication?.definition ?? undefined,
    // The cover is the link preview image, so sharing an edition shows the
    // cover rather than whatever the crawler finds first.
    openGraph: {
      title: `${publication?.name ?? ""}, ${edition.title}`,
      description: publication?.definition ?? undefined,
      images: edition.coverImage ? [edition.coverImage] : undefined,
    },
    // Not indexed while there is no decision on gating. An edition that may
    // become subscriber only should not be in a search index first.
    robots: { index: false, follow: false },
  };
}

export default async function ReadEdition({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findEdition(slug);

  // An unpublished edition is not found rather than forbidden. A reader who
  // guesses a slug should not learn that next month's edition exists.
  if (!found || found.status !== "published") notFound();

  const [edition, publication] = await Promise.all([assembleEdition(found.id), getPublication()]);
  if (!edition) notFound();

  // The latch. An edition with no code is open to anyone with the link, and
  // the publish screen says so rather than implying otherwise.
  if (!(await hasAccess(slug, found.access_code))) {
    async function enter(formData: FormData) {
      "use server";
      const result = await submitCode(
        slug,
        found!.access_code as string,
        String(formData.get("code") ?? "")
      );
      if (result.ok) redirect(`/bizup/kwaaipress/moxie/read/${slug}`);
    }

    return (
      <CodeGate
        slug={slug}
        publication={publication?.name ?? ""}
        title={edition.title}
        action={enter}
      />
    );
  }

  const imprint = {
    site: publication?.site ?? "",
    credit: publication?.footer_credit ?? "",
  };

  return (
    <main className="mx mx-reader">
      <ReaderControls
        title={edition.title}
        publication={publication?.name ?? ""}
        pages={edition.pages.length}
        pdfEnabled={edition.pdfEnabled}
        printHref={`/bizup/kwaaipress/moxie/read/${slug}/print`}
      />

      <div className="mx-reader__deck">
        {edition.pages.map((page, i) => (
          <div key={i} className="mx-sheet mx-reader__sheet">
            <MoxiePage page={page} assets={edition.assets} imprint={imprint} />
          </div>
        ))}
      </div>
    </main>
  );
}
