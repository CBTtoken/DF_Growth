"use client";

import { useActionState } from "react";
import { deskLogin } from "@/app/desk/login/actions";

export default function DeskLoginPage() {
  const [state, formAction, pending] = useActionState(deskLogin, null);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6"
      >
        <h1 className="text-lg font-semibold">The Desk</h1>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="rounded-xl border border-neutral-200 px-4 py-3 text-base outline-none focus:border-neutral-900"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          className="rounded-xl border border-neutral-200 px-4 py-3 text-base outline-none focus:border-neutral-900"
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-neutral-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? "..." : "In"}
        </button>
      </form>
    </main>
  );
}
