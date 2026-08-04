import { useEffect, useRef, useState } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag, Check, Loader2 } from "lucide-react";
import { useCart, useCartProducts, SHIPPING_RULES } from "../contexts/CartContext";
import { formatPrice } from "../lib/catalog";
import { submit } from "../lib/api";

type Fields = { name: string; email: string; fulfilment: "ship" | "pickup"; address: string; notes: string };

const EMPTY: Fields = { name: "", email: "", fulfilment: "ship", address: "", notes: "" };

export default function CartDrawer() {
  const { lines, count, totals, open, setOpen, setQuantity, remove, clear, lastOrder, setLastOrder } = useCart();
  const items = useCartProducts(lines);

  const [checkingOut, setCheckingOut] = useState(false);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // A basket containing a growler fill has to be collected, so the shipping
  // choice is not offered.
  const mustPickUp = totals.pickupOnly;
  const fulfilment = mustPickUp ? "pickup" : fields.fulfilment;

  useEffect(() => {
    if (!open) return;

    // Escape closes, and focus moves into the panel so a keyboard user is not
    // left behind on the page underneath.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, setOpen]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof Fields, string>> = {};
    if (!fields.name.trim()) next.name = "We need a name for the order.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email.trim())) next.email = "Enter an email we can send the confirmation to.";
    if (fulfilment === "ship" && fields.address.trim().length < 10) {
      next.address = "A full shipping address, please — street, city, state and ZIP.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      const result = await submit({
        kind: "order",
        payload: {
          customer: { name: fields.name.trim(), email: fields.email.trim() },
          fulfilment,
          address: fulfilment === "ship" ? fields.address.trim() : null,
          notes: fields.notes.trim() || null,
          items: items.map(({ product, quantity }) => ({
            id: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity,
          })),
          totals,
        },
      });

      setLastOrder({ reference: result.reference, delivered: result.delivered, total: totals.total });
      clear();
      setFields(EMPTY);
      setCheckingOut(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const field = (key: keyof Fields) => ({
    value: fields[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    "aria-invalid": Boolean(errors[key]),
    className: `w-full px-4 py-3 rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
      errors[key] ? "border-red-500" : "border-gray-300 dark:border-gray-600"
    }`,
  });

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Your cart">
      <button className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} tabIndex={-1} aria-label="Close cart" />

      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <ShoppingBag className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            {checkingOut ? "Checkout" : `Your cart${count ? ` (${count})` : ""}`}
          </h2>
          <div className="flex-1" />
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lastOrder ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order placed</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Reference <span className="font-mono font-semibold text-gray-900 dark:text-white">{lastOrder.reference}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{formatPrice(lastOrder.total)}</p>

              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                {lastOrder.delivered
                  ? "Sent to the taproom. You will get a confirmation by email."
                  : "Saved on this device. The taproom service was not reachable, so it will be sent the next time it is — nothing was lost."}
              </p>

              <button
                onClick={() => {
                  setLastOrder(null);
                  setOpen(false);
                }}
                className="mt-8 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold transition-colors"
              >
                Keep browsing
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Your cart is empty.</p>
            </div>
          ) : checkingOut ? (
            <form id="blom-checkout" onSubmit={placeOrder} className="space-y-4" noValidate>
              <div>
                <label htmlFor="co-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Name
                </label>
                <input id="co-name" type="text" autoComplete="name" {...field("name")} />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="co-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input id="co-email" type="email" autoComplete="email" {...field("email")} />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>

              {mustPickUp ? (
                <p className="text-sm px-4 py-3 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300">
                  Growler and howler fills are poured to order, so this one is taproom pickup. Everything else in the
                  cart comes with it.
                </p>
              ) : (
                <fieldset>
                  <legend className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Delivery
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(["ship", "pickup"] as const).map((option) => (
                      <label
                        key={option}
                        className={`px-4 py-3 rounded-md border cursor-pointer text-center transition-colors ${
                          fulfilment === option
                            ? "border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="fulfilment"
                          className="sr-only"
                          checked={fulfilment === option}
                          onChange={() => setFields((prev) => ({ ...prev, fulfilment: option }))}
                        />
                        {option === "ship" ? "Ship it" : "Taproom pickup"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {fulfilment === "ship" && (
                <div>
                  <label htmlFor="co-address" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Shipping address
                  </label>
                  <textarea id="co-address" rows={3} autoComplete="street-address" {...field("address")} />
                  {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
                </div>
              )}

              <div>
                <label htmlFor="co-notes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea id="co-notes" rows={2} {...field("notes")} />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                No payment is taken here — the taproom confirms the order and takes payment on pickup or by invoice.
                You must be 21 or older to purchase.
              </p>
            </form>
          ) : (
            <ul className="space-y-4">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-3">
                  <img src={product.image} alt="" className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatPrice(product.price)} each</p>
                    {!product.shippable && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Taproom pickup only</p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setQuantity(product.id, quantity - 1)}
                        className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:border-orange-600"
                        aria-label={`Reduce ${product.name} quantity`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center tabular-nums text-gray-900 dark:text-white">{quantity}</span>
                      <button
                        onClick={() => setQuantity(product.id, quantity + 1)}
                        className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:border-orange-600"
                        aria-label={`Increase ${product.name} quantity`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => remove(product.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white tabular-nums">
                    {formatPrice(product.price * quantity)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && !lastOrder && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-3">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>
                  Shipping
                  {totals.shipping === 0 && !totals.pickupOnly && totals.subtotal >= SHIPPING_RULES.FREE_SHIPPING_OVER && (
                    <span className="text-green-600 dark:text-green-400 ml-1">free over {formatPrice(SHIPPING_RULES.FREE_SHIPPING_OVER)}</span>
                  )}
                </dt>
                <dd className="tabular-nums">{totals.shipping === 0 ? "—" : formatPrice(totals.shipping)}</dd>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>Michigan sales tax</dt>
                <dd className="tabular-nums">{formatPrice(totals.tax)}</dd>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(totals.total)}</dd>
              </div>
            </dl>

            {checkingOut ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCheckingOut(false)}
                  className="px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="blom-checkout"
                  disabled={busy}
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {busy ? "Placing order" : "Place order"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCheckingOut(true)}
                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold transition-colors"
              >
                Checkout
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
