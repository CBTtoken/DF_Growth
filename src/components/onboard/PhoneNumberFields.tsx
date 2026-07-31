"use client";

import { useState } from "react";
import { normaliseSaPhone } from "@/lib/contact/phone";

// Handoff 02 B: the two numbers, wherever they are asked for.
//
// Shared by onboarding and the dashboard so the auto-populate rule, the
// landline exception and the wording cannot drift between the two places a
// member can type their number.

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

export function PhoneNumberFields({
  initialCallPhone,
  initialWhatsappPhone,
  initialHideCallButton = false,
  callError,
  whatsappError,
}: {
  initialCallPhone: string;
  initialWhatsappPhone: string;
  initialHideCallButton?: boolean;
  callError?: string;
  whatsappError?: string;
}) {
  const [callPhone, setCallPhone] = useState(initialCallPhone);
  const [whatsappPhone, setWhatsappPhone] = useState(initialWhatsappPhone);
  // Tracks whether the member has taken control of the WhatsApp field. Once
  // they have, typing in the call field stops overwriting what they chose.
  const [whatsappTouched, setWhatsappTouched] = useState(
    Boolean(initialWhatsappPhone) && initialWhatsappPhone !== initialCallPhone
  );

  const parsedCall = callPhone ? normaliseSaPhone(callPhone) : null;
  const parsedWhatsapp = whatsappPhone ? normaliseSaPhone(whatsappPhone) : null;
  const callIsLandline = parsedCall?.ok && parsedCall.kind === "landline";

  function onCallChange(value: string) {
    setCallPhone(value);
    if (whatsappTouched) return;
    const parsed = normaliseSaPhone(value);
    // The exception the brief calls out: a landline cannot receive WhatsApp,
    // so copying it across would hand the member a button that goes nowhere.
    // Their WhatsApp number is asked for separately instead.
    if (parsed.ok && parsed.kind === "landline") setWhatsappPhone("");
    else setWhatsappPhone(value);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Phone number
        <input
          type="tel"
          name="callPhone"
          value={callPhone}
          onChange={(e) => onCallChange(e.target.value)}
          placeholder="e.g. 082 123 4567"
          className={inputClass}
        />
        <span className="text-xs font-normal text-gray-500">
          This is the number customers use to reach you, and it appears on your page.
        </span>
      </label>
      {callPhone && parsedCall && !parsedCall.ok && (
        <p className="text-xs text-red-600">{parsedCall.error}</p>
      )}
      {callError && <p className="text-xs text-red-600">{callError}</p>}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        WhatsApp number
        <input
          type="tel"
          name="whatsappPhone"
          value={whatsappPhone}
          onChange={(e) => {
            setWhatsappTouched(true);
            setWhatsappPhone(e.target.value);
          }}
          placeholder="e.g. 082 123 4567"
          className={inputClass}
        />
        <span className="text-xs font-normal text-gray-500">
          {callIsLandline
            ? "Your phone number is a landline, which cannot receive WhatsApp. Add the mobile number you use for WhatsApp."
            : "Filled in from your phone number. Change it if WhatsApp goes to a different number."}
        </span>
      </label>
      {whatsappPhone && parsedWhatsapp && !parsedWhatsapp.ok && (
        <p className="text-xs text-red-600">{parsedWhatsapp.error}</p>
      )}
      {whatsappPhone && parsedWhatsapp?.ok && parsedWhatsapp.kind === "landline" && (
        <p className="text-xs text-amber-700">
          That looks like a landline. WhatsApp needs a mobile number, so no WhatsApp button will
          show until this is a mobile.
        </p>
      )}
      {whatsappError && <p className="text-xs text-red-600">{whatsappError}</p>}

      {/* Phrased as hiding, and defaulting to off, deliberately. Most members
          never open this setting, and if the default were WhatsApp only, most
          pages would ship with no call button at all. */}
      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <input
          type="checkbox"
          name="hideCallButton"
          value="on"
          defaultChecked={initialHideCallButton}
          className="mt-0.5 size-4 rounded border-gray-300"
        />
        <span>
          Hide my call button and use WhatsApp only
          <span className="mt-0.5 block text-xs font-normal text-gray-500">
            Your number still shows on the page so people can dial it themselves.
          </span>
        </span>
      </label>
    </div>
  );
}
