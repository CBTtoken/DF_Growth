"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStep3, type OnboardState } from "@/app/onboard/actions";
import { ensureContrast, readableTextOn } from "@/lib/color";

export function Step3BrandKit({
  initialPrimaryColor,
  initialSecondaryColor,
  initialLogoUrl,
  onSuccess,
}: {
  initialPrimaryColor: string;
  initialSecondaryColor: string;
  initialLogoUrl: string | null;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep3, null);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  // Same adjustment the live page applies automatically — shown here so the
  // client can see up front that a hard-to-read color choice still comes
  // out readable, rather than only discovering it after publishing.
  const safeAccent = ensureContrast(primaryColor, "#ffffff");
  const wasAdjusted = safeAccent.toLowerCase() !== primaryColor.toLowerCase();
  const heroTextColor = readableTextOn(primaryColor);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Brand kit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Two colors and an optional logo are enough to make your landing page and social assets
          feel like you.
        </p>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-4 text-sm font-medium text-gray-700">
          Primary color
          <input
            type="color"
            name="brandPrimaryColor"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            required
            className="h-10 w-20 cursor-pointer rounded-lg border border-gray-200"
          />
        </label>
      </div>
      {state?.error?.brandPrimaryColor && (
        <p className="text-xs text-red-600">{state.error.brandPrimaryColor[0]}</p>
      )}

      <label className="flex items-center gap-4 text-sm font-medium text-gray-700">
        Secondary color
        <input
          type="color"
          name="brandSecondaryColor"
          value={secondaryColor}
          onChange={(e) => setSecondaryColor(e.target.value)}
          required
          className="h-10 w-20 cursor-pointer rounded-lg border border-gray-200"
        />
      </label>
      {state?.error?.brandSecondaryColor && (
        <p className="text-xs text-red-600">{state.error.brandSecondaryColor[0]}</p>
      )}

      {/* Live preview — a miniature of the real hero, so a color choice is
          judged against how it actually renders, not just the picker swatch.
          Explicitly labeled as a mockup after this confused a real client in
          testing ("what is this for?") — the sample text isn't obviously
          fake without it. */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Preview — not your real content, just showing how these colors will look
        </p>
        <div
          className="flex flex-col items-center gap-2 rounded-2xl p-6 text-center"
          style={{ backgroundColor: primaryColor }}
        >
          <span
            className="rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: secondaryColor, color: ensureContrast(primaryColor, secondaryColor) }}
          >
            Get Started
          </span>
          <p className="text-lg font-bold" style={{ color: heroTextColor }}>
            Example headline
          </p>
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: safeAccent }}>
            01 — About
          </span>
          <span className="text-xs text-gray-400">on a white section, like most of the page</span>
        </div>
      </div>
      {wasAdjusted && (
        <p className="text-xs text-gray-500">
          Your primary color is quite light, so small text on white sections is automatically
          shown a bit darker (like above) to stay readable — the color itself doesn&apos;t change
          anywhere else.
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Logo <span className="font-normal text-gray-400">(optional)</span>
        <div className="flex items-center gap-4">
          {logoPreview && (
            // eslint-disable-next-line @next/next/no-img-element -- preview can be a local blob: URL, next/image can't handle that
            <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded-lg border border-gray-200 object-contain" />
          )}
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setLogoPreview(URL.createObjectURL(file));
            }}
            className="text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>
        <span className="text-xs font-normal text-gray-400">PNG, JPG, WebP, or SVG — under 2MB</span>
      </div>
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
