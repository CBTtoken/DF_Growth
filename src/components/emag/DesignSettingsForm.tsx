"use client";

import { useState, useTransition } from "react";
import { MoxiePage } from "./Page";
import {
  DESIGN_TOKENS,
  designStyle,
  effective,
  type DesignSettings,
  type DesignToken,
} from "@/lib/emag/design";
import {
  FONT_DEFAULTS,
  FONT_TARGET,
  fontByKey,
  fontValue,
  fontsFor,
  type FontRole,
} from "@/lib/emag/fonts";
import type { RenderedPage } from "@/lib/emag/types";

// The design settings, with a page beside them that changes as you change
// them.
//
// Generated from the token list rather than hand written, so adding a
// control is one entry in lib/emag/design.ts and nothing here. That is what
// keeps this honest as a product for other publications: nobody has to
// remember to add a form field when they add a value.
//
// Nothing saves until Save is pressed, but the preview updates on every
// keystroke, because "make the footer bigger" is a question you answer by
// looking, not by reading a number.

const GROUP_TITLES: Record<string, string> = {
  type: "Sizes",
  page: "The page",
  colour: "Colours",
};

const GROUP_NOTES: Record<string, string> = {
  type: "In points, the unit a printer uses. Body text is the one everything else is judged against.",
  page: "In millimetres. These change the shape of every page in every edition.",
  colour: "Where each colour is used is fixed. Which colour it is, is yours.",
};

const FONT_ROLES: { role: FontRole; label: string; hint: string }[] = [
  {
    role: "display",
    label: "Headlines",
    hint: "Headlines, pull quotes and the logotype. The face a reader notices.",
  },
  {
    role: "body",
    label: "Body text",
    hint: "Running text and standfirsts. Chosen to be read for two thousand words, not admired.",
  },
  {
    role: "label",
    label: "Labels",
    hint: "Kickers, subheadings, captions, the section bar and the footer.",
  },
];

/** The chosen faces, as the custom properties the page reads. */
function fontStyle(settings: DesignSettings): Record<string, string> {
  const style: Record<string, string> = {};
  for (const { role } of FONT_ROLES) {
    const key = settings[`font_${role}`];
    style[FONT_TARGET[role]] = fontValue(fontByKey(key ? String(key) : undefined, role));
  }
  return style;
}

export function DesignSettingsForm({
  publicationId,
  initial,
  samplePage,
  imprint,
  onSave,
}: {
  publicationId: string;
  initial: DesignSettings;
  samplePage: RenderedPage;
  imprint: { site: string; credit: string };
  onSave: (publicationId: string, settings: DesignSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState<DesignSettings>(initial);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = ["type", "page", "colour"] as const;

  function set(key: string, value: string | number) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function reset(token: DesignToken) {
    setSettings((current) => {
      const next = { ...current };
      delete next[token.key];
      return next;
    });
    setMessage(null);
  }

  function save() {
    setError(null);
    startBusy(async () => {
      try {
        await onSave(publicationId, settings);
        setMessage("Saved. Every page in every edition now uses these.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 460px)",
        gap: 28,
        alignItems: "start",
      }}
    >
      <div>
        <div style={panel}>
          <h2 style={panelTitle}>Typefaces</h2>
          <p style={groupNote}>
            Three faces, one for each job. Every one is served from here rather than fetched
            from somewhere else, so a page looks the same on every machine and the PDF can
            embed it.
          </p>

          {FONT_ROLES.map(({ role, label: roleLabel, hint }) => {
            const key = settings[`font_${role}`];
            const current = key ? String(key) : FONT_DEFAULTS[role];

            return (
              <div key={role} style={{ ...row, display: "block" }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>
                  {roleLabel}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#7a7671",
                    margin: "2px 0 8px",
                    lineHeight: 1.4,
                  }}
                >
                  {hint}
                </span>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {fontsFor(role).map((font) => {
                    const active = font.key === current;
                    return (
                      <button
                        key={font.key}
                        type="button"
                        onClick={() => set(`font_${role}`, font.key)}
                        style={{
                          textAlign: "left",
                          border: active ? "2px solid #c85a1e" : "1px solid rgba(30,32,32,0.2)",
                          background: "#fff",
                          padding: active ? "9px 11px" : "10px 12px",
                          cursor: "pointer",
                          flex: "1 1 190px",
                        }}
                      >
                        {/* Set in the face itself, so the choice is made by
                            looking rather than by recognising a name. */}
                        <span
                          style={{
                            display: "block",
                            fontFamily: fontValue(font),
                            fontSize: role === "display" ? 22 : 17,
                            lineHeight: 1.2,
                            marginBottom: 3,
                          }}
                        >
                          {font.label}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 11.5,
                            color: "#7a7671",
                            lineHeight: 1.35,
                          }}
                        >
                          {font.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {groups.map((group) => (
          <div key={group} style={panel}>
            <h2 style={panelTitle}>{GROUP_TITLES[group]}</h2>
            <p style={groupNote}>{GROUP_NOTES[group]}</p>

            {DESIGN_TOKENS.filter((t) => t.group === group).map((token) => {
              const value = effective(settings, token);
              const changed = settings[token.key] !== undefined && settings[token.key] !== "";
              const offStandard =
                token.standard !== undefined && String(value) !== String(token.standard);

              return (
                <div key={token.key} style={row}>
                  <div style={{ flex: "1 1 190px", minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>
                      {token.label}
                    </span>
                    {token.hint ? (
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "#7a7671",
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {token.hint}
                      </span>
                    ) : null}
                    {offStandard ? (
                      <span
                        style={{ display: "block", fontSize: 11.5, color: "#7a5312", marginTop: 3 }}
                      >
                        Moxie&apos;s reference says {token.standard}
                        {token.unit === "pt" || token.unit === "mm" ? token.unit : ""}.
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "0 0 auto" }}>
                    {token.unit === "colour" ? (
                      <>
                        <input
                          type="color"
                          value={String(value)}
                          onChange={(e) => set(token.key, e.target.value)}
                          style={{ ...control, width: 46, padding: 2, height: 32 }}
                        />
                        <input
                          value={String(value)}
                          onChange={(e) => set(token.key, e.target.value)}
                          style={{ ...control, width: 88 }}
                        />
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={String(value)}
                          min={token.min}
                          max={token.max}
                          step={token.step}
                          onChange={(e) => set(token.key, e.target.value)}
                          style={{ ...control, width: 84 }}
                        />
                        <span style={{ fontSize: 12, color: "#7a7671", width: 24 }}>
                          {token.unit === "ratio" ? "" : token.unit}
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => reset(token)}
                      disabled={!changed}
                      style={{ ...resetButton, opacity: changed ? 1 : 0.35 }}
                      title="Back to Moxie's value"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ ...panel, position: "sticky", bottom: 0 }}>
          {error ? (
            <p style={{ ...notice, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p>
          ) : null}
          {message ? (
            <p style={{ ...notice, background: "#eaf5ea", color: "#1f6b2b" }}>{message}</p>
          ) : null}
          <button type="button" onClick={save} disabled={busy} style={saveButton}>
            {busy ? "Saving" : "Save these settings"}
          </button>
        </div>
      </div>

      <div style={{ position: "sticky", top: 20 }}>
        <p style={previewLabel}>Live, at every keystroke</p>
        <div className="mx" style={{ ...designStyle(settings), ...fontStyle(settings) }}>
          <div className="mx-sheet" style={{ ["--mx-zoom" as string]: 0.5, margin: 0 }}>
            <MoxiePage page={samplePage} assets={[]} imprint={imprint} />
          </div>
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

const groupNote = {
  fontSize: 13,
  color: "#6b6864",
  margin: "0 0 14px",
  lineHeight: 1.5,
};

const row = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 14,
  padding: "12px 0",
  borderTop: "1px solid rgba(30,32,32,0.09)",
  flexWrap: "wrap" as const,
};

const control = {
  border: "1px solid rgba(30,32,32,0.25)",
  padding: "6px 8px",
  fontSize: 13.5,
  fontFamily: "inherit",
};

const resetButton = {
  border: "1px solid rgba(30,32,32,0.2)",
  background: "#fff",
  padding: "5px 9px",
  fontSize: 11.5,
  cursor: "pointer",
};

const saveButton = {
  border: 0,
  background: "#c85a1e",
  color: "#fff",
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const notice = { margin: "0 0 10px", padding: "9px 12px", fontSize: 13.5, lineHeight: 1.5 };

const previewLabel = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
  color: "#7a7671",
  margin: "0 0 10px",
};
