import Link from "next/link";
import { moxiePath } from "@/lib/moxie/host";

// The magazine's own page chrome, carried onto the website so the two read
// as one publication: a 4mm burnt orange rule at the very top of every
// page, and a charcoal footer bar carrying "moxiemag.co.za, A Smart Value
// Club publication". Both are quoted from the Editorial and Design
// Reference section 6.
//
// Every link is built through moxiePath, so the same component works on
// moxiemag.co.za where the /moxie prefix is stripped, and on the Growth
// hostname where the prefix is what makes the route reachable at all. The
// site is reviewed on one and lives on the other.

export function MoxieTopRule() {
  return <div className="h-2 w-full bg-moxie-orange" aria-hidden />;
}

export async function MoxieHeader({ signedIn = false }: { signedIn?: boolean }) {
  const [home, editions, subscribe, account, login] = await Promise.all([
    moxiePath("/"),
    moxiePath("/editions"),
    moxiePath("/subscribe"),
    moxiePath("/account"),
    moxiePath("/login"),
  ]);

  return (
    <>
      <MoxieTopRule />
      <header className="bg-moxie-charcoal">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href={home} className="inline-flex flex-col">
            <span className="font-moxie-display text-2xl leading-none font-bold tracking-tight text-white sm:text-3xl">
              MOXIE
            </span>
            <span className="font-moxie-label mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-moxie-orange">
              Magazine
            </span>
          </Link>

          <nav className="font-moxie-label flex items-center gap-5 text-xs font-bold uppercase tracking-[0.16em] text-moxie-cream/80 sm:gap-7 sm:text-sm">
            <Link href={editions} className="transition hover:text-white">
              Editions
            </Link>
            <Link href={subscribe} className="transition hover:text-white">
              Subscribe
            </Link>
            <Link
              href={signedIn ? account : login}
              className="bg-moxie-orange px-4 py-2 text-white transition hover:bg-moxie-orange/85"
            >
              {signedIn ? "My account" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}

export async function MoxieFooter() {
  const [editions, subscribe, privacy, terms] = await Promise.all([
    moxiePath("/editions"),
    moxiePath("/subscribe"),
    Promise.resolve("/privacy"),
    Promise.resolve("/terms"),
  ]);

  return (
    <footer className="mt-auto bg-moxie-charcoal">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div>
            <p className="font-moxie-display text-xl font-bold text-white">MOXIE</p>
            <p className="font-moxie-display mt-1 text-base italic text-moxie-cream/70">
              Have the Moxie.
            </p>
          </div>
          <nav className="font-moxie-label flex flex-wrap gap-x-8 gap-y-2 text-xs font-bold uppercase tracking-[0.16em] text-moxie-cream/70">
            <Link href={editions} className="transition hover:text-white">
              Editions
            </Link>
            <Link href={subscribe} className="transition hover:text-white">
              Subscribe
            </Link>
            {/* The company-wide legal pages, deliberately one set for the
                whole business rather than one per product. Served as-is on
                this hostname by the proxy. */}
            <Link href={privacy} className="transition hover:text-white">
              Privacy
            </Link>
            <Link href={terms} className="transition hover:text-white">
              Terms
            </Link>
            <a href="mailto:editor@moxiemag.co.za" className="transition hover:text-white">
              Contact
            </a>
          </nav>
        </div>

        <div className="font-moxie-label mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-moxie-cream/60">
          <p>moxiemag.co.za · A Smart Value Club publication</p>
          <p>&copy; {new Date().getFullYear()} Moxie Magazine</p>
        </div>
      </div>
    </footer>
  );
}
