import { useEffect, useRef, useState } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag, ExternalLink } from "lucide-react";
import { useCart, useCartProducts } from "../contexts/CartContext";
import { formatPrice } from "../lib/catalog";
import { goToVinoshipper } from "../lib/vinoshipper";

export default function CartDrawer() {
  const { lines, count, totals, open, setOpen, setQuantity, remove } = useCart();
  const items = useCartProducts(lines);

  const [leaving, setLeaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Growler and howler fills are poured to order, so a basket holding one is
  // collected at the bar rather than shipped.
  const mustPickUp = totals.pickupOnly;

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

  // The basket is kept in localStorage, so it is still here if they come back
  // from Vinoshipper without buying.
  const checkout = () => {
    setLeaving(true);
    goToVinoshipper();
  };

  if (!open) return null;

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
            Your cart{count ? ` (${count})` : ""}
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
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Your cart is empty.</p>
            </div>
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

        {items.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-3">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
              </div>
            </dl>

            {/* Shipping and tax are not ours to quote: Vinoshipper works them
                out from the delivery address and the licence for that state,
                so a total here would only be a guess that the real checkout
                then contradicts. */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {mustPickUp
                ? "Growler and howler fills are poured to order, so those are collected at the taproom. Shipping and tax on everything else are worked out at checkout."
                : "Shipping and Michigan sales tax are worked out at checkout."}{" "}
              Payment is taken by Vinoshipper, our licensed shipper. You must be 21 or older.
            </p>

            <button
              onClick={checkout}
              disabled={leaving}
              className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-70 text-white rounded-md font-semibold transition-colors inline-flex items-center justify-center gap-2"
            >
              {leaving ? "Opening Vinoshipper" : "Checkout"}
              <ExternalLink className="w-4 h-4" />
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Vinoshipper keeps its own basket, so you will pick your bottles again there. This cart stays here if you
              come back.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
