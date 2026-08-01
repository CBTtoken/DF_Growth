import Link from "next/link";

// Navigation, on every builder screen.
//
// Dewald, on reaching the sections screen: "there is no navigation to go
// back or another section". He was right, and it is the same mistake the
// KatisoBiz navigation made once already: screens that are each reachable
// from one place and lead nowhere. A publisher who opens a screen to check
// something should not have to use the browser's back button to carry on
// working.
//
// Mounted per screen rather than in the layout because the published
// edition renders through the same layout and must never carry the
// builder's chrome.

type Crumb = { label: string; href?: string };

export function MoxieNav({ trail = [] }: { trail?: Crumb[] }) {
  return (
    <nav
      style={{
        borderBottom: "1px solid rgba(30,32,32,0.14)",
        marginBottom: 22,
        paddingBottom: 12,
      }}
    >
      {/* Kwaai Press is the product. Moxie is a publication inside it.
          Naming them separately here is not decoration: it is the whole
          reason nothing under the surface assumes Moxie, and the moment a
          second magazine exists this bar reads correctly without a change. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "baseline" }}>
        <Link href="/bizup/kwaaipress/moxie" style={brand}>
          Kwaai Press
        </Link>
        <span style={{ ...link, color: "#7a7671" }}>Moxie</span>
        <Link href="/bizup/kwaaipress/moxie/editions" style={link}>
          Editions
        </Link>
        <Link href="/bizup/kwaaipress/moxie/sections" style={link}>
          Sections and layouts
        </Link>
        <Link href="/bizup/kwaaipress/moxie/settings" style={link}>
          Settings
        </Link>
        <Link href="/bizup/kwaaipress/moxie/rebuild" style={link}>
          July rebuild
        </Link>
      </div>

      {trail.length ? (
        <div style={{ marginTop: 10, fontSize: 13, color: "#6b6864" }}>
          {trail.map((crumb, i) => (
            <span key={i}>
              {i > 0 ? <span style={{ margin: "0 7px", opacity: 0.5 }}>/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} style={{ color: "#6b6864" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "#1e2020", fontWeight: 600 }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

const brand = {
  fontSize: 15,
  fontWeight: 700,
  color: "#c85a1e",
  textDecoration: "none",
  letterSpacing: "0.02em",
};

const link = { fontSize: 14, color: "#4a4744", textDecoration: "none" };
