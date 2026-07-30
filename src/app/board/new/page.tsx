import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PostComposer } from "@/components/board/PostComposer";
import { createBoardPost } from "@/app/board/new/actions";
import { MEMBER_KINDS, PUBLIC_KINDS } from "@/lib/board/kinds";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { currentVisitor } from "@/lib/board/visitor";
import { createAdminClient } from "@/lib/supabase/admin";

// New post, for whoever is reading.
//
// One board means one screen for this. A signed-in member is offered all
// four kinds and posts as his business unless he says otherwise. Anybody
// else is offered the two that make sense for a person, and says who they
// are on the same screen.
export const metadata: Metadata = { title: "New post", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewBoardPostPage() {
  const member = await requireGrowthClientId();
  const visitor = await currentVisitor();

  let businessName: string | null = null;
  let savedCity: string | null = null;

  if (member.id) {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("growth_clients")
      .select("business_name, city")
      .eq("id", member.id)
      .single();
    businessName = client?.business_name ?? null;
    savedCity = client?.city ?? null;
  }

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
        >
          <ChevronLeft size={14} /> The Board
        </Link>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-ink">New post</h1>
        <p className="mt-1 text-sm text-neutral-mid">
          {businessName
            ? `Goes out as ${businessName}, on the board and on your area page.`
            : "Anyone can post here. It goes on the board and on your town's page for ten days."}
        </p>

        <div className="mt-6">
          <PostComposer
            kinds={member.id ? MEMBER_KINDS : PUBLIC_KINDS}
            action={createBoardPost}
            businessName={businessName}
            savedCity={member.id ? savedCity : null}
            needsIdentity={!member.id && !visitor?.email}
          />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
