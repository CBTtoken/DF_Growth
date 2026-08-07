import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobsPath } from "@/lib/jobs/host";
import { JobsNav, type JobsNavLink } from "@/components/jobs/JobsNav";

// Works out who is looking, then hands a finished set of links to the
// client menu. Three audiences, three menus, and never more than four
// everyday links plus the one primary action (INTERFACE-STANDARD.md: no
// screen presents more than about seven things without grouping, and one
// action is obviously the main one).
//
// Every link is resolved through jobsPath() here, on the server, so the
// menu is correct on jobs.katisobiz.co.za and on a preview deployment
// both, and the client component never has to know the hostname rule.

export async function JobsHeader() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [home, vacancies, employers, howItWorks, faq, login, dashboard, myJobs, applicants, findPeople, cv, post] =
    await Promise.all([
      jobsPath("/"),
      jobsPath("/vacancies"),
      jobsPath("/employers"),
      jobsPath("/how-it-works"),
      jobsPath("/faq"),
      jobsPath("/login"),
      jobsPath("/dashboard"),
      jobsPath("/employer"),
      jobsPath("/employer/applicants"),
      jobsPath("/find-people"),
      jobsPath("/cv"),
      jobsPath("/employer/post"),
    ]);

  // Not logged in: the two doors from the home page, plus the two pages
  // that answer "what is this and can I trust it".
  if (!user) {
    const links: JobsNavLink[] = [
      { href: vacancies, label: "Jobs board" },
      { href: employers, label: "I am hiring" },
      { href: howItWorks, label: "How it works" },
      { href: faq, label: "Questions" },
    ];
    return (
      <JobsNav
        homeHref={home}
        links={links}
        primary={{ href: login, label: "Log in" }}
        loggedIn={false}
        accountLabel={null}
      />
    );
  }

  const admin = createAdminClient();
  const [{ data: employer }, { data: candidate }] = await Promise.all([
    admin.from("jobs_employers").select("business_name").eq("owner_user_id", user.id).maybeSingle(),
    admin
      .from("jobs_candidates")
      .select("full_name")
      .eq("owner_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (employer) {
    const links: JobsNavLink[] = [
      { href: applicants, label: "Applicants" },
      { href: post, label: "Post a job" },
      { href: findPeople, label: "Find people" },
      { href: faq, label: "Questions" },
    ];
    return (
      <JobsNav
        homeHref={home}
        links={links}
        primary={{ href: myJobs, label: "My jobs" }}
        loggedIn
        accountLabel={employer.business_name}
      />
    );
  }

  const links: JobsNavLink[] = [
    { href: vacancies, label: "Jobs board" },
    { href: cv, label: "My CV" },
    { href: howItWorks, label: "How it works" },
    { href: faq, label: "Questions" },
  ];
  return (
    <JobsNav
      homeHref={home}
      links={links}
      primary={{ href: dashboard, label: "My dashboard" }}
      loggedIn
      accountLabel={candidate?.full_name ?? user.email ?? null}
    />
  );
}
