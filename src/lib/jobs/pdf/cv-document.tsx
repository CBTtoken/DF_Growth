import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { isCvTemplateId, type CvTemplateId } from "@/lib/jobs/pdf/cv-templates";
import { SECTION_HEADINGS, type CvAssembly } from "@/lib/jobs/cv-assembly";

// Five skins over one assembly. The content lives in shared blocks and a
// skin only chooses order and styling, so no skin can drop a section by
// accident, and no skin can introduce a table, a text box, a sidebar or a
// second column, because none of the blocks below can render one.
//
// Read cv-templates.ts for why those rules exist. The short version: two
// column layouts, tables and text boxes are the highest-frequency cause of
// a CV being scrambled or dropped by applicant tracking software, and the
// worst offenders are the older enterprise systems large South African
// employers still run.
//
// One consequence worth naming, because it looks like a downgrade and is
// not: the old Skills block rendered each skill as a rounded grey chip.
// Chips are decoration built out of background fills, and a parser reads
// them as loose fragments rather than a list. Skills are now one plain
// comma-separated paragraph under a labelled heading, which is duller to
// look at and materially more likely to be read correctly.

// react-pdf ships three core font families and embeds no others without a
// registration step and a font file. Helvetica is the Arial of that set,
// Times-Roman the Georgia. Both are on the handoff's approved list.
const SANS = "Helvetica";
const SANS_BOLD = "Helvetica-Bold";
const SERIF = "Times-Roman";
const SERIF_BOLD = "Times-Bold";

const INK = "#1a1a1a";
const MUTED = "#4a4a4a";
/** The KatisoBiz accent, matching --color-accent in globals.css. */
const AMBER = "#e8821a";

interface SkinConfig {
  serif: boolean;
  /** Multiplies every size and space. Never lets body text below 10pt. */
  scale: number;
  margin: number;
  /** A hairline under each section heading. */
  rule: boolean;
}

function makeStyles({ serif, scale, margin, rule }: SkinConfig) {
  const body = Math.max(10, 11 * scale);
  const family = serif ? SERIF : SANS;
  const familyBold = serif ? SERIF_BOLD : SANS_BOLD;

  return StyleSheet.create({
    page: {
      paddingTop: margin,
      paddingBottom: margin,
      paddingLeft: margin,
      paddingRight: margin,
      fontSize: body,
      fontFamily: family,
      color: INK,
      lineHeight: serif ? 1.45 : 1.35,
    },
    name: { fontSize: body * 2, fontFamily: familyBold, letterSpacing: serif ? 0 : -0.3 },
    headline: { fontSize: body * 1.2, fontFamily: familyBold, marginTop: 3, color: INK },
    headerLine: { fontSize: body, marginTop: 3, color: MUTED },
    headerSkills: { fontSize: body, marginTop: 3, color: INK },
    section: { marginTop: body * 1.5 },
    sectionTitle: {
      fontSize: body,
      fontFamily: familyBold,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: INK,
      marginBottom: rule ? 3 : 5,
    },
    rule: { borderBottomWidth: 0.75, borderBottomColor: "#c9c9c9", marginBottom: 7 },
    paragraph: { marginBottom: 3 },
    job: { marginTop: body * 0.9 },
    jobTitle: { fontFamily: familyBold },
    jobDates: { color: MUTED, marginTop: 1 },
    // A bullet is a paragraph beginning with a hyphen and a space, not a
    // list element and not an icon. A hyphen is in every font and every
    // parser's character set; a real bullet glyph is neither.
    bullet: { marginTop: 3, paddingLeft: 10, textIndent: -10 },
    skillsLabel: { fontFamily: familyBold, marginTop: 5 },
    band: {
      backgroundColor: AMBER,
      marginLeft: -margin,
      marginRight: -margin,
      marginTop: -margin,
      paddingLeft: margin,
      paddingRight: margin,
      paddingTop: margin * 0.75,
      paddingBottom: margin * 0.75,
      marginBottom: body,
    },
    footer: {
      position: "absolute",
      bottom: margin * 0.5,
      left: margin,
      right: margin,
      fontSize: 7.5,
      color: "#999999",
      textAlign: "center",
    },
  });
}

type Styles = ReturnType<typeof makeStyles>;

// ============================================================
// Shared blocks
// ============================================================

/**
 * The top third of page one, in the handoff's fixed order: full name,
 * headline occupation, years of experience, area, contact number and
 * email, and the three top skills. That block is what the six second scan
 * reads, and nothing is allowed to come between it and the top of the
 * page.
 */
function HeaderBlock({
  a,
  styles,
  onBand = false,
}: {
  a: CvAssembly;
  styles: Styles;
  onBand?: boolean;
}) {
  const { header } = a;
  const ink = onBand ? { color: "#ffffff" } : {};
  const muted = onBand ? { color: "#fdf3e6" } : {};

  const roleLine = [header.headline, ...header.otherRoles].filter(Boolean).join(" | ");
  const contact = [header.phone, header.email].filter(Boolean).join("  |  ");
  const place = [header.area, header.yearsLine].filter(Boolean).join("  |  ");

  return (
    <View>
      <Text style={[styles.name, ink]}>{header.fullName}</Text>
      {roleLine ? <Text style={[styles.headline, ink]}>{roleLine}</Text> : null}
      {place ? <Text style={[styles.headerLine, muted]}>{place}</Text> : null}
      {contact ? <Text style={[styles.headerLine, muted]}>{contact}</Text> : null}
      {header.availability ? (
        <Text style={[styles.headerLine, muted]}>Available: {header.availability}</Text>
      ) : null}
      {header.topSkills.length > 0 ? (
        <Text style={[styles.headerSkills, ink]}>{header.topSkills.join("  |  ")}</Text>
      ) : null}
    </View>
  );
}

function SectionTitle({ text, styles, rule }: { text: string; styles: Styles; rule: boolean }) {
  return (
    <>
      <Text style={styles.sectionTitle}>{text}</Text>
      {rule ? <View style={styles.rule} /> : null}
    </>
  );
}

function SummaryBlock({ a, styles, rule }: { a: CvAssembly; styles: Styles; rule: boolean }) {
  if (!a.summary) return null;
  return (
    <View style={styles.section}>
      <SectionTitle text={SECTION_HEADINGS.summary} styles={styles} rule={rule} />
      <Text style={styles.paragraph}>{a.summary}</Text>
    </View>
  );
}

function WorkBlock({ a, styles, rule }: { a: CvAssembly; styles: Styles; rule: boolean }) {
  if (a.work.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionTitle text={SECTION_HEADINGS.work} styles={styles} rule={rule} />
      {a.work.map((w, i) => (
        // wrap={false} on the heading pair only, never on the whole entry:
        // a fifteen-year job with six bullets must be allowed to break
        // across the page rather than being pushed whole onto page two and
        // leaving half a page empty.
        <View key={i} style={styles.job}>
          <View wrap={false}>
            <Text style={styles.jobTitle}>{[w.role, w.employer].filter(Boolean).join(", ")}</Text>
            {w.dates ? <Text style={styles.jobDates}>{w.dates}</Text> : null}
          </View>
          {w.bullets.map((b, j) => (
            <Text key={j} style={styles.bullet}>
              - {b}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function SkillsBlock({ a, styles, rule }: { a: CvAssembly; styles: Styles; rule: boolean }) {
  if (a.practicalSkills.length === 0 && a.workingSkills.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionTitle text={SECTION_HEADINGS.skills} styles={styles} rule={rule} />
      {a.practicalSkills.length > 0 && (
        <>
          <Text style={styles.skillsLabel}>Practical skills</Text>
          <Text style={styles.paragraph}>{a.practicalSkills.join(", ")}</Text>
        </>
      )}
      {a.workingSkills.length > 0 && (
        <>
          <Text style={styles.skillsLabel}>Working skills</Text>
          <Text style={styles.paragraph}>{a.workingSkills.join(", ")}</Text>
        </>
      )}
    </View>
  );
}

function ListBlock({
  heading,
  items,
  styles,
  rule,
}: {
  heading: string;
  items: string[];
  styles: Styles;
  rule: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionTitle text={heading} styles={styles} rule={rule} />
      {items.map((line, i) => (
        <Text key={i} style={styles.paragraph}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function BrandFooter({ styles }: { styles: Styles }) {
  return (
    <Text style={styles.footer} fixed>
      Built free on KatisoBiz Jobs
    </Text>
  );
}

// ============================================================
// The five skins
// ============================================================

/**
 * Every skin renders the same blocks. Only three things vary: the
 * configuration, whether the header sits on a band, and the section
 * order. Anything else varying would be a way for one template to lose
 * content another keeps.
 */
function Skin({
  a,
  config,
  band = false,
  tradesOrder = false,
}: {
  a: CvAssembly;
  config: SkinConfig;
  band?: boolean;
  tradesOrder?: boolean;
}) {
  // Tighten spacing before anything else, exactly as the handoff orders
  // it, and never below 10pt body.
  const styles = makeStyles({ ...config, scale: config.scale * a.fit.density });
  const rule = config.rule;

  const summary = <SummaryBlock key="summary" a={a} styles={styles} rule={rule} />;
  const work = <WorkBlock key="work" a={a} styles={styles} rule={rule} />;
  const skills = <SkillsBlock key="skills" a={a} styles={styles} rule={rule} />;
  const certifications = (
    <ListBlock
      key="certifications"
      heading={SECTION_HEADINGS.certifications}
      items={a.certifications}
      styles={styles}
      rule={rule}
    />
  );
  const education = (
    <ListBlock
      key="education"
      heading={SECTION_HEADINGS.education}
      items={a.education}
      styles={styles}
      rule={rule}
    />
  );

  // Trades: skills, tickets and licences sit directly under the header,
  // above work experience, because for an artisan the ticket is the
  // qualifier and an employer checks it before anything else.
  const body = tradesOrder
    ? [summary, skills, certifications, work, education]
    : [summary, work, skills, education, certifications];

  return (
    <Page size="A4" style={band ? [styles.page, { paddingTop: 0 }] : styles.page}>
      {band ? (
        <View style={styles.band}>
          <HeaderBlock a={a} styles={styles} onBand />
        </View>
      ) : (
        <HeaderBlock a={a} styles={styles} />
      )}
      {body}
      <BrandFooter styles={styles} />
    </Page>
  );
}

const SKINS: Record<CvTemplateId, (p: { a: CvAssembly }) => React.ReactElement> = {
  // No colour, no rules, nothing. The safest possible document.
  plain: ({ a }) => <Skin a={a} config={{ serif: false, scale: 1, margin: 54, rule: false }} />,
  // A serif face and generous leading, with a hairline under each heading.
  clean: ({ a }) => <Skin a={a} config={{ serif: true, scale: 1, margin: 54, rule: true }} />,
  // The house look. The band is a filled paragraph, not a shape.
  amber: ({ a }) => <Skin a={a} config={{ serif: false, scale: 1, margin: 48, rule: false }} band />,
  // For a long history: tighter leading, smaller headings, narrower
  // margins, built to hold fifteen years on two pages. The 10pt floor in
  // makeStyles is what stops "compact" turning into "unreadable".
  compact: ({ a }) => <Skin a={a} config={{ serif: false, scale: 0.92, margin: 36, rule: false }} />,
  // Same single column structure, different section order.
  trades: ({ a }) => (
    <Skin a={a} config={{ serif: false, scale: 1, margin: 48, rule: true }} tradesOrder />
  ),
};

/**
 * An unrecognised id falls back to Clean rather than failing, same rule as
 * BizUpDocument: a CV can never become unrenderable because a template was
 * retired.
 */
export function CvDocument({ a, templateId }: { a: CvAssembly; templateId?: string | null }) {
  const Chosen = isCvTemplateId(templateId) ? SKINS[templateId] : SKINS.clean;
  return (
    <Document title={`${a.header.fullName} CV`} author={a.header.fullName}>
      <Chosen a={a} />
    </Document>
  );
}
