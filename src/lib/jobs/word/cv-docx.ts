// The CV as a Word document: all five templates, from the same assembly
// as the PDF (handoff Job 3).
//
// This used to be one layout, deliberately close to the old Clean PDF
// skin, on the reasoning that Word is the format people edit onward so it
// should get the plainest look. That reasoning is now wrong in a way that
// matters: Job 4 recommends Word for an online application portal, which
// makes .docx the format an employer's software is MOST likely to read.
// A person who picked Trades and got a Word file laid out as Clean got a
// different document from the one they chose, in the format that counts.
//
// So both formats render every template, from one assembly, and the
// structural rules are identical in both:
//
//   Single column. Real paragraphs, never a table.
//   No text boxes, no floating frames, no icons, no images.
//   Standard headings. Dates MM/YYYY. 10 to 12pt body. 0.5 to 1 inch margins.
//
// The docx library makes it easy to reach for a Table for the header, and
// nothing here does. A Table in a .docx is the single most common reason
// an applicant tracking system returns a scrambled CV.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
  convertInchesToTwip,
} from "docx";
import { SECTION_HEADINGS, type CvAssembly } from "@/lib/jobs/cv-assembly";
import { isCvTemplateId, type CvTemplateId } from "@/lib/jobs/pdf/cv-templates";

const INK = "1A1A1A";
const MUTED = "4A4A4A";
const AMBER = "E8821A";
const RULE = "C9C9C9";

// docx sizes are half-points: 22 is 11pt. The floor is 20, which is 10pt,
// the same floor the PDF renderer holds to.
interface WordSkin {
  font: string;
  /** Half-points. */
  body: number;
  margin: number;
  rule: boolean;
  band: boolean;
  tradesOrder: boolean;
}

// Georgia, Calibri and Arial are the handoff's approved three. Unlike the
// PDF renderer, Word resolves fonts on the reader's own machine, so these
// are the real names rather than a core-font stand-in.
const SKINS: Record<CvTemplateId, WordSkin> = {
  plain: { font: "Calibri", body: 22, margin: 1, rule: false, band: false, tradesOrder: false },
  clean: { font: "Georgia", body: 22, margin: 1, rule: true, band: false, tradesOrder: false },
  amber: { font: "Calibri", body: 22, margin: 0.9, rule: false, band: true, tradesOrder: false },
  compact: { font: "Arial", body: 20, margin: 0.6, rule: false, band: false, tradesOrder: false },
  trades: { font: "Calibri", body: 22, margin: 0.9, rule: true, band: false, tradesOrder: true },
};

export async function buildCvDocx(a: CvAssembly, templateId?: string | null): Promise<Buffer> {
  const skin = SKINS[isCvTemplateId(templateId) ? templateId : "clean"];
  const { font, body } = skin;

  const text = (
    content: string,
    opts?: { bold?: boolean; size?: number; color?: string },
  ): TextRun =>
    new TextRun({
      text: content,
      bold: opts?.bold,
      size: opts?.size ?? body,
      color: opts?.color ?? INK,
      font,
    });

  const line = (content: string, opts?: { bold?: boolean; size?: number; color?: string; after?: number }) =>
    new Paragraph({ spacing: { after: opts?.after ?? 60 }, children: [text(content, opts)] });

  const sectionTitle = (heading: string): Paragraph =>
    new Paragraph({
      spacing: { before: 300, after: skin.rule ? 40 : 80 },
      border: skin.rule
        ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE } }
        : undefined,
      children: [text(heading.toUpperCase(), { bold: true, size: body - 2 })],
    });

  // ------------------------------------------------------------
  // Header: the top third of page one, same fixed order as the PDF.
  // On Amber the band is a shaded PARAGRAPH, not a shape and not a
  // table cell, so it carries real extractable text.
  // ------------------------------------------------------------
  const { header } = a;
  const onBand = skin.band;
  const headerInk = onBand ? "FFFFFF" : INK;
  const headerMuted = onBand ? "FDF3E6" : MUTED;
  const shading = onBand
    ? { type: ShadingType.CLEAR, color: "auto", fill: AMBER }
    : undefined;

  const headerParagraph = (content: string, opts: { bold?: boolean; size?: number; muted?: boolean }) =>
    new Paragraph({
      spacing: { after: 40 },
      shading,
      children: [
        text(content, {
          bold: opts.bold,
          size: opts.size,
          color: opts.muted ? headerMuted : headerInk,
        }),
      ],
    });

  const children: Paragraph[] = [
    headerParagraph(header.fullName, { bold: true, size: body * 2 }),
  ];

  const roleLine = [header.headline, ...header.otherRoles].filter(Boolean).join(" | ");
  if (roleLine) children.push(headerParagraph(roleLine, { bold: true, size: body + 4 }));

  const place = [header.area, header.yearsLine].filter(Boolean).join("  |  ");
  if (place) children.push(headerParagraph(place, { muted: true }));

  const contact = [header.phone, header.email].filter(Boolean).join("  |  ");
  if (contact) children.push(headerParagraph(contact, { muted: true }));

  if (header.availability) {
    children.push(headerParagraph(`Available: ${header.availability}`, { muted: true }));
  }
  if (header.topSkills.length > 0) {
    children.push(headerParagraph(header.topSkills.join("  |  "), {}));
  }

  // ------------------------------------------------------------
  // Sections. Each returns an empty array when it has nothing in it,
  // which is how "no heading with nothing under it, ever" is kept.
  // ------------------------------------------------------------
  const summarySection = (): Paragraph[] =>
    a.summary ? [sectionTitle(SECTION_HEADINGS.summary), line(a.summary)] : [];

  const workSection = (): Paragraph[] => {
    if (a.work.length === 0) return [];
    const out: Paragraph[] = [sectionTitle(SECTION_HEADINGS.work)];
    for (const job of a.work) {
      out.push(
        new Paragraph({
          spacing: { before: 180, after: 20 },
          keepNext: true,
          children: [text([job.role, job.employer].filter(Boolean).join(", "), { bold: true })],
        }),
      );
      if (job.dates) out.push(line(job.dates, { color: MUTED, size: body - 2, after: 40 }));
      for (const b of job.bullets) {
        // A hyphen and a hanging indent, not a numbering reference: Word's
        // list numbering is stored away from the text and some parsers
        // drop it, taking the indentation and leaving the bullets running
        // together as one paragraph.
        out.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: convertInchesToTwip(0.2), hanging: convertInchesToTwip(0.2) },
            children: [text(`- ${b}`)],
          }),
        );
      }
    }
    return out;
  };

  const skillsSection = (): Paragraph[] => {
    if (a.practicalSkills.length === 0 && a.workingSkills.length === 0) return [];
    const out: Paragraph[] = [sectionTitle(SECTION_HEADINGS.skills)];
    if (a.practicalSkills.length > 0) {
      out.push(line("Practical skills", { bold: true, after: 20 }));
      out.push(line(a.practicalSkills.join(", ")));
    }
    if (a.workingSkills.length > 0) {
      out.push(line("Working skills", { bold: true, after: 20 }));
      out.push(line(a.workingSkills.join(", ")));
    }
    return out;
  };

  const listSection = (heading: string, items: string[]): Paragraph[] =>
    items.length === 0 ? [] : [sectionTitle(heading), ...items.map((i) => line(i))];

  const educationSection = () => listSection(SECTION_HEADINGS.education, a.education);
  const certificationsSection = () => listSection(SECTION_HEADINGS.certifications, a.certifications);

  const bodySections = skin.tradesOrder
    ? [summarySection(), skillsSection(), certificationsSection(), workSection(), educationSection()]
    : [summarySection(), workSection(), skillsSection(), educationSection(), certificationsSection()];

  for (const section of bodySections) children.push(...section);

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      children: [text("CV built free on KatisoBiz Jobs, jobs.katisobiz.co.za", { size: 16, color: "999999" })],
    }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(skin.margin),
              bottom: convertInchesToTwip(skin.margin),
              left: convertInchesToTwip(skin.margin),
              right: convertInchesToTwip(skin.margin),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
