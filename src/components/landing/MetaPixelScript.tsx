import Script from "next/script";

// Client-side Meta Pixel, separate from the server-side CAPI in
// lib/meta/capi.ts. Deliberately scoped to the base pixel + automatic
// PageView only — that's the actual value a client-side pixel adds on top
// of CAPI (building retargeting/lookalike audiences from site visitors),
// not re-firing the "Lead" conversion event here too. CAPI already sends
// Lead server-side on form submit; duplicating it client-side would need a
// shared event ID between the two to avoid Meta double-counting the same
// conversion, which is unnecessary complexity for what this is for.
// metaPixelId is validated at save time against /^\d{10,20}$/
// (lib/schemas/meta-ids.ts), so it's safe to inline directly.
export function MetaPixelScript({ pixelId }: { pixelId: string | null }) {
  if (!pixelId) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
