import Image from "next/image";

// Shared logo/name/social-links bar used at the top of every hero variant —
// factored out once every new template needed its own hero body but the
// same brand identity row, rather than seven copies of the same JSX (this
// exact markup started in ConversionHero.tsx; that one keeps its own inline
// copy since it predates this file and isn't worth the risk of touching
// during this build).
export function HeroBrandBar({
  businessName,
  logoUrl,
  facebookUrl,
  instagramUrl,
  textColor,
}: {
  businessName: string;
  logoUrl: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  textColor: string;
}) {
  const initials = businessName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex items-center gap-2.5 text-base font-semibold tracking-tight sm:text-lg"
        style={{ color: textColor }}
      >
        {logoUrl ? (
          <span className="grid size-10 place-items-center overflow-hidden rounded-md bg-white/90 p-1 shadow-sm ring-1 ring-black/10">
            <Image src={logoUrl} alt={businessName} width={36} height={36} className="size-full object-contain" />
          </span>
        ) : (
          <span
            className="grid size-10 place-items-center rounded-md font-mono text-sm font-bold"
            style={{ backgroundColor: `${textColor}26` }}
          >
            {initials}
          </span>
        )}
        {businessName}
      </span>
      {(facebookUrl || instagramUrl) && (
        <span className="flex items-center gap-2.5 border-l pl-3" style={{ borderColor: `${textColor}40` }}>
          {facebookUrl && (
            <a
              href={facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${businessName} on Facebook`}
              className="opacity-75 transition hover:opacity-100"
              style={{ color: textColor }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
              </svg>
            </a>
          )}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${businessName} on Instagram`}
              className="opacity-75 transition hover:opacity-100"
              style={{ color: textColor }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                <circle cx="12" cy="12" r="4.5" />
                <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          )}
        </span>
      )}
    </div>
  );
}
