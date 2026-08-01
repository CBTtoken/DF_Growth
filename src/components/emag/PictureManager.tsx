"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { describeSize, downscaleForPrint } from "@/lib/emag/downscale";
import type { Asset } from "@/lib/emag/types";

// Uploading a picture and saying where it goes.
//
// The file goes straight from the browser to Supabase Storage rather than
// through a server action, because a server action has a body size limit
// that a 20 megapixel photograph will walk straight through. What reaches
// the server is the path and the placement, which are small.
//
// Every control here is the publisher's decision. Nothing is inferred and
// nothing is chosen for them: the same article with the same settings has
// to render identically every time, and that is only true if placement is
// data rather than judgement.

type Props = {
  articleId: string;
  assets: Asset[];
  onRequestUpload: (articleId: string, extension: string) => Promise<{ path: string; token: string }>;
  onSave: (
    articleId: string,
    asset: Omit<Asset, "id" | "src"> & { id?: string; storagePath: string }
  ) => Promise<string>;
  onDelete: (articleId: string, assetId: string) => Promise<void>;
};

export function PictureManager({ articleId, assets, onRequestUpload, onSave, onDelete }: Props) {
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Open while there is nothing here, so the way in is obvious. Closed once
  // there are pictures, so it stops eating the screen while writing.
  const [open, setOpen] = useState(assets.length === 0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // The server authorises the upload and hands back a signed URL. The
    // file then goes straight from here to storage, so a large photograph
    // never travels through a server action's body limit, and storage does
    // not need a policy encoding who may write.
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
    const { path, token } = await onRequestUpload(articleId, extension);

    const { error: uploadError } = await supabase.storage
      .from("emag-assets")
      .uploadToSignedUrl(path, token, shrunk.file, { contentType: shrunk.contentType });

    if (uploadError) throw new Error(`Could not upload: ${uploadError.message}`);
    return path;
  }

  /**
   * Takes everything that was chosen, not just the first one.
   *
   * Uploaded one after another rather than all at once. A publisher on a
   * South African connection choosing six photographs would otherwise open
   * six simultaneous uploads that all crawl, and the browser would look
   * frozen for the whole of it.
   */
  function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const chosen = Array.from(files);

    startBusy(async () => {
      try {
        for (const file of chosen) {
          const path = await upload(file);
          await onSave(articleId, {
            storagePath: path,
            alt: "",
            slot: "inline",
            side: "full",
            wrap: false,
            widthPct: 100,
          });
        }
        if (fileRef.current) fileRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not upload that picture.");
      }
    });
  }

  function patch(asset: Asset, changes: Partial<Asset>) {
    startBusy(async () => {
      try {
        const next = { ...asset, ...changes };
        await onSave(articleId, {
          id: asset.id,
          // The stored path is recovered from the public URL the asset was
          // loaded with, so this component never has to carry both.
          storagePath: asset.src.split("/emag-assets/")[1],
          alt: next.alt,
          caption: next.caption,
          captionStyle: next.captionStyle,
          // Listed explicitly like everything else, and forgetting it here
          // is why the edge kept snapping back to none: the control set it,
          // the save left it out, and the page reloaded with the old value.
          // A hand written field list is a place to forget a field, which
          // is worth remembering the next time one is added.
          finish: next.finish,
          slot: next.slot,
          side: next.side,
          wrap: next.wrap,
          widthPct: next.widthPct,
          heightMm: next.heightMm,
          overlay: next.overlay,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save that change.");
      }
    });
  }

  return (
    <div style={panel}>
      {/* Collapsed by default once there are pictures.
          Dewald: "the top part where images are loaded does not collapse,
          still shows big blocks and makes the scrolling not better". Each
          picture carries eight controls, so three pictures filled a screen
          before the article even started. Open it when you are placing a
          picture, close it while you are writing. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          width: "100%",
          border: 0,
          background: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        <span style={panelTitle}>
          {open ? "▾" : "▸"} Pictures
        </span>
        <span style={{ fontSize: 13, color: "#6b6864" }}>
          {assets.length === 0
            ? "none yet"
            : `${assets.length} uploaded${open ? "" : ", tap to open"}`}
        </span>
      </button>

      {!open ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {assets.map((asset) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={asset.id}
              src={asset.src}
              alt={asset.alt}
              title={asset.alt || asset.caption || "Untitled"}
              style={{ width: 52, height: 40, objectFit: "cover" }}
            />
          ))}
        </div>
      ) : null}

      {open ? (
      <>
      <h2 style={{ ...panelTitle, position: "absolute", left: -10000 }}>Pictures</h2>

      {error ? <p style={{ ...notice, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p> : null}
      {note ? <p style={{ ...notice, background: "#eaf5ea", color: "#1f6b2b" }}>{note}</p> : null}

      {/* A button, not a bare file input.
          Dewald, 1 August 2026: "your photo upload logic wasn't logical but
          I figured it out, maybe at the top make the space where you upload
          photos more obvious, like a button, Add Images". He was right. A
          browser's default file control is a small grey rectangle followed
          by the words "No file chosen", which reads as a status rather than
          as something to press.
          The input sits inside the label, so the whole button is the target
          and there is no id to keep in step with a htmlFor. */}
      <label style={{ ...addButton, opacity: busy ? 0.55 : 1 }}>
        {busy ? "Uploading" : "+ Add images"}
        <input
          ref={fileRef}
          type="file"
          // Everything the browser calls an image. Naming three formats here
          // meant the file picker greyed out anything else, so a photograph
          // straight off a phone could not even be selected, which is one of
          // the reasons "I still cannot add an image" was a fair report.
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => onPick(e.target.files)}
          style={hiddenInput}
        />
      </label>

      <p style={{ fontSize: 12.5, color: "#6b6864", margin: "10px 0 14px", lineHeight: 1.5 }}>
        Choose several at once if you like. Each is brought down to page size before it is
        sent, so a big photograph does not slow the edition down. Once a picture is here, add
        an Image block in the body to place it, or pick it as the hero above.
      </p>

      {assets.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "#6b6864", margin: 0 }}>
          Nothing uploaded yet.
        </p>
      ) : null}

      {assets.map((asset) => (
        <div key={asset.id} style={card}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.src}
              alt={asset.alt}
              style={{ width: 92, height: 68, objectFit: "cover", flex: "0 0 auto" }}
            />
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <label style={label}>
                What is in the picture
                <input
                  defaultValue={asset.alt}
                  onBlur={(e) => patch(asset, { alt: e.target.value })}
                  placeholder="Described for a reader who cannot see it"
                  style={input}
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label style={{ ...label, flex: "3 1 200px" }}>
                  Caption
                  <input
                    defaultValue={asset.caption ?? ""}
                    onBlur={(e) => patch(asset, { caption: e.target.value })}
                    placeholder="The line under the picture, giving it context"
                    style={input}
                  />
                </label>
                <label style={{ ...label, flex: "1 1 110px" }}>
                  Set in
                  <select
                    value={asset.captionStyle ?? "regular"}
                    onChange={(e) =>
                      patch(asset, { captionStyle: e.target.value as Asset["captionStyle"] })
                    }
                    style={input}
                  >
                    <option value="italic">Italic</option>
                    <option value="regular">Regular</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <label style={{ ...label, flex: "1 1 120px" }}>
              Sits
              <select
                value={asset.side}
                onChange={(e) => patch(asset, { side: e.target.value as Asset["side"] })}
                style={input}
              >
                <option value="full">Across the column</option>
                <option value="left">On the left</option>
                <option value="right">On the right</option>
              </select>
            </label>

            <label style={{ ...label, flex: "1 1 120px" }}>
              Text wraps
              <select
                value={asset.wrap ? "yes" : "no"}
                onChange={(e) => patch(asset, { wrap: e.target.value === "yes" })}
                style={input}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>

            <label style={{ ...label, flex: "1 1 110px" }}>
              Width
              <select
                value={String(asset.widthPct ?? 100)}
                onChange={(e) => patch(asset, { widthPct: Number(e.target.value) })}
                style={input}
              >
                {[25, 30, 34, 40, 50, 60, 75, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}%
                  </option>
                ))}
              </select>
            </label>

            {/* The same control that sits on the image block, repeated here
                where every other setting for a picture lives. Dewald went
                looking for it in this panel, which is where it belongs. */}
            <label style={{ ...label, flex: "1 1 150px" }}>
              Edge
              <select
                value={asset.finish ?? "none"}
                onChange={(e) => patch(asset, { finish: e.target.value as Asset["finish"] })}
                style={input}
              >
                <option value="none">Straight to the page</option>
                <option value="rule">A hairline around it</option>
                <option value="shadow">A soft shadow</option>
                <option value="rounded">Rounded corners and a shadow</option>
                <option value="framed">White border and shadow</option>
              </select>
            </label>

            <label style={{ ...label, flex: "1 1 110px" }}>
              Hero height
              <select
                value={String(asset.heightMm ?? "")}
                onChange={(e) =>
                  patch(asset, { heightMm: e.target.value ? Number(e.target.value) : undefined })
                }
                style={input}
              >
                <option value="">Not a hero</option>
                {[45, 52, 70, 90, 120, 157].map((n) => (
                  <option key={n} value={n}>
                    {n}mm
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ ...label, flex: "2 1 180px" }}>
              Text over the picture
              <input
                defaultValue={asset.overlay?.text ?? ""}
                onBlur={(e) =>
                  patch(asset, {
                    overlay: e.target.value
                      ? { text: e.target.value, color: asset.overlay?.color ?? "#ffffff" }
                      : undefined,
                  })
                }
                style={input}
              />
            </label>
            <label style={{ ...label, flex: "0 0 90px" }}>
              Its colour
              <input
                type="color"
                value={asset.overlay?.color ?? "#ffffff"}
                onChange={(e) =>
                  patch(asset, {
                    overlay: { text: asset.overlay?.text ?? "", color: e.target.value },
                  })
                }
                style={{ ...input, padding: 2, height: 34 }}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(articleId, asset.id)}
              style={{ ...tinyButton, color: "#8a1f1f", marginBottom: 10 }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      </>
      ) : null}
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
  margin: "0 0 12px",
};

const card = {
  border: "1px solid rgba(30,32,32,0.14)",
  padding: "10px 12px",
  marginBottom: 10,
};

const label = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: "#4a4744",
  marginBottom: 8,
};

const input = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid rgba(30,32,32,0.25)",
  padding: "7px 9px",
  marginTop: 3,
  fontSize: 13.5,
  fontFamily: "inherit",
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

// Kept in the layout rather than display:none, because a hidden input that
// is removed from the layout is not focusable and the button stops being
// reachable by keyboard.
const hiddenInput = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  opacity: 0,
};

const tinyButton = {
  border: "1px solid rgba(30,32,32,0.2)",
  background: "#fff",
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};

const notice = { margin: "0 0 10px", padding: "9px 12px", fontSize: 13.5, lineHeight: 1.5 };
