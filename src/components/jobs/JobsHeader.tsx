import Link from "next/link";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobsPath } from "@/lib/jobs/host";
import { JobsMark } from "@/components/jobs/JobsMark";

// The role-aware header (handoff Job 8: the main menu differs by who is
// logged in). Anonymous visitors get the two start paths and log in; a
// seeker gets their dashboard; an employer gets theirs. Server-rendered,
// no client JS.
export async function JobsHeader() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let primary: { href: string; label: string } | null = null;
  if (user) {
    const admin = createAdminClient();
    const { data: employer } = await admin
      .from("jobs_employers")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    primary = employer
      ? { href: await jobsPath("/employer"), label: "My jobs" }
      : { href: await jobsPath("/dashboard"), label: "My dashboard" };
  }

  const [homeHref, loginHref, vacanciesHref] = await Promise.all([
    jobsPath("/"),
    jobsPath("/login"),
    jobsPath("/vacancies"),
  ]);

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={homeHref} aria-label="KatisoBiz Jobs home">
          <JobsMark />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href={vacanciesHref} className="text-neutral-600 hover:text-neutral-900">
            Jobs
          </Link>
          {primary ? (
            <Link
              href={primary.href}
              className="rounded-full bg-accent px-4 py-2 text-white transition hover:bg-accent-hover"
            >
              {primary.label}
            </Link>
          ) : (
            <Link href={loginHref} className="text-neutral-600 hover:text-neutral-900">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
