// One source of truth for everything purchasable and everything searchable.
//
// Products used to be hand-written JSX in three different pages with prices
// baked into the markup, which meant the shop and the products page could
// disagree about what a bottle costs. Everything now reads from here.

import aperitivoPhoto from "../../imports/Bløm_Aperitivo.webp";
import meadCiderPhoto from "../../imports/Bløm_Mead&Cider.webp";

export type Product = {
  id: string;
  name: string;
  blurb: string;
  /** Price in cents. Money is never a float. */
  price: number;
  abv?: string;
  image: string;
  category: "aperitivo" | "cider" | "mead" | "gift" | "growler";
  /** Featured products lead the shop page. */
  featured?: boolean;
  /** Some items ship; taproom-only fills do not. */
  shippable: boolean;
};

export const PRODUCTS: Product[] = [
  {
    id: "aperitivo",
    name: "Bløm Aperitivo",
    blurb: "Cider-based botanical aperitif — bitter, floral, and made for sipping.",
    price: 2499,
    abv: "16% ABV",
    image: aperitivoPhoto,
    category: "aperitivo",
    featured: true,
    shippable: true,
  },
  {
    id: "heritage-cider",
    name: "Heritage Blend Cider",
    blurb: "Dry cider pressed from Michigan heirloom apples.",
    price: 1899,
    abv: "6.5% ABV",
    image: meadCiderPhoto,
    category: "cider",
    featured: true,
    shippable: true,
  },
  {
    id: "golden-meadow",
    name: "Golden Meadow Mead",
    blurb: "Traditional honey wine made with Michigan wildflower honey.",
    price: 2699,
    abv: "12.5% ABV",
    image: meadCiderPhoto,
    category: "mead",
    featured: true,
    shippable: true,
  },
  {
    id: "gift-card-50",
    name: "Gift Card — $50",
    blurb: "Redeemable in the taproom and the online shop. Never expires.",
    price: 5000,
    image: aperitivoPhoto,
    category: "gift",
    shippable: true,
  },
  {
    id: "gift-card-100",
    name: "Gift Card — $100",
    blurb: "Redeemable in the taproom and the online shop. Never expires.",
    price: 10000,
    image: aperitivoPhoto,
    category: "gift",
    shippable: true,
  },
  {
    id: "howler-6",
    name: "6-Pack Howlers",
    blurb: "Six 32 oz howler fills, poured fresh from the tap.",
    price: 3000,
    image: meadCiderPhoto,
    category: "growler",
    shippable: false,
  },
  {
    id: "howler-12",
    name: "12-Pack Howlers",
    blurb: "Twelve 32 oz howler fills. The best value on the board.",
    price: 5500,
    image: meadCiderPhoto,
    category: "growler",
    shippable: false,
  },
  {
    id: "growler-12",
    name: "12-Pack Growlers",
    blurb: "Twelve 64 oz growler fills, used at your own pace.",
    price: 10000,
    image: meadCiderPhoto,
    category: "growler",
    shippable: false,
  },
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

// ─── search ──────────────────────────────────────────────────────────────────

export type SearchResult = {
  title: string;
  detail: string;
  path: string;
  kind: "Product" | "Page" | "Event" | "Location";
};

/**
 * The site index.
 *
 * Every usability participant asked for a search bar, and the nav shipped with
 * one that did nothing. The pages worth finding are listed here with the words
 * people actually type — "where can I buy", "hours", "parking" — rather than
 * only the words that appear in the headings.
 */
const PAGES: (SearchResult & { keywords: string })[] = [
  {
    title: "Aperitivo",
    detail: "What it is, how it is made, and how to drink it",
    path: "/products",
    kind: "Page",
    keywords: "aperitivo aperitif bitter botanical spritz cocktail recipe negroni what is",
  },
  {
    title: "Taproom & Menu",
    detail: "Food and drink menus, hours, and what is pouring",
    path: "/taproom",
    kind: "Page",
    keywords: "taproom menu food drink hours open close eat kitchen tap list pouring",
  },
  {
    title: "Find Bløm",
    detail: "Retailers and bars carrying Bløm across Michigan",
    path: "/locations",
    kind: "Location",
    keywords: "where buy find retail store near me location map carry stock shop local address directions parking",
  },
  {
    title: "Events",
    detail: "Trivia, game nights, yoga, and seasonal releases",
    path: "/events",
    kind: "Event",
    keywords: "events calendar trivia game night yoga live music what is on this week",
  },
  {
    title: "Private Events",
    detail: "Book the space for a party, reception, or company night",
    path: "/private-events",
    kind: "Event",
    keywords: "private event book booking rent venue party wedding reception corporate birthday tour walkthrough",
  },
  {
    title: "Our Story",
    detail: "The orchard, the farm partners, and how Bløm is made",
    path: "/about",
    kind: "Page",
    keywords: "about story history farm partners orchard sustainability owners team michigan honey apples contact",
  },
  {
    title: "Shop",
    detail: "Bottles, gift cards, and growler fills",
    path: "/shop",
    kind: "Page",
    keywords: "shop buy order online delivery pickup ship gift card growler howler purchase cart",
  },
  {
    title: "The Club",
    detail: "Membership, early access, and member-only releases",
    path: "/club",
    kind: "Page",
    keywords: "club membership member subscribe subscription join perks discount early access",
  },
];

/**
 * Rank by where the match lands: a title match beats a keyword match, and a
 * prefix beats a match in the middle of a word. Good enough for eight pages
 * and seven products, and it costs nothing.
 */
export function search(query: string): SearchResult[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: { result: SearchResult; score: number }[] = [];

  const score = (haystack: { title: string; body: string }) => {
    let total = 0;
    for (const term of terms) {
      const title = haystack.title.toLowerCase();
      const body = haystack.body.toLowerCase();
      if (title.startsWith(term)) total += 10;
      else if (title.includes(term)) total += 6;
      else if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(body)) total += 3;
      else if (body.includes(term)) total += 1;
      else return 0; // Every term has to match somewhere.
    }
    return total;
  };

  for (const product of PRODUCTS) {
    const value = score({ title: product.name, body: `${product.blurb} ${product.category} ${product.abv ?? ""}` });
    if (value > 0) {
      scored.push({
        result: {
          title: product.name,
          detail: `${formatPrice(product.price)} — ${product.blurb}`,
          path: "/shop",
          kind: "Product",
        },
        score: value + 2,
      });
    }
  }

  for (const page of PAGES) {
    const value = score({ title: page.title, body: `${page.detail} ${page.keywords}` });
    if (value > 0) scored.push({ result: page, score: value });
  }

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.result);
}
