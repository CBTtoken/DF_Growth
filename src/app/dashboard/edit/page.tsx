import { permanentRedirect } from "next/navigation";

// Sprint "Member dashboard navigation", 8 August 2026.
//
// Dewald, on a phone: "Your page and Edit your page, is a bit confusing to
// have them in two separate places or even have to menu options?" He was
// right, and they were not even different forms: this route rendered the
// onboarding wizard's own Step1/2/3/5/6 components stacked vertically, the
// same ones the Your page tab now shows one at a time.
//
// So there is one door. This stays as a permanent redirect rather than
// being deleted, per the standing rule about leaving no old traces while
// never leaving a dead link behind: the route was linked from the dashboard
// and from the page checklist for weeks, and members have it bookmarked and
// sitting in their history.
export default function EditPageRedirect() {
  permanentRedirect("/dashboard?tab=your-page");
}
