"use client";

// Where the subject of a photograph is.
//
// Image pass, 3 August 2026. A hero or a cover is cropped to fill a fixed
// frame, and object-fit centres that crop. A centred crop is what cuts the
// face out of a portrait shot, and until now the only fix was to re-crop
// the photograph outside the builder. Tap the subject instead: the crop
// keeps that point in view wherever the frame lands.
//
// Deliberately a tap, not a drag. A drag needs pointer capture, move
// handlers and an idea of momentum, and the publisher gains nothing from
// any of it: the subject of a photograph is a place, not a path.

export function FocalPointPicker({
  src,
  alt,
  focalX,
  focalY,
  onChange,
}: {
  src: string;
  alt?: string;
  focalX?: number;
  focalY?: number;
  onChange: (x: number, y: number) => void;
}) {
  const x = focalX ?? 50;
  const y = focalY ?? 50;

  return (
    <div style={{ margin: "4px 0 10px" }}>
      <span style={{ display: "block", fontSize: 12.5, color: "#6b6864", marginBottom: 6, lineHeight: 1.5 }}>
        Tap the picture where its subject is. Wherever the crop lands, that point stays in view.
      </span>
      <button
        type="button"
        aria-label="Set the focal point"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          const py = Math.round(((e.clientY - rect.top) / rect.height) * 100);
          onChange(Math.min(100, Math.max(0, px)), Math.min(100, Math.max(0, py)));
        }}
        style={{
          position: "relative",
          display: "block",
          padding: 0,
          border: "1px solid #d8d4cd",
          background: "none",
          cursor: "crosshair",
          maxWidth: 320,
          width: "100%",
          lineHeight: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} style={{ width: "100%", height: "auto", display: "block" }} />
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "2.5px solid #fff",
            boxShadow: "0 0 0 1.5px #e8590c, 0 1px 4px rgba(0,0,0,0.4)",
            pointerEvents: "none",
          }}
        />
      </button>
    </div>
  );
}
