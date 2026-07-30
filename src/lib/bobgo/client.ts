import { decrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Bob Go, called with each member's own credentials.
//
// Dewald, 2026-07-30: "we will not let members use our account, they will
// have to get their own accounts." Bob Go issue a bearer token per account,
// so every call in this file is made as the member. Their shipments book on
// their account, their courier bills them, and their name is on the waybill,
// which is the whole point: the parcel and the liability stay together.
//
// Shapes here come from their own Postman collection rather than memory.
// The live and sandbox hosts are the one thing that collection does not
// state outright, so both are configurable and neither is guessed at
// silently: a wrong host fails loudly at connect time rather than quietly
// quoting nothing at somebody's checkout.
const LIVE_HOST = process.env.BOBGO_API_HOST ?? "https://api.bobgo.co.za/v2";
const SANDBOX_HOST = process.env.BOBGO_SANDBOX_API_HOST ?? "https://api.sandbox.bobgo.co.za/v2";

export type BobGoAddress = {
  company?: string;
  street_address: string;
  local_area?: string;
  city: string;
  zone?: string;
  country: string;
  code: string;
};

/**
 * One thing being shipped, as Bob Go's rates-at-checkout wants it.
 *
 * Items, not parcels. Their support email described package sizing as a
 * custom build, but the checkout endpoint takes a list of items with
 * dimensions and works the packing out itself. Parcels only have to be
 * decided later, when a shipment is actually booked.
 */
export type BobGoItem = {
  description: string;
  price: number;
  quantity: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
};

export type BobGoRate = {
  service_level_code?: string;
  service_level_name?: string;
  courier_name?: string;
  rate: number;
  /** Bob Go's own wording for the buyer, when it gives one. */
  service_level_description?: string;
  delivery_estimate?: string;
};

export type BobGoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

function hostFor(sandbox: boolean): string {
  return sandbox ? SANDBOX_HOST : LIVE_HOST;
}

/**
 * One place where a Bob Go call actually happens.
 *
 * Every failure is turned into a message rather than an exception. A courier
 * API being slow or unhappy must never take a member's checkout down with
 * it: the caller decides what to do without a quote, and for us that means
 * falling back to the member's flat delivery charge rather than showing an
 * error to somebody trying to buy something.
 */
async function call<T>(
  token: string,
  sandbox: boolean,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" }
): Promise<BobGoResult<T>> {
  const url = `${hostFor(sandbox)}${path}`;

  try {
    const response = await fetch(url, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      // A buyer is waiting on this. Ten seconds is already a long time to
      // stare at a checkout, and their docs recommend a timeout anyway.
      signal: AbortSignal.timeout(10000),
    });

    const text = await response.text();

    if (!response.ok) {
      // Deliberately does not echo the body wholesale into an error a
      // member might see, since a failed auth response can quote the token
      // back at you.
      const detail =
        response.status === 401 || response.status === 403
          ? "Bob Go rejected the token. It may have been revoked or expired."
          : `Bob Go returned ${response.status}.`;
      return { ok: false, error: detail, status: response.status };
    }

    return { ok: true, data: (text ? JSON.parse(text) : {}) as T };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut ? "Bob Go did not answer in time." : "Could not reach Bob Go.",
    };
  }
}

/**
 * Confirms a token works, by using it.
 *
 * A token that merely looks like a token proves nothing, and the moment to
 * find out it is wrong is while the member is sitting in front of the
 * screen that asked for it, not at a stranger's checkout three days later.
 *
 * Uses a read-only endpoint on purpose. Connecting an account must not
 * create anything on it.
 */
export async function verifyBobGoToken(
  token: string,
  sandbox: boolean
): Promise<BobGoResult<unknown>> {
  return call(token, sandbox, "/shipments?offset=0&limit=1", { method: "GET" });
}

/**
 * Live delivery options for one cart going to one address.
 *
 * Rates at checkout rather than raw rates, deliberately. This endpoint
 * applies the rules the member configured inside Bob Go: their negotiated
 * prices, fixed or formula rates, and the areas they refuse to deliver to.
 * That keeps delivery pricing in one place, owned by the member, instead of
 * us rebuilding a pricing engine they would then have to maintain twice.
 */
export async function getCheckoutRates({
  token,
  sandbox,
  collectionAddress,
  deliveryAddress,
  items,
  declaredValue,
}: {
  token: string;
  sandbox: boolean;
  collectionAddress: BobGoAddress;
  deliveryAddress: BobGoAddress;
  items: BobGoItem[];
  declaredValue: number;
}): Promise<BobGoResult<BobGoRate[]>> {
  const result = await call<{ rates?: BobGoRate[] } | BobGoRate[]>(
    token,
    sandbox,
    "/rates-at-checkout",
    {
      method: "POST",
      body: {
        collection_address: collectionAddress,
        delivery_address: deliveryAddress,
        items,
        declared_value: declaredValue,
        handling_time: 2,
      },
    }
  );

  if (!result.ok) return result;

  // Their examples show a bare array in some places and a wrapped object in
  // others, so both are accepted rather than assuming one and discovering
  // the other in production.
  const payload = result.data;
  const rates = Array.isArray(payload) ? payload : (payload?.rates ?? []);
  return { ok: true, data: rates };
}

/**
 * The member's stored credentials, or null if they have not connected.
 *
 * Returns the decrypted token, so callers must be server side and must not
 * pass it onward. Nothing in the browser ever needs this.
 */
export async function getBobGoCredentials(
  growthClientId: string
): Promise<{ token: string; sandbox: boolean } | null> {
  const admin = createAdminClient();

  const [{ data: client }, { data: secret }] = await Promise.all([
    admin
      .from("growth_clients")
      .select("bobgo_connected_at, bobgo_sandbox")
      .eq("id", growthClientId)
      .maybeSingle(),
    admin
      .from("growth_client_secrets")
      .select("bobgo_token_encrypted")
      .eq("growth_client_id", growthClientId)
      .maybeSingle(),
  ]);

  if (!client?.bobgo_connected_at || !secret?.bobgo_token_encrypted) return null;

  try {
    return { token: decrypt(secret.bobgo_token_encrypted), sandbox: client.bobgo_sandbox !== false };
  } catch (err) {
    // A token that will not decrypt is a token we cannot use. Treated as
    // not connected so checkout falls back, rather than throwing on a page
    // somebody is trying to buy from.
    console.error("Could not decrypt Bob Go token", growthClientId, err);
    return null;
  }
}

/**
 * Records why the last call failed, so a silent outage becomes a visible one.
 *
 * The failure that matters happens at a stranger's checkout, hours after
 * the member last looked at their dashboard. Without this the only symptom
 * of an expired token is that delivery quotes quietly stop appearing.
 */
export async function recordBobGoError(growthClientId: string, error: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("growth_clients")
    .update({ bobgo_last_error: error, bobgo_last_error_at: new Date().toISOString() })
    .eq("id", growthClientId);
}

export async function clearBobGoError(growthClientId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("growth_clients")
    .update({ bobgo_last_error: null, bobgo_last_error_at: null })
    .eq("id", growthClientId);
}
