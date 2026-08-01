"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { describeSize, downscaleForPrint } from "@/lib/emag/downscale";

// The cover, and every advertiser's artwork, in one place.
//
// The upload goes through a signed link the server hands out, the same way
// an article's pictures do: the browser sends the file straight to storage,
// so a 40 megapixel photograph never has to travel through a server action.

type Ad = {
  id: string;
  advertiser: string;
  format: string;
  formatLabel: string;
  positionCode: string | null;
  artwork: string | null;
};

export function EditionPictures({
  editionId,
  cover,
  ads,
  accessCode,
  onRequestUpload,
  onSetCover,
  onSetArtwork,
  onRename,
  onSetAccessCode,
}: {
  editionId: string;
  cover: string | null;
  ads: Ad[];
  accessCode: string;
  onRequestUpload: (editionId: string, extension: string) => Promise<{ path: string; token: string }>;
  onSetCover: (editionId: string, path: string) => Promise<void>;
  onSetArtwork: (editionId: string, adId: string, path: string) => Promise<void>;
  onRename: (editionId: string, adId: string, name: string) => Promise<void>;
  onSetAccessCode: (editionId: string, code: string) => Promise<void>;
}) {
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [code, setCode] = useState(accessCode);
  const coverRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    // Brought down to page size before it is sent. A camera file is far
    // larger than any page can use, and shipping it whole would make the
    // published edition slow to open on the phones most readers use.
    const shrunk = await downscaleForPrint(file);
    if (shrunk.resized) {
      setNote(
        `Resized from ${describeSize(shrunk.before)} to ${describeSize(shrunk.after)} for the page.`
      );
    }

    const extension = shrunk.contentType === "image/png" ? "png" : shrunk.contentType === "application/pdf" ? "pdf" : "jpg";
    const { path, token } = await onRequestUpload(editionId, extension);

    const { error: uploadError } = await supabase.storage
      .from("emag-assets")
      .uploadToSignedUrl(path, token, shrunk.file, { contentType: shrunk.contentType });

    // Surfaced in full rather than as "could not upload". The most common
    // cause is a format the bucket does not accept, and a reader of that
    // message can act on it only if it says which.
    if (uploadError) throw new Error(uploadError.message);
    return path;
  }

  function run(work: () => Promise<void>) {
    setError(null);
    startBusy(async () => {
      try {
        await work();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      {error ? <p style={{ ...notice, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p> : null}
      {note ? <p style={{ ...notice, background: "#eaf5ea", color: "#1f6b2b" }}>{note}</p> : null}

      <div style={panel}>
        <h2 style={panelTitle}>Cover</h2>
        <p style={hint}>
          Fills the whole front page. The masthead, the cover line and the also-in-this-edition
          list sit over it, so leave room at the top and the bottom. Portrait, and at least
          2480 by 3508 for a sharp page.
        </p>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="The cover" style={{ width: 120, height: 170, objectFit: "cover" }} />
          ) : (
            <div style={placeholder}>No cover yet</div>
          )}
          <label style={{ ...addButton, opacity: busy ? 0.55 : 1 }}>
            {busy ? "Uploading" : cover ? "Replace the cover" : "+ Add a cover"}
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                run(async () => {
                  const path = await upload(file);
                  await onSetCover(editionId, path);
                  if (coverRef.current) coverRef.current.value = "";
                });
              }}
              style={hiddenInput}
            />
          </label>
        </div>
      </div>

      <div style={panel}>
        <h2 style={panelTitle}>Advertisements</h2>
        <p style={hint}>
          Advertisers supply finished artwork and Moxie does not design it. Full page is 210 by
          297mm with 3mm bleed, half horizontal 210 by 148.5mm, half vertical 105 by 297mm,
          quarter 105 by 148.5mm. RGB, 300dpi.
        </p>

        {ads.length === 0 ? (
          <p style={{ ...hint, margin: 0 }}>
            No advertisement slots in this edition yet. They come from the flatplan.
          </p>
        ) : null}

        {ads.map((ad) => (
          <div key={ad.id} style={card}>
            {ad.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.artwork}
                alt={ad.advertiser}
                style={{ width: 88, height: 120, objectFit: "contain", background: "#f2efea" }}
              />
            ) : (
              <div style={{ ...placeholder, width: 88, height: 120, fontSize: 11 }}>
                No artwork
              </div>
            )}

            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <input
                defaultValue={ad.advertiser}
                onBlur={(e) => run(() => onRename(editionId, ad.id, e.target.value))}
                style={{ ...input, fontWeight: 700 }}
              />
              <p style={{ fontSize: 12.5, color: "#6b6864", margin: "6px 0 8px" }}>
                {ad.formatLabel}
                {ad.positionCode ? `, ${ad.positionCode}` : ""}
              </p>
              <label style={{ ...addButton, ...smallButton, opacity: busy ? 0.55 : 1 }}>
                {ad.artwork ? "Replace artwork" : "+ Add artwork"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    run(async () => {
                      const path = await upload(file);
                      await onSetArtwork(editionId, ad.id, path);
                    });
                  }}
                  style={hiddenInput}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div style={panel}>
        <h2 style={panelTitle}>Who can read it</h2>
        <p style={hint}>
          One code, shared with every subscriber alongside the link. A reader enters it once and
          stays in. Leave it empty and anyone with the link can read.
        </p>
        <p style={{ ...hint, marginBottom: 12 }}>
          This is a latch, not a lock. It keeps a forwarded link from being readable by whoever
          finds it. It does not check anybody against your subscriber list, because that list
          lives on another platform, and it will not stop a determined reader passing the code
          on with the link.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="No code, open to anyone with the link"
            style={{ ...input, flex: "1 1 220px" }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => onSetAccessCode(editionId, code))}
            style={saveButton}
          >
            Save the code
          </button>
        </div>
      </div>
    </div>
  );
}

const panel = {
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  padding: "16px 18px",
  marginBottom: 14,
};

const panelTitle = {
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#c85a1e",
  fontWeight: 700,
  margin: "0 0 6px",
};

const hint = { fontSize: 13, color: "#6b6864", margin: "0 0 14px", lineHeight: 1.5 };

const card = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  border: "1px solid rgba(30,32,32,0.14)",
  padding: "12px 14px",
  marginBottom: 10,
};

const placeholder = {
  width: 120,
  height: 170,
  border: "1px dashed rgba(30,32,32,0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  color: "#8a857e",
  textAlign: "center" as const,
  padding: 8,
  boxSizing: "border-box" as const,
};

const input = {
  border: "1px solid rgba(30,32,32,0.25)",
  padding: "8px 10px",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box" as const,
};

const addButton = {
  display: "inline-block",
  background: "#c85a1e",
  color: "#fff",
  padding: "11px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  userSelect: "none" as const,
};

const smallButton = { padding: "8px 14px", fontSize: 13 };

// Kept in the layout rather than display:none, because an input removed
// from the layout is not focusable and the button stops being reachable by
// keyboard.
const hiddenInput = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  opacity: 0,
};

const saveButton = {
  border: 0,
  background: "#1e2020",
  color: "#fff",
  padding: "9px 18px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const notice = { margin: "0 0 12px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.5 };
