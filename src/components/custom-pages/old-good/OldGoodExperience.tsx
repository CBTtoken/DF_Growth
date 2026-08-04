"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { placeOldGoodOrder, type OldGoodOrderState } from "./actions";

export type OgItem = {
  id: string;
  slug: string;
  no: string;
  name: string;
  priceCents: number;
  photo: string | null;
  sold: boolean;
  variantId: string | null;
  cat: string;
  shape: string;
  grade: string;
  flaw: string;
  fabric: string;
  era: string;
  measurements: [string, string][];
  blurb: string;
};

export type OgMarket = { name: string; when: string; where: string; note: string };
export type OgDelivery = { id: string; label: string; note: string; priceCents: number };

const HOLD_MS = 15 * 60 * 1000;
const BAG_KEY = "og-bag";

// Garment line drawings from the reference build: the designed empty state.
// A real photo drops into the same slot with no rework (photo !== null).
const SHAPES: Record<string, string> = {
  top: "M31,20 L22,28 L13,52 L25,59 L30,45 L30,106 L70,106 L70,45 L75,59 L87,52 L78,28 L69,20 L50,31 Z M41,23 L50,31 L59,23",
  pants: "M31,18 L69,18 L69,48 L63,110 L53,110 L50,60 L47,110 L37,110 L31,48 Z",
  dress: "M35,20 L27,31 L20,45 L29,50 L34,40 L26,106 L74,106 L66,40 L71,50 L80,45 L73,31 L65,20 L50,29 Z",
  boot: "M35,16 L57,16 L57,56 C57,70 64,74 74,81 L79,91 L79,99 L29,99 L29,60 L35,60 Z",
  belt: "M12,52 L70,52 L70,66 L12,66 Z M70,49 L92,49 L92,69 L70,69 Z M76,55 L88,55 L88,63 L76,63 Z",
  cap: "M22,70 C22,38 78,38 78,70 Z M12,70 L88,70 L88,79 L12,79 Z",
};

const INKS = ["#3E5A78", "#2B2B2E", "#8A5A2B", "#D8CDB4", "#6E2A28", "#9E5C6E", "#5C6340", "#9A6B3A", "#1F7A82", "#A5732F", "#4A4E55", "#6A5F86"];
const BGS = ["#C6C0AE", "#CFC8B6", "#D3C8AE", "#B9BCAE", "#C9C2AE", "#D6CDB6", "#CCC6B2", "#D5CBB4", "#C8C4B2", "#CFC7B0", "#C4C0B0", "#D2C9B2"];

function rand(cents: number): string {
  return "R" + Math.round(cents / 100).toLocaleString("en-ZA");
}

type BagEntry = { id: string; heldUntil: number };

export function OldGoodExperience({
  clientId,
  businessName,
  contactEmail,
  items,
  markets,
  delivery,
  freeOverCents,
}: {
  clientId: string;
  businessName: string;
  contactEmail: string | null;
  items: OgItem[];
  markets: OgMarket[];
  delivery: OgDelivery[];
  freeOverCents: number;
}) {
  const [bag, setBag] = useState<BagEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("All");
  const [deliveryId, setDeliveryId] = useState("pudo");
  const [marketPick, setMarketPick] = useState(markets[0]?.name ?? "");
  const [view, setView] = useState<"closed" | "item" | "bag" | "delivery" | "details" | "pay" | "done">("closed");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shopName, setShopName] = useState(businessName.toUpperCase());
  const [tick, setTick] = useState(0);
  const [demoNote, setDemoNote] = useState(true);

  const boundAction = placeOldGoodOrder.bind(null, clientId);
  const [orderState, orderAction, orderPending] = useActionState<OldGoodOrderState, FormData>(boundAction, null);

  // The bag lives in this browser only, and the page says so honestly: a
  // hold here keeps YOUR bag reserved for fifteen minutes. If somebody else
  // is faster to checkout, the order action refuses clearly and names the
  // piece (no silent double-sell; the record itself is guarded).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BAG_KEY);
      if (raw) setBag((JSON.parse(raw) as BagEntry[]).filter((b) => b.heldUntil > Date.now()));
      const savedName = localStorage.getItem("og-shop-name");
      if (savedName) setShopName(savedName);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  }, [bag, ready]);
  useEffect(() => {
    const t = setInterval(() => {
      setTick((n) => n + 1);
      setBag((b) => (b.some((e) => e.heldUntil <= Date.now()) ? b.filter((e) => e.heldUntil > Date.now()) : b));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (orderState?.ok) {
      setBag([]);
      setView("done");
    }
  }, [orderState]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const bagItems = bag.map((e) => byId.get(e.id)).filter((i): i is OgItem => Boolean(i) && !i!.sold);
  const subtotal = bagItems.reduce((s, i) => s + i.priceCents, 0);
  const chosenDelivery = delivery.find((d) => d.id === deliveryId) ?? delivery[0];
  const deliveryCents = chosenDelivery.id === "market" ? 0 : subtotal >= freeOverCents ? 0 : chosenDelivery.priceCents;
  const live = items.filter((i) => !i.sold);
  const gone = items.filter((i) => i.sold);
  const cats = ["All", ...Array.from(new Set(items.map((i) => i.cat)))];
  const active = activeId ? (byId.get(activeId) ?? null) : null;
  const inBag = (id: string) => bag.some((e) => e.id === id);
  void tick;

  function art(it: OgItem, idx: number, mini = false) {
    if (it.photo) {
      return <Image src={it.photo} alt={it.name} fill sizes={mini ? "54px" : "(max-width: 640px) 60vw, 240px"} className="og-photo-img" />;
    }
    const d = SHAPES[it.shape] ?? SHAPES.top;
    return (
      <>
        <svg viewBox="0 0 100 120" aria-hidden="true">
          <path d={d} fill="none" stroke={INKS[idx % INKS.length]} strokeWidth={mini ? 4 : 3} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {!mini && <span className="og-photoflag">Photo slot</span>}
      </>
    );
  }

  function addToBag(id: string) {
    const it = byId.get(id);
    if (!it || it.sold || inBag(id)) return;
    setBag((b) => [...b, { id, heldUntil: Date.now() + HOLD_MS }]);
    setView("bag");
  }

  function ticket(it: OgItem, idx: number) {
    return (
      <button
        key={it.id}
        type="button"
        className="og-tick"
        data-sold={it.sold ? 1 : 0}
        aria-label={it.sold ? `${it.name}, sold` : it.name}
        onClick={() => {
          setActiveId(it.id);
          setView("item");
        }}
      >
        {inBag(it.id) && !it.sold && <span className="og-held">In your bag</span>}
        <figure className="og-photo" style={{ background: BGS[idx % BGS.length] }}>
          {art(it, idx)}
        </figure>
        <span className="og-no">No. {it.no} / {it.cat}</span>
        <h3 className="og-name">{it.name}</h3>
        <div className="og-meta">
          <span className="og-size">{it.grade ? `Grade ${it.grade}` : "Ungraded"}</span>
          <span className="og-price">{rand(it.priceCents)}</span>
        </div>
        {it.sold && (
          <span className="og-soldstamp">
            <span>Sold</span>
          </span>
        )}
      </button>
    );
  }

  const stripBits = [
    `${shopName || "Your shop"}`,
    "Every piece is one of one",
    `Free courier over ${rand(freeOverCents)}`,
    "Collect at the market for free",
    "Held 15 minutes in your bag",
    "Demo shop, nothing really for sale yet",
  ];

  const shown = items
    .filter((i) => filter === "All" || i.cat === filter)
    .sort((a, b) => (a.sold ? 1 : 0) - (b.sold ? 1 : 0));

  return (
    <div className="og">
      <div className="og-strip" aria-hidden="true">
        <div className="og-strip-track">
          {[...stripBits, ...stripBits].map((b, i) => (
            <span key={i}>{b}</span>
          ))}
        </div>
      </div>

      <div className="og-wrap">
        <header className="og-head">
          <div>
            <span className="og-logo-hint">Tap and type your shop name</span>
            <h1
              className="og-logo"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              role="textbox"
              aria-label="Shop name"
              onBlur={(e) => {
                const v = (e.currentTarget.textContent ?? "").trim().slice(0, 24) || businessName.toUpperCase();
                setShopName(v);
                localStorage.setItem("og-shop-name", v);
              }}
            >
              {shopName}
            </h1>
          </div>
          <nav className="og-nav">
            <a href="#og-shop">The rail</a>
            <a href="#og-markets">Markets</a>
            <button type="button" className="og-bagbtn" data-full={bagItems.length ? 1 : 0} onClick={() => setView("bag")}>
              Bag ({bagItems.length})
            </button>
          </nav>
        </header>

        <section className="og-hero">
          <h1>
            One
            <br />
            of
            <br />
            <em>one</em>
          </h1>
          <div className="og-hero-sub">
            <p>Every piece here is a single item. When it sells it is gone, and the ticket stays on the rail so you can see what went.</p>
            <div className="og-facts">
              <div className="og-fact">
                <b>{live.length}</b>on the rail now
              </div>
              <div className="og-fact">
                <b>{gone.length}</b>gone this drop
              </div>
              <div className="og-fact">
                <b>15</b>minute hold in your bag
              </div>
            </div>
          </div>
          <div className="og-railwrap">
            <div className="og-railbar" />
            <div className="og-rail">{live.slice(0, 8).map((it) => ticket(it, items.indexOf(it)))}</div>
          </div>
        </section>

        <section className="og-how">
          <p className="og-eyebrow">How this works</p>
          <div className="og-howgrid">
            <div className="og-howcell">
              <h3>Measured, not sized</h3>
              <p>Old sizing lies. Every ticket carries real measurements in centimetres so you can check against something you already own.</p>
            </div>
            <div className="og-howcell">
              <h3>Graded honestly</h3>
              <p>A means barely worn. B means worn with no flaws. C means worn with a flaw, and the flaw is written on the ticket.</p>
            </div>
            <div className="og-howcell">
              <h3>Held in your bag</h3>
              <p>Adding a piece holds it in your bag for fifteen minutes while you decide. If someone beats you to the till, the bag says so before anything happens.</p>
            </div>
            <div className="og-howcell">
              <h3>Collect at the market, free</h3>
              <p>Buy online, choose the next market at checkout, and pick it up at the stall. No courier fee and you can try it on there.</p>
            </div>
          </div>
        </section>

        <section className="og-shop" id="og-shop">
          <div className="og-shophead">
            <h2>The rail</h2>
            <div className="og-filters">
              {cats.map((c) => (
                <button key={c} type="button" aria-pressed={c === filter} onClick={() => setFilter(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="og-grid">
            {shown.length ? (
              shown.map((it) => ticket(it, items.indexOf(it)))
            ) : (
              <div className="og-empty">
                <strong>Nothing here yet</strong>Try another rail.
              </div>
            )}
          </div>
        </section>

        <section className="og-markets" id="og-markets">
          <p className="og-eyebrow">Where to find the stall</p>
          {markets.map((m) => (
            <div key={m.name} className="og-marketrow">
              <div>
                <h3>{m.name}</h3>
                <span className="og-when">
                  {m.when} / {m.where}
                </span>
              </div>
              <p>{m.note}</p>
            </div>
          ))}
        </section>

        <footer className="og-foot">
          <span>{shopName || businessName}</span>
          <span>Prices in Rand, VAT not applicable</span>
          <span>Demo build, no real orders shipped</span>
        </footer>
      </div>

      <div className="og-scrim" data-open={view !== "closed" ? 1 : 0} onClick={() => view !== "pay" && setView("closed")} />

      <aside className="og-drawer" data-open={view !== "closed" && view !== "pay" ? 1 : 0} role="dialog" aria-modal="true">
        <div className="og-drawerhead">
          <h2>
            {view === "item" && active ? `No. ${active.no}` : view === "bag" ? "Bag" : view === "delivery" ? "Delivery" : view === "details" ? "Nearly there" : view === "done" ? "Done" : ""}
          </h2>
          <button type="button" className="og-close" onClick={() => setView("closed")}>
            Close
          </button>
        </div>

        <div className="og-drawerbody">
          {view === "item" && active && (
            <>
              <figure className="og-photo og-photo-big" style={{ background: BGS[items.indexOf(active) % BGS.length] }}>
                {art(active, items.indexOf(active))}
              </figure>
              <h3 className="og-name og-name-big">{active.name}</h3>
              {(active.era || active.fabric) && (
                <p className="og-dim">
                  {[active.era, active.fabric].filter(Boolean).join(" / ")}
                </p>
              )}
              {active.blurb && <p className="og-dim">{active.blurb}</p>}
              <div className="og-care">
                <dl>
                  <div className="og-carerow">
                    <dt>Price</dt>
                    <dd>{rand(active.priceCents)}</dd>
                  </div>
                  {active.measurements.map(([k, v]) => (
                    <div className="og-carerow" key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                  {active.grade && (
                    <div className="og-carerow">
                      <dt>Condition</dt>
                      <dd>
                        <span className="og-grade">Grade {active.grade}</span>
                      </dd>
                    </div>
                  )}
                  {active.flaw && (
                    <div className="og-carerow">
                      <dt>The flaw</dt>
                      <dd>{active.flaw}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <p className="og-dim og-small">There is one of this. Adding it to your bag holds it there for fifteen minutes.</p>
            </>
          )}

          {view === "bag" &&
            (bagItems.length === 0 ? (
              <div className="og-empty">
                <strong>Bag is empty</strong>Pick something off the rail. It holds for 15 minutes once it is in here.
              </div>
            ) : (
              <>
                {bagItems.map((it) => {
                  const entry = bag.find((e) => e.id === it.id);
                  const left = Math.max(0, (entry?.heldUntil ?? 0) - Date.now());
                  const mm = Math.floor(left / 60000);
                  const ss = Math.floor((left % 60000) / 1000);
                  return (
                    <div className="og-line" key={it.id}>
                      <figure className="og-linethumb" style={{ background: BGS[items.indexOf(it) % BGS.length] }}>
                        {art(it, items.indexOf(it), true)}
                      </figure>
                      <div className="og-linebody">
                        <h3>{it.name}</h3>
                        <small>
                          No. {it.no}
                          {it.grade ? ` / grade ${it.grade}` : ""}
                        </small>
                        <br />
                        <span className="og-timer">
                          Held {mm}:{ss < 10 ? "0" : ""}
                          {ss}
                        </span>
                      </div>
                      <div className="og-lineend">
                        <div className="og-lineprice">{rand(it.priceCents)}</div>
                        <button type="button" className="og-remove" onClick={() => setBag((b) => b.filter((e) => e.id !== it.id))}>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="og-totals">
                  <div className="og-totrow">
                    <span>Subtotal</span>
                    <span>{rand(subtotal)}</span>
                  </div>
                </div>
              </>
            ))}

          {view === "delivery" && (
            <>
              <p className="og-dim">Lockers and PEP stores are the cheapest way to get it to you. Door to door costs more and gets there sooner.</p>
              {delivery.map((d) => {
                const free = d.id !== "market" && subtotal >= freeOverCents;
                return (
                  <label key={d.id} className="og-opt" data-sel={deliveryId === d.id ? 1 : 0}>
                    <span className="og-optprice">{d.id === "market" || free ? "Free" : rand(d.priceCents)}</span>
                    <input type="radio" name="og-del" value={d.id} checked={deliveryId === d.id} onChange={() => setDeliveryId(d.id)} />
                    <h3>{d.label}</h3>
                    <small>{d.note}</small>
                  </label>
                );
              })}
              {deliveryId === "market" && (
                <div className="og-field">
                  <label htmlFor="og-market">Which market</label>
                  <select id="og-market" value={marketPick} onChange={(e) => setMarketPick(e.target.value)}>
                    {markets.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}, {m.when}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {subtotal >= freeOverCents && <p className="og-free">Order is over {rand(freeOverCents)}, courier is on the shop.</p>}
              <div className="og-totals">
                <div className="og-totrow">
                  <span>Subtotal</span>
                  <span>{rand(subtotal)}</span>
                </div>
                <div className="og-totrow">
                  <span>Delivery</span>
                  <span>{deliveryCents === 0 ? "Free" : rand(deliveryCents)}</span>
                </div>
                <div className="og-totrow og-big">
                  <span>Total</span>
                  <span>{rand(subtotal + deliveryCents)}</span>
                </div>
              </div>
            </>
          )}

          {view === "details" && (
            <form id="og-order-form" action={orderAction} className="og-detailsform">
              <p className="og-dim">
                A name and a number is all the stall needs. This is a demo shop: nothing is charged, nothing is delivered, and the details go nowhere except {shopName || businessName}&apos;s own order list.
              </p>
              <input type="hidden" name="deliveryId" value={deliveryId} />
              <input type="hidden" name="market" value={deliveryId === "market" ? marketPick : ""} />
              <input type="hidden" name="items" value={JSON.stringify(bagItems.map((i) => i.id))} />
              <div className="og-field">
                <label htmlFor="og-nm">Your name</label>
                <input id="og-nm" name="buyerName" required maxLength={80} />
              </div>
              <div className="og-field">
                <label htmlFor="og-ph">Phone number</label>
                <input id="og-ph" name="buyerPhone" type="tel" required maxLength={20} />
              </div>
              <TurnstileWidget />
              {orderState && !orderState.ok && orderState.error && <p className="og-err">{orderState.error}</p>}
              {orderState && !orderState.ok && orderState.beaten && orderState.beaten.length > 0 && (
                <p className="og-err">Someone beat you to: {orderState.beaten.join(", ")}. It has come off your bag.</p>
              )}
            </form>
          )}

          {view === "done" && (
            <div className="og-doneview">
              <strong className="og-donehead">Reserved{orderState?.ok && orderState.ref ? `, order ${orderState.ref}` : ""}</strong>
              <p className="og-dim">
                This is a demo shop, so nothing was charged and nothing will arrive. On the real thing, this screen is where {shopName || businessName} confirms the pickup or sends the tracking.
              </p>
              {orderState?.ok && orderState.market && <p className="og-dim">Marked for collection at: {orderState.market}.</p>}
              <p className="og-dim og-small">The pieces you reserved now show as sold on the rail, which is exactly what would happen for real.</p>
            </div>
          )}
        </div>

        <div className="og-drawerfoot">
          {view === "item" && active && (
            active.sold ? (
              <button type="button" className="og-cta" disabled>
                Sold
              </button>
            ) : inBag(active.id) ? (
              <button type="button" className="og-cta" onClick={() => setView("bag")}>
                In your bag, go to bag
              </button>
            ) : (
              <button type="button" className="og-cta" onClick={() => addToBag(active.id)}>
                Add to bag, {rand(active.priceCents)}
              </button>
            )
          )}
          {view === "bag" &&
            (bagItems.length ? (
              <button type="button" className="og-cta" onClick={() => setView("delivery")}>
                Choose delivery
              </button>
            ) : (
              <button type="button" className="og-ghost" onClick={() => setView("closed")}>
                Back to the rail
              </button>
            ))}
          {view === "delivery" && (
            <button type="button" className="og-cta" onClick={() => setView("details")}>
              Your details
            </button>
          )}
          {view === "details" && (
            <button type="submit" form="og-order-form" className="og-cta" disabled={orderPending || bagItems.length === 0}>
              {orderPending ? "Reserving..." : `Reserve, ${rand(subtotal + deliveryCents)}`}
            </button>
          )}
          {view === "done" && (
            <button type="button" className="og-ghost" onClick={() => setView("closed")}>
              Back to the rail
            </button>
          )}
        </div>
      </aside>

      {demoNote && (
        <div className="og-demo">
          <button type="button" onClick={() => setDemoNote(false)} aria-label="Hide notice">
            &times;
          </button>
          Demo shop. Products and photos are placeholders, and reserving costs nothing. {contactEmail ? "" : ""}
        </div>
      )}
    </div>
  );
}
