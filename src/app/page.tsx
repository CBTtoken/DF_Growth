import { permanentRedirect } from "next/navigation";

// Pre-launch SEO audit: redirect() issues a 307 (temporary) by default,
// which tells Google to keep "/" and "/pricing" as separate, competing
// pages rather than folding ranking signal onto one canonical URL. "/"
// pointing at "/pricing" isn't a temporary detour, it's the permanent site
// structure, so this needs the 308 permanentRedirect() actually gives.
export default function Home() {
  permanentRedirect("/pricing");
}
