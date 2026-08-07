import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { isCvTemplateId, type CvTemplateId } from "@/lib/jobs/pdf/cv-templates";

// Three skins over one data structure, the same structural pattern as
// KatisoBiz's five document templates (lib/bizup/pdf/document.tsx): the
// content lives in shared blocks, a skin only composes and styles them, so
// no skin can drop a section by accident. Dewald's walkthrough asked for
// "1 or 3 layouts that are crisp, professional and what an employer wants
// to see quickly" -- three, and Clean stays the default because it is the
// one that survives a cheap printer.

export interface CvWorkHistoryLine {
  employer: string;
  role: string;
  start: string;
  end: string | null;
  current: boolean;
  description: string;
}

export interface CvPdfData {
  fullName: string;
  phone: string | null;
  email: string | null;
  /** Up to three positions plus the free-typed one, already joined. */
  roleLine: string | null;
  yearsExperience: number | null;
  suburb: string | null;
  province: string | null;
  availabilityLabel: string | null;
  skillLabels: string[];
  workHistory: CvWorkHistoryLine[];
  summary: string | null;
}

const INK = "#1a1a1a";
const BAND = "#1a1a1a";

function makeStyles(compact: boolean) {
  const s = compact ? 0.82 : 1;
  return StyleSheet.create({
    page: { padding: compact ? 32 : 40, fontSize: 10 * s, fontFamily: "Helvetica", color: INK },
    name: { fontSize: 22 * s, fontFamily: "Helvetica-Bold" },
    role: { fontSize: 13 * s, marginTop: 2, color: "#333" },
    contact: { marginTop: 6 * s, fontSize: 9 * s, color: "#555" },
    section: { marginTop: 18 * s },
    sectionTitle: { fontSize: 9 * s, fontFamily: "Helvetica-Bold", color: "#555", letterSpacing: 0.5 },
    line: { borderBottomWidth: 0.5, borderBottomColor: "#ddd", marginTop: 6 * s, marginBottom: 10 * s },
    job: { marginTop: 10 * s },
    jobHeader: { flexDirection: "row", justifyContent: "space-between" },
    jobTitle: { fontFamily: "Helvetica-Bold" },
    jobDates: { color: "#666" },
    chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 * s },
    chip: {
      fontSize: 8.5 * s,
      color: "#333",
      backgroundColor: "#f2f2f2",
      paddingVertical: 3,
      paddingHorizontal: 7,
      marginRight: 6,
      marginBottom: 6,
      borderRadius: 3,
    },
    footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#999", textAlign: "center" },
  });
}

type Styles = ReturnType<typeof makeStyles>;

// ============================================================
// Shared blocks. Every section lives here; skins compose them.
// ============================================================

function HeaderBlock({ data, styles, onBand = false }: { data: CvPdfData; styles: Styles; onBand?: boolean }) {
  const ink = onBand ? "#ffffff" : undefined;
  const sub = onBand ? "#e5e5e5" : undefined;
  return (
    <View>
      <Text style={[styles.name, ink ? { color: ink } : {}]}>{data.fullName}</Text>
      {data.roleLine && (
        <Text style={[styles.role, sub ? { color: sub } : {}]}>
          {data.roleLine}
          {data.yearsExperience != null ? ` · ${data.yearsExperience} years' experience` : ""}
        </Text>
      )}
      <Text style={[styles.contact, sub ? { color: sub } : {}]}>
        {[data.phone, data.email, [data.suburb, data.province].filter(Boolean).join(", ")].filter(Boolean).join("   ·   ")}
      </Text>
      {data.availabilityLabel && (
        <Text style={[styles.contact, sub ? { color: sub } : {}]}>Available: {data.availabilityLabel}</Text>
      )}
    </View>
  );
}

function AboutBlock({ data, styles }: { data: CvPdfData; styles: Styles }) {
  if (!data.summary) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ABOUT</Text>
      <View style={styles.line} />
      <Text>{data.summary}</Text>
    </View>
  );
}

function SkillsBlock({ data, styles }: { data: CvPdfData; styles: Styles }) {
  if (data.skillLabels.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>SKILLS</Text>
      <View style={styles.line} />
      <View style={styles.chipRow}>
        {data.skillLabels.map((s, i) => (
          <Text key={i} style={styles.chip}>
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

function WorkHistoryBlock({ data, styles }: { data: CvPdfData; styles: Styles }) {
  if (data.workHistory.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>WORK HISTORY</Text>
      <View style={styles.line} />
      {data.workHistory.map((w, i) => (
        <View key={i} style={styles.job} wrap={false}>
          <View style={styles.jobHeader}>
            <Text style={styles.jobTitle}>
              {w.role} &middot; {w.employer}
            </Text>
            <Text style={styles.jobDates}>
              {w.start} to {w.current ? "present" : w.end}
            </Text>
          </View>
          {w.description ? <Text style={{ marginTop: 2 }}>{w.description}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function BrandFooter({ styles }: { styles: Styles }) {
  return (
    <Text style={styles.footer} fixed>
      Built with KatisoBiz Jobs
    </Text>
  );
}

// ============================================================
// The three skins
// ============================================================

function Clean({ data }: { data: CvPdfData }) {
  const styles = makeStyles(false);
  return (
    <Page size="A4" style={styles.page}>
      <HeaderBlock data={data} styles={styles} />
      <AboutBlock data={data} styles={styles} />
      <SkillsBlock data={data} styles={styles} />
      <WorkHistoryBlock data={data} styles={styles} />
      <BrandFooter styles={styles} />
    </Page>
  );
}

function Bold({ data }: { data: CvPdfData }) {
  const styles = makeStyles(false);
  return (
    <Page size="A4" style={[styles.page, { paddingTop: 0 }]}>
      <View style={{ backgroundColor: BAND, marginHorizontal: -40, paddingHorizontal: 40, paddingVertical: 26, marginBottom: 4 }}>
        <HeaderBlock data={data} styles={styles} onBand />
      </View>
      <AboutBlock data={data} styles={styles} />
      <SkillsBlock data={data} styles={styles} />
      <WorkHistoryBlock data={data} styles={styles} />
      <BrandFooter styles={styles} />
    </Page>
  );
}

function Compact({ data }: { data: CvPdfData }) {
  const styles = makeStyles(true);
  return (
    <Page size="A4" style={styles.page}>
      <HeaderBlock data={data} styles={styles} />
      <AboutBlock data={data} styles={styles} />
      <SkillsBlock data={data} styles={styles} />
      <WorkHistoryBlock data={data} styles={styles} />
      <BrandFooter styles={styles} />
    </Page>
  );
}

const SKINS: Record<CvTemplateId, (p: { data: CvPdfData }) => React.ReactElement> = {
  clean: Clean,
  bold: Bold,
  compact: Compact,
};

/**
 * An unrecognised id falls back to Clean rather than failing, same rule as
 * BizUpDocument: a CV can never become unrenderable because a template was
 * retired.
 */
export function CvDocument({ data, templateId }: { data: CvPdfData; templateId?: string | null }) {
  const Skin = isCvTemplateId(templateId) ? SKINS[templateId] : Clean;
  return (
    <Document>
      <Skin data={data} />
    </Document>
  );
}
