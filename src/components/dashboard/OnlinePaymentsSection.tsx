"use client";

import { useActionState, useState, useTransition } from "react";
import { connectBobPay, connectPaystack, disconnectGateway, testSavedGateway } from "@/app/dashboard/shop-actions";

/**
 * Online payments (Handoff Sec 2.2): one recommendation, not a menu.
 *
 * Bob Pay leads because a sole proprietor can apply with an ID, proof of
 * address and a bank statement — no CIPC registration — which is this
 * market. Paystack is offered as the alternative for a member who already
 * has an account there. A member with neither sees a plain-language
 * checklist, not a wall of gateway logos.
 *
 * Nothing here ever holds a saved key: the server actions accept one,
 * test it against the provider, encrypt it, and return only "connected"
 * plus the last four characters.
 */

export type GatewayStatus = {
  bobpay: { connected: boolean; last4: string | null; accountCode: string | null; sandbox: boolean; connectedAt: string | null };
  paystack: { connected: boolean; last4: string | null; connectedAt: string | null };
};

type ConnectState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

export function OnlinePaymentsSection({ gateway }: { gateway: GatewayStatus }) {
  const neither = !gateway.bobpay.connected && !gateway.paystack.connected;
  const [showPaystack, setShowPaystack] = useState(gateway.paystack.connected);

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 text-sm">
      <h3 className="text-sm font-semibold text-gray-800">Online payments</h3>
      <p className="text-xs text-gray-500">
        Connect your own payment account and buyers pay by card, instant EFT, PayShap or Capitec Pay
        at checkout, straight into your account. Without one, your shop still takes orders and you
        arrange payment with each buyer yourself — that works, this is just faster.
      </p>
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Your money never touches DigitalFlyer. Payments go from your buyer to your own account at
        your own provider, and your key is stored encrypted, shown only as its last four characters,
        and removable by you at any time.
      </p>

      {gateway.bobpay.connected ? (
        <ConnectedCard
          title="Bob Pay connected"
          detail={`Key ending ${gateway.bobpay.last4} · account ${gateway.bobpay.accountCode}${gateway.bobpay.sandbox ? " · test mode" : ""}`}
          provider="bobpay"
        />
      ) : (
        <BobPayConnect recommended={neither} />
      )}

      {gateway.paystack.connected ? (
        <ConnectedCard
          title="Paystack connected"
          detail={`Key ending ${gateway.paystack.last4}${gateway.bobpay.connected ? " · Bob Pay takes priority at checkout" : ""}`}
          provider="paystack"
        />
      ) : showPaystack ? (
        <PaystackConnect />
      ) : (
        <button
          type="button"
          onClick={() => setShowPaystack(true)}
          className="self-start text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
        >
          Already have a Paystack account? Connect it instead
        </button>
      )}
    </div>
  );
}

function ConnectedCard({ title, detail, provider }: { title: string; detail: string; provider: "bobpay" | "paystack" }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-green-900">{title}</p>
          <p className="text-xs text-green-800">{detail}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await testSavedGateway(provider);
                setMessage(result.message);
              })
            }
            className="rounded-full border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-900 disabled:opacity-50"
          >
            {pending ? "Testing..." : "Test connection"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Remove this payment connection? Your shop switches back to arranging payment with each buyer.")) return;
              startTransition(async () => {
                await disconnectGateway(provider);
              });
            }}
            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
      {message && <p className="mt-2 text-xs text-green-900">{message}</p>}
    </div>
  );
}

function BobPayConnect({ recommended }: { recommended: boolean }) {
  const [state, formAction, pending] = useActionState<ConnectState, FormData>(connectBobPay, null);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-sm font-semibold text-gray-800">
        Bob Pay {recommended && <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">Recommended</span>}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        South African, no monthly fee, and a sole proprietor can apply without a registered company.
      </p>

      {!open ? (
        <>
          <ol className="mt-2 list-decimal pl-5 text-xs text-gray-600">
            <li>
              Apply at{" "}
              <a href="https://www.bobpay.co.za" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
                bobpay.co.za
              </a>{" "}
              with your ID, proof of where you live, and proof of your bank account. Approval
              usually takes two to three business days.
            </li>
            <li>Once approved, log in to Bob Pay and find your API key under Settings.</li>
            <li>Come back here, paste the key and your account code, and you are taking payments.</li>
          </ol>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white"
          >
            I have my Bob Pay details
          </button>
        </>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-2.5">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            API key
            <input
              name="apiKey"
              required
              autoComplete="off"
              className="h-10 rounded-lg border border-gray-300 px-3 font-mono text-sm text-gray-900"
            />
            {state?.error?.apiKey && <span className="text-red-600">{state.error.apiKey[0]}</span>}
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Account code
            <input
              name="accountCode"
              required
              placeholder="e.g. SAN001"
              autoComplete="off"
              className="h-10 rounded-lg border border-gray-300 px-3 font-mono text-sm uppercase text-gray-900"
            />
            {state?.error?.accountCode && <span className="text-red-600">{state.error.accountCode[0]}</span>}
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" name="sandbox" defaultChecked className="size-4" />
            Test mode (Bob Pay sandbox). Untick once you are ready for real money.
          </label>
          {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Checking with Bob Pay..." : "Connect Bob Pay"}
          </button>
          <p className="text-[11px] text-gray-400">The key is tested with Bob Pay before it is saved, and saved encrypted.</p>
        </form>
      )}
    </div>
  );
}

function PaystackConnect() {
  const [state, formAction, pending] = useActionState<ConnectState, FormData>(connectPaystack, null);

  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-sm font-semibold text-gray-800">Paystack</p>
      <p className="mt-1 text-xs text-gray-600">
        For members who already have a Paystack account. Your secret key is under Settings, API
        Keys &amp; Webhooks in your Paystack dashboard.
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-2.5">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Secret key
          <input
            name="secretKey"
            required
            autoComplete="off"
            placeholder="sk_live_..."
            className="h-10 rounded-lg border border-gray-300 px-3 font-mono text-sm text-gray-900"
          />
          {state?.error?.secretKey && <span className="text-red-600">{state.error.secretKey[0]}</span>}
        </label>
        {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Checking with Paystack..." : "Connect Paystack"}
        </button>
        <p className="text-[11px] text-gray-400">The key is tested with Paystack before it is saved, and saved encrypted.</p>
      </form>
    </div>
  );
}
