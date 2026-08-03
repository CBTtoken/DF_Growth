import Link from "next/link";
import { moxiePath, MOXIE_ORIGIN } from "@/lib/moxie/host";
import { signOut } from "@/app/moxie/login/actions";

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
            {signedIn ? (
              <MemberMenu accountHref={account} />
            ) : (
              <Link
                href={login}
                className="bg-moxie-orange px-4 py-2 text-white transition hover:bg-moxie-orange/85"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}

/**
 * The signed-in member's menu.
 *
 * Dewald, 3 August: once a subscriber is logged in the header read as a
 * dead end, it looked signed in with no way out and nothing to do. So the
 * orange button becomes a menu: share the magazine, reach the account
 * page, and log out, which existed all along but only at the foot of the
 * account page where nobody looked.
 *
 * A native details/summary rather than a scripted dropdown, so it opens
 * and closes with zero JavaScript. The share links go to the magazine's
 * public front door via MOXIE_ORIGIN, never a preview hostname, because a
 * shared link outlives the session that shared it.
 */
function MemberMenu({ accountHref }: { accountHref: string }) {
  const shareText = `Have you seen Moxie? South Africa's family discovery magazine, a new edition on the 1st of every month. ${MOXIE_ORIGIN}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(MOXIE_ORIGIN)}`;
  const email = `mailto:?subject=${encodeURIComponent("Have you seen Moxie Magazine?")}&body=${encodeURIComponent(shareText)}`;

  const item =
    "block px-4 py-2.5 text-moxie-cream/85 transition hover:bg-white/5 hover:text-white";

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none bg-moxie-orange px-4 py-2 text-white transition hover:bg-moxie-orange/85 [&::-webkit-details-marker]:hidden">
        Member ▾
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 border border-white/10 bg-moxie-charcoal py-2 shadow-2xl">
        <p className="px-4 pb-1 pt-2 text-[0.6rem] tracking-[0.2em] text-moxie-orange">
          Share Moxie with friends
        </p>
        <a href={whatsapp} target="_blank" rel="noreferrer" className={item}>
          Via WhatsApp
        </a>
        <a href={facebook} target="_blank" rel="noreferrer" className={item}>
          Via Facebook
        </a>
        <a href={email} className={item}>
          Via email
        </a>
        <div className="mx-4 my-2 border-t border-white/10" aria-hidden />
        <Link href={accountHref} className={item}>
          My account
        </Link>
        <form action={signOut}>
          <button type="submit" className={`${item} w-full cursor-pointer text-left uppercase`}>
            Log out
          </button>
        </form>
      </div>
    </details>
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
