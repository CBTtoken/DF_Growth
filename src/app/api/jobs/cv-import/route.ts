// The CV upload endpoint (handoff Job 2). The file lives only in this
// request's memory: parsed to text, the text parsed to fields, the
// response returns the fields, and nothing is ever written to disk or
// storage. Turnstile-gated (an anonymous POST that spends AI money is
// exactly what the every-anonymous-form rule exists for) plus a per-IP
// rate limit as the polite first fence.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { extractTextFromUpload, parseCvText } from "@/lib/jobs/cv-import";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`jobs-cv-import:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a while and try again." },
      { status: 429 },
    );
  }

  const formData = await request.formData();

  const token = formData.get("turnstileToken");
  const human = await verifyTurnstileToken(
    typeof token === "string" ? token : null,
    ip,
    "JOBS_TURNSTILE_SECRET_KEY",
  );
  if (!human) {
    return NextResponse.json(
      { error: "The human check did not pass. Please reload and try again." },
      { status: 403 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF or Word file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is too big. 5 MB at most." }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
    return NextResponse.json(
      { error: "Only PDF and Word (.docx) files work. Export your CV as one of those." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractTextFromUpload(buffer, name);
  if (!text || text.trim().length < 40) {
    return NextResponse.json(
      { error: "We could not read that file. If it is a scan or photo, rather build your CV by answering the questions, it takes a few minutes." },
      { status: 422 },
    );
  }

  const fields = await parseCvText(text);
  if (!fields) {
    return NextResponse.json(
      { error: "We could not make sense of that CV. Rather build it by answering the questions, it takes a few minutes." },
      { status: 422 },
    );
  }

  return NextResponse.json({ fields });
}
