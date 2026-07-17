"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  submitEventNewOrganizer,
  submitEventExistingOrganizer,
  submitEventAsLoggedInUser,
  verifyEventOrganizerSignupOtp,
} from "@/lib/events/actions";
import { EventPhotoUpload } from "@/components/events/EventPhotoUpload";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { CITIES } from "@/lib/cities";
import { EVENT_TYPES } from "@/lib/event-types";

type SubmitResult = Awaited<ReturnType<typeof submitEventNewOrganizer>>;

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";
const sectionClass = "flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8";
const errorClass = "text-xs text-red-600";

// List Your Event Sec 2: three ways to end up here without friction —
// brand-new organiser (signup + OTP), a returning organiser (login), or
// someone already signed in (an existing Growth business owner included)
// who never sees the account section at all. isLoggedIn is resolved
// server-side by the page (src/app/events/new/page.tsx) before this
// renders, so there's no flash of the wrong form.
export function EventSubmissionForm({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);

  const [newState, newAction, newPending] = useActionState(async (_prev: SubmitResult, formData: FormData) => {
    const result = await submitEventNewOrganizer(_prev, formData);
    if (result?.success) {
      setPendingEmail(String(formData.get("email")));
      setEventId(result.eventId ?? null);
      setNeedsReview(!!result.needsReview);
      setStep("otp");
    }
    return result;
  }, null);

  const [existingState, existingAction, existingPending] = useActionState(async (_prev: SubmitResult, formData: FormData) => {
    const result = await submitEventExistingOrganizer(_prev, formData);
    if (result?.success) {
      setEventId(result.eventId ?? null);
      setNeedsReview(!!result.needsReview);
      setStep("done");
    }
    return result;
  }, null);

  const [loggedInState, loggedInAction, loggedInPending] = useActionState(async (_prev: SubmitResult, formData: FormData) => {
    const result = await submitEventAsLoggedInUser(_prev, formData);
    if (result?.success) {
      setEventId(result.eventId ?? null);
      setNeedsReview(!!result.needsReview);
      setStep("done");
    }
    return result;
  }, null);

  const [otpState, otpAction, otpPending] = useActionState(
    async (_prev: Awaited<ReturnType<typeof verifyEventOrganizerSignupOtp>>, formData: FormData) => {
      const result = await verifyEventOrganizerSignupOtp(_prev, formData);
      if (result?.success) setStep("done");
      return result;
    },
    null
  );

  if (step === "done") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand text-2xl text-white">✓</span>
        <h2 className="text-xl font-bold tracking-tight text-ink">
          {needsReview ? "Your event is submitted" : "Your event is live"}
        </h2>
        <p className="max-w-sm text-sm text-gray-500">
          {needsReview
            ? "It needs a quick check from our team before it goes public — usually within a day. You'll be able to see it here once it's live."
            : "It's already visible in the Events section — anyone can find it right now, no waiting."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {eventId && !needsReview && (
            <Link
              href={`/events/${eventId}`}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              View your event
            </Link>
          )}
          <Link
            href="/events"
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300"
          >
            Browse all events
          </Link>
        </div>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-xl text-brand">✓</span>
        <h2 className="text-lg font-bold tracking-tight text-ink">
          {needsReview ? "Your event is submitted!" : "Your event is live!"}
        </h2>
        <p className="text-sm text-gray-500">
          One more thing — enter the 6-digit code we sent to <span className="font-medium text-ink">{pendingEmail}</span> to
          confirm your email, so you can log back in and manage future listings.
          {needsReview && " Your event needs a quick check from our team before it goes public, usually within a day."}
        </p>
        <form action={otpAction} className="flex w-full flex-col gap-3">
          <input type="hidden" name="email" value={pendingEmail} />
          <input
            type="text"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className={`${inputClass} text-center text-lg tracking-[0.3em]`}
          />
          {otpState?.error && <p className={errorClass}>{otpState.error}</p>}
          <button
            type="submit"
            disabled={otpPending}
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {otpPending ? "Confirming…" : "Confirm"}
          </button>
        </form>
        <div className="flex justify-center gap-4 text-xs text-gray-400">
          {eventId && !needsReview && (
            <Link href={`/events/${eventId}`} className="hover:text-brand">
              View your event
            </Link>
          )}
          <Link href="/events" className="hover:text-brand">
            Browse all events
          </Link>
        </div>
      </div>
    );
  }

  const activeState = isLoggedIn ? loggedInState : mode === "new" ? newState : existingState;
  const fieldError = (name: string) => activeState?.error?.[name]?.[0];

  const eventFields = (
    <>
      <section className={sectionClass}>
        <h2 className="text-lg font-bold tracking-tight text-ink">Event details</h2>
        <label className={labelClass}>
          Event name
          <input type="text" name="eventName" required maxLength={150} className={inputClass} />
        </label>
        {fieldError("eventName") && <p className={errorClass}>{fieldError("eventName")}</p>}

        <label className={labelClass}>
          Event type
          <select name="eventType" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select a type
            </option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {fieldError("eventType") && <p className={errorClass}>{fieldError("eventType")}</p>}

        <label className={labelClass}>
          Description
          <textarea name="description" rows={4} maxLength={3000} className={inputClass} />
        </label>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold tracking-tight text-ink">Date &amp; time</h2>
        <p className="text-sm text-gray-500">
          For an event spanning more than one day, set an end date on a later day — a single overnight or multi-day
          event is fine, just enter each start and end once.
        </p>
        <div>
          <span className="text-sm font-medium text-gray-700">Starts</span>
          <div className="mt-1.5 grid gap-4 sm:grid-cols-2">
            <input type="date" name="startDate" required className={inputClass} />
            <input type="time" name="startTime" required className={inputClass} />
          </div>
        </div>
        {(fieldError("startDate") || fieldError("startTime")) && (
          <p className={errorClass}>{fieldError("startDate") || fieldError("startTime")}</p>
        )}
        <div>
          <span className="text-sm font-medium text-gray-700">Ends (optional)</span>
          <div className="mt-1.5 grid gap-4 sm:grid-cols-2">
            <input type="date" name="endDate" className={inputClass} />
            <input type="time" name="endTime" className={inputClass} />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold tracking-tight text-ink">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            City
            <select name="city" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select a city
              </option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Address (optional)
            <input type="text" name="locationAddress" maxLength={300} className={inputClass} />
          </label>
        </div>
        {fieldError("city") && <p className={errorClass}>{fieldError("city")}</p>}
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold tracking-tight text-ink">Photos</h2>
        <EventPhotoUpload />
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold tracking-tight text-ink">Contact &amp; links</h2>
        <label className={labelClass}>
          Contact person (optional)
          <input type="text" name="contactName" maxLength={100} placeholder="Full name" className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Contact email
            <input type="email" name="contactEmail" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Phone (optional)
            <input type="tel" name="contactPhone" className={inputClass} />
          </label>
          <label className={labelClass}>
            WhatsApp (optional)
            <input type="tel" name="contactWhatsapp" className={inputClass} />
          </label>
        </div>
        {fieldError("contactEmail") && <p className={errorClass}>{fieldError("contactEmail")}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Facebook (optional)
            <input type="url" name="facebookUrl" placeholder="https://facebook.com/yourevent" className={inputClass} />
          </label>
          <label className={labelClass}>
            Instagram (optional)
            <input type="url" name="instagramUrl" placeholder="https://instagram.com/yourevent" className={inputClass} />
          </label>
          <label className={labelClass}>
            Website (optional)
            <input type="url" name="websiteUrl" placeholder="https://yourevent.co.za" className={inputClass} />
          </label>
        </div>
        {(fieldError("facebookUrl") || fieldError("instagramUrl") || fieldError("websiteUrl")) && (
          <p className={errorClass}>
            {fieldError("facebookUrl") || fieldError("instagramUrl") || fieldError("websiteUrl")}
          </p>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold tracking-tight text-ink">Tickets</h2>
        <label className={labelClass}>
          Ticket info (optional)
          <input
            type="text"
            name="ticketInfoText"
            maxLength={200}
            placeholder={'e.g. "Free entry," "R50 at the door," "Book via the organiser"'}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Booking link (optional)
          <input
            type="url"
            name="bookingUrl"
            placeholder="https://yourbookingpage.co.za"
            className={inputClass}
          />
        </label>
        {fieldError("bookingUrl") && <p className={errorClass}>{fieldError("bookingUrl")}</p>}
        <p className="text-xs text-gray-400">
          If this is a paid event, add a link where people can book or buy tickets — it&apos;ll show as a &ldquo;Book
          now&rdquo; button. Growth itself doesn&apos;t take payment or bookings for events yet.
        </p>
      </section>

      <TurnstileWidget />
    </>
  );

  const footer = (state: SubmitResult, pending: boolean) => (
    <>
      {state?.error?._form && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{state.error._form[0]}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-center rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish event — it's free"}
      </button>
    </>
  );

  const accountFields = (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-ink">{mode === "new" ? "Create a free account" : "Log in"}</h2>
        <button
          type="button"
          onClick={() => setMode(mode === "new" ? "existing" : "new")}
          className="text-xs font-semibold text-brand hover:underline"
        >
          {mode === "new" ? "Already have an account?" : "New here?"}
        </button>
      </div>
      <p className="text-sm text-gray-500">
        {mode === "new"
          ? "Free, forever — no plan, no payment step, ever."
          : "Log in with your existing DigitalFlyer login — a Growth business account works too."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Email
          <input type="email" name="email" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Password
          <input type="password" name="password" required minLength={mode === "new" ? 8 : undefined} className={inputClass} />
        </label>
      </div>
      {fieldError("email") && <p className={errorClass}>{fieldError("email")}</p>}
      {fieldError("password") && <p className={errorClass}>{fieldError("password")}</p>}
    </section>
  );

  if (isLoggedIn) {
    return (
      <form action={loggedInAction} className="flex flex-col gap-6">
        {eventFields}
        {footer(loggedInState, loggedInPending)}
      </form>
    );
  }

  return mode === "new" ? (
    <form action={newAction} className="flex flex-col gap-6">
      {eventFields}
      {accountFields}
      {footer(newState, newPending)}
    </form>
  ) : (
    <form action={existingAction} className="flex flex-col gap-6">
      {eventFields}
      {accountFields}
      {footer(existingState, existingPending)}
    </form>
  );
}
