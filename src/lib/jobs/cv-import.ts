import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text";
import { sanitizeFreeText, PROVINCE_OPTIONS } from "@/lib/jobs/cv-conversation";

// CV import (pre-launch handoff Job 2): an uploaded PDF or Word CV is
// parsed IN MEMORY into the structured fields and the file is then simply
// garbage-collected -- it is never written to disk or storage and never
// served (a stored file can't be searched or matched, and is a retention
// and scraping liability for no benefit). ID and bank numbers are
// stripped from the raw text BEFORE it goes anywhere near the model, so
// they are never stored in any field at any point.
//
// Extraction is a restate-only job with the same fabrication stakes as
// the other CV AI paths: the model may only carry across what the
// document actually says.
const MODEL = "claude-sonnet-5";

export type ImportedWorkEntry = {
  employer: string;
  role: string;
  start: string;
  end: string | null;
  current: boolean;
  description: string;
};

export type ImportedCvFields = {
  fullName: string | null;
  phone: string | null;
  suburb: string | null;
  province: string | null;
  yearsExperience: number | null;
  summary: string | null;
  skills: string[];
  workHistory: ImportedWorkEntry[];
  /** What the document says they do, for pre-filling the occupation search. */
  occupationHint: string | null;
};

export async function extractTextFromUpload(
  buffer: Buffer,
  filename: string,
): Promise<string | null> {
  const lower = filename.toLowerCase();
  try {
    if (lower.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text ?? null;
      } finally {
        await parser.destroy();
      }
    }
    if (lower.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? null;
    }
    return null;
  } catch (err) {
    console.error("CV file text extraction failed", err);
    return null;
  }
}

/** Null = parsing failed; the caller falls back to the guided build. */
export async function parseCvText(rawText: string): Promise<ImportedCvFields | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // The strip happens on the way IN: an SA CV traditionally carries an ID
  // number, and it must never reach the model, the database, or a log.
  const { text: strippedText } = sanitizeFreeText(rawText);
  const text = strippedText.slice(0, 20000);
  if (text.trim().length < 40) return null;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: "disabled" },
      system:
        "You extract structured fields from the raw text of a South African CV. " +
        "Extract ONLY what the document actually says; never infer, guess, or " +
        "embellish. A field the document does not state is null or empty.\n\n" +
        "Rules:\n" +
        "- fullName: the person's name as written.\n" +
        "- phone: their cellphone number as written, else null. Never an ID number.\n" +
        "- suburb and province: where they live. province must be one of: " +
        PROVINCE_OPTIONS.join(", ") +
        " (else null).\n" +
        "- yearsExperience: only if the document states a number of years, else null.\n" +
        "- summary: their own 'about me' text if present, lightly cleaned for " +
        "spelling only, else null. Never write one for them.\n" +
        "- skills: skills the document lists, as short labels, max 12.\n" +
        "- workHistory: each job with employer, role, start year (string), end year " +
        "or null, current (boolean), and a short description built only from what " +
        "the document says about that job.\n" +
        "- occupationHint: the job title that best describes what they do, taken " +
        "from the document.\n\n" +
        "NEVER include an ID number, bank details, or references' contact details " +
        "anywhere in the output. No em dashes anywhere.\n\n" +
        "Reply with ONLY a JSON object, no markdown fences: " +
        '{"fullName": string|null, "phone": string|null, "suburb": string|null, ' +
        '"province": string|null, "yearsExperience": number|null, "summary": ' +
        'string|null, "skills": string[], "workHistory": [{"employer": string, ' +
        '"role": string, "start": string, "end": string|null, "current": boolean, ' +
        '"description": string}], "occupationHint": string|null}.',
      messages: [{ role: "user", content: text }],
    });

    const block = message.content.find((b) => b.type === "text");
    if (!block) return null;

    const jsonText = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);
    if (typeof parsed !== "object" || parsed === null || !Array.isArray(parsed.workHistory)) {
      return null;
    }

    // Belt and braces: every free-text output field goes through the same
    // strip as anything typed by hand, whatever the model did.
    const clean = (v: unknown, max: number): string | null => {
      const t = sanitizeFreeText(stripEmDashes(String(v ?? ""))).text.trim().slice(0, max);
      return t || null;
    };

    return {
      fullName: clean(parsed.fullName, 80),
      phone: clean(parsed.phone, 20),
      suburb: clean(parsed.suburb, 60),
      province: PROVINCE_OPTIONS.includes(String(parsed.province)) ? String(parsed.province) : null,
      yearsExperience:
        typeof parsed.yearsExperience === "number" && parsed.yearsExperience >= 0 && parsed.yearsExperience < 70
          ? Math.round(parsed.yearsExperience)
          : null,
      summary: clean(parsed.summary, 600),
      skills: (Array.isArray(parsed.skills) ? parsed.skills : [])
        .slice(0, 12)
        .map((s: unknown) => clean(s, 40))
        .filter((s: string | null): s is string => !!s),
      workHistory: parsed.workHistory.slice(0, 10).map((w: Record<string, unknown>) => ({
        employer: clean(w.employer, 80) ?? "",
        role: clean(w.role, 80) ?? "",
        start: clean(w.start, 10) ?? "",
        end: clean(w.end, 10),
        current: Boolean(w.current),
        description: clean(w.description, 400) ?? "",
      })),
      occupationHint: clean(parsed.occupationHint, 80),
    };
  } catch (err) {
    console.error("CV text parse failed", err);
    return null;
  }
}
