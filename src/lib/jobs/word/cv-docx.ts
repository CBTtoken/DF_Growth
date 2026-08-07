// The CV as a Word document (handoff Job 4: PDF and Word, both clean,
// both free). One layout, deliberately close to the Clean PDF template:
// Word is the format people edit onward, so it gets the plainest look
// rather than three skins that would fall apart the moment someone types
// into them.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { CvPdfData } from "@/lib/jobs/pdf/cv-document";

const INK = "1A1A1A";
const MUTED = "555555";

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: MUTED }),
    ],
  });
}

function bodyLine(text: string, opts?: { bold?: boolean; muted?: boolean }): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: 21,
        color: opts?.muted ? MUTED : INK,
      }),
    ],
  });
}

export async function buildCvDocx(data: CvPdfData): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: data.fullName, bold: true, size: 44, color: INK })],
    }),
  ];

  if (data.roleLine) {
    const experience =
      data.yearsExperience != null ? `, ${data.yearsExperience} years' experience` : "";
    children.push(bodyLine(`${data.roleLine}${experience}`, { bold: true }));
  }

  const contactBits = [
    [data.suburb, data.province].filter(Boolean).join(", "),
    data.phone,
    data.email,
    data.availabilityLabel ? `Available: ${data.availabilityLabel}` : null,
  ].filter((b): b is string => !!b);
  if (contactBits.length > 0) {
    children.push(bodyLine(contactBits.join("  ·  "), { muted: true }));
  }

  if (data.summary?.trim()) {
    children.push(sectionTitle("About me"));
    children.push(bodyLine(data.summary.trim()));
  }

  if (data.skillLabels.length > 0) {
    children.push(sectionTitle("Skills"));
    children.push(bodyLine(data.skillLabels.join("  ·  ")));
  }

  if (data.workHistory.length > 0) {
    children.push(sectionTitle("Work history"));
    for (const job of data.workHistory) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 40 },
          children: [
            new TextRun({ text: `${job.role}, ${job.employer}`, bold: true, size: 21, color: INK }),
            new TextRun({
              text: `   ${job.start} to ${job.current ? "present" : (job.end ?? "")}`,
              size: 19,
              color: MUTED,
            }),
          ],
        }),
      );
      if (job.description?.trim()) {
        children.push(bodyLine(job.description.trim()));
      }
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 480 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "CV built free on KatisoBiz Jobs · jobs.katisobiz.co.za",
          size: 16,
          color: "999999",
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
