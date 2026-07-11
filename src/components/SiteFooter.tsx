// Sprint 1, Build Item 9: Privacy Policy and Terms & Conditions must be
// linked from the footer on every page type — marketing homepage,
// onboarding wizard, dashboard, and login. The one page type this doesn't
// cover is a client's own public page (/g/[slug]), which already has its
// own custom footer with a "Manage this page" link — these two links are
// added directly into that existing footer instead of duplicating one here.
export function SiteFooter() {
  return (
    <footer className="mt-auto py-6 text-center text-xs text-gray-400">
      <a href="/privacy" className="underline-offset-2 hover:text-gray-600 hover:underline">
        Privacy Policy
      </a>
      <span aria-hidden> · </span>
      <a href="/terms" className="underline-offset-2 hover:text-gray-600 hover:underline">
        Terms &amp; Conditions
      </a>
    </footer>
  );
}
