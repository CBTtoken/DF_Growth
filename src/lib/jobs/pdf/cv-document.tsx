import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// One plain, legible skin -- KatisoBiz's own PDF pattern
// (src/lib/bizup/pdf/document.tsx) offers five, but a first CV has no
// equivalent reason to: nothing here is a brand document a business
// chooses a look for, it's one person's own CV, and "the one that survives
// a cheap printer" (that file's own words for its default skin) is the
// only requirement that actually matters here.

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
  roleLabel: string | null;
  yearsExperience: number | null;
  suburb: string | null;
  province: string | null;
  availabilityLabel: string | null;
  skillLabels: string[];
  workHistory: CvWorkHistoryLine[];
  summary: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  role: { fontSize: 13, marginTop: 2, color: "#333" },
  contact: { marginTop: 6, fontSize: 9, color: "#555" },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#555", letterSpacing: 0.5 },
  line: { borderBottomWidth: 0.5, borderBottomColor: "#ddd", marginTop: 6, marginBottom: 10 },
  job: { marginTop: 10 },
  jobHeader: { flexDirection: "row", justifyContent: "space-between" },
  jobTitle: { fontFamily: "Helvetica-Bold" },
  jobDates: { color: "#666" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  chip: { fontSize: 8.5, color: "#333", backgroundColor: "#f2f2f2", paddingVertical: 3, paddingHorizontal: 7, marginRight: 6, marginBottom: 6, borderRadius: 3 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#999", textAlign: "center" },
});

export function CvDocument({ data }: { data: CvPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{data.fullName}</Text>
        {data.roleLabel && (
          <Text style={styles.role}>
            {data.roleLabel}
            {data.yearsExperience != null ? ` · ${data.yearsExperience} years' experience` : ""}
          </Text>
        )}
        <Text style={styles.contact}>
          {[data.phone, data.email, [data.suburb, data.province].filter(Boolean).join(", ")].filter(Boolean).join("   ·   ")}
        </Text>
        {data.availabilityLabel && <Text style={styles.contact}>Available: {data.availabilityLabel}</Text>}

        {data.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.line} />
            <Text>{data.summary}</Text>
          </View>
        )}

        {data.skillLabels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKILLS</Text>
            <View style={styles.line} />
            <View style={styles.chipRow}>
              {data.skillLabels.map((s, i) => (
                <Text key={i} style={styles.chip}>{s}</Text>
              ))}
            </View>
          </View>
        )}

        {data.workHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WORK HISTORY</Text>
            <View style={styles.line} />
            {data.workHistory.map((w, i) => (
              <View key={i} style={styles.job} wrap={false}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{w.role} &middot; {w.employer}</Text>
                  <Text style={styles.jobDates}>{w.start} to {w.current ? "present" : w.end}</Text>
                </View>
                {w.description ? <Text style={{ marginTop: 2 }}>{w.description}</Text> : null}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>Built with KatisoBiz Jobs</Text>
      </Page>
    </Document>
  );
}
