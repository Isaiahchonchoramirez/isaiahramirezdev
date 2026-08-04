import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS, productById, type Product } from "../lib/catalog";

export type CartLine = { id: string; quantity: number };

export type Totals = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  /** True when the basket contains something that cannot ship. */
  pickupOnly: boolean;
};

type CartValue = {
  lines: CartLine[];
  count: number;
  totals: Totals;
  open: boolean;
  add: (id: string, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  /** Set after a successful checkout so the page can confirm it. */
  lastOrder: { reference: string; delivered: boolean; total: number } | null;
  setLastOrder: (order: { reference: string; delivered: boolean; total: number } | null) => void;
};

const STORAGE_KEY = "blom.cart";

// Michigan state sales tax. Named rather than inlined so it is obvious this is
// a real number and not a placeholder.
const MICHIGAN_SALES_TAX = 0.06;
const FLAT_SHIPPING = 1200;
const FREE_SHIPPING_OVER = 7500;

const CartContext = createContext<CartValue | null>(null);

function load(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    // Drop anything referring to a product that no longer exists, so a stale
    // basket cannot crash the drawer.
    return raw
      .filter((line) => line && typeof line.id === "string" && productById(line.id))
      .map((line) => ({ id: line.id, quantity: Math.max(1, Math.min(99, Number(line.quantity) || 1)) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [open, setOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<CartValue["lastOrder"]>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage unavailable; the cart still works for this session.
    }
  }, [lines]);

  const add = useCallback((id: string, quantity = 1) => {
    if (!productById(id)) return;
    // Adding something starts a new basket, so the previous order's
    // confirmation has to go — otherwise the drawer shows "order placed" over
    // a cart that has items in it.
    setLastOrder(null);
    setLines((prev) => {
      const existing = prev.find((line) => line.id === id);
      if (existing) {
        return prev.map((line) =>
          line.id === id ? { ...line, quantity: Math.min(99, line.quantity + quantity) } : line,
        );
      }
      return [...prev, { id, quantity }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((line) => line.id !== id)
        : prev.map((line) => (line.id === id ? { ...line, quantity: Math.min(99, quantity) } : line)),
    );
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((line) => line.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const totals = useMemo<Totals>(() => {
    let subtotal = 0;
    let pickupOnly = false;

    for (const line of lines) {
      const product = productById(line.id);
      if (!product) continue;
      subtotal += product.price * line.quantity;
      if (!product.shippable) pickupOnly = true;
    }

    // Growler fills are poured in the taproom, so a basket containing one is a
    // pickup order and is not charged shipping.
    const shipping = pickupOnly || subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : FLAT_SHIPPING;
    const tax = Math.round(subtotal * MICHIGAN_SALES_TAX);

    return { subtotal, shipping, tax, total: subtotal + shipping + tax, pickupOnly };
  }, [lines]);

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  const value = useMemo(
    () => ({ lines, count, totals, open, add, setQuantity, remove, clear, setOpen, lastOrder, setLastOrder }),
    [lines, count, totals, open, add, setQuantity, remove, clear, lastOrder],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside a CartProvider");
  return context;
}

/** Resolve cart lines to products for rendering, dropping anything unknown. */
export function useCartProducts(lines: CartLine[]): { product: Product; quantity: number }[] {
  return useMemo(
    () =>
      lines
        .map((line) => ({ product: productById(line.id), quantity: line.quantity }))
        .filter((entry): entry is { product: Product; quantity: number } => Boolean(entry.product)),
    [lines],
  );
}

export const SHIPPING_RULES = { FLAT_SHIPPING, FREE_SHIPPING_OVER, MICHIGAN_SALES_TAX };
export { PRODUCTS };
