import { ShoppingCart, Gift, Package, Truck, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Link } from "react-router";
import { useState } from "react";
import aperitivoPhoto from "../../imports/Bløm_Aperitivo.webp";
import meadCiderPhoto from "../../imports/Bløm_Mead&Cider.webp";
import buyBlomHeader from "../../imports/buyblom.webp";
import { PRODUCTS, formatPrice, productById } from "../lib/catalog";
import { useCart } from "../contexts/CartContext";

/**
 * An add-to-cart button that confirms itself.
 *
 * Adding an item opens the drawer, but the button also has to acknowledge the
 * click on its own — otherwise on a narrow screen, where the drawer covers the
 * page, it is not obvious that anything happened.
 */
function AddToCart({ id, className = "" }: { id: string; className?: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const product = productById(id);
  if (!product) return null;

  return (
    <button
      onClick={() => {
        add(id);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      className={`w-full px-4 py-3 rounded-md font-semibold text-white transition-colors inline-flex items-center justify-center gap-2 ${
        added ? "bg-green-600" : "bg-orange-600 dark:bg-orange-500 hover:bg-orange-700"
      } ${className}`}
    >
      {added ? (
        <>
          <Check className="w-4 h-4" /> Added
        </>
      ) : (
        <>Add to cart — {formatPrice(product.price)}</>
      )}
    </button>
  );
}

/** The hero call to action — the one button the whole redesign exists to serve. */
function AperitivoBuyButton() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      onClick={() => {
        add("aperitivo");
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      className={`px-8 py-4 font-semibold rounded-md transition-colors text-lg inline-flex items-center gap-2 ${
        added ? "bg-green-600 text-white" : "bg-white text-orange-600 hover:bg-gray-100"
      }`}
    >
      {added ? (
        <>
          <Check className="w-5 h-5" /> Added to cart
        </>
      ) : (
        "Buy Aperitivo now"
      )}
    </button>
  );
}

/**
 * Direct shipping of alcohol is state by state, so the honest answer is a
 * lookup rather than a button that claims we ship everywhere.
 */
const SHIPPING_STATES: Record<string, string> = {
  MICHIGAN: "yes", MI: "yes",
  OHIO: "yes", OH: "yes",
  ILLINOIS: "yes", IL: "yes",
  MINNESOTA: "yes", MN: "yes",
  WISCONSIN: "yes", WI: "yes",
  "NEW YORK": "yes", NY: "yes",
  CALIFORNIA: "yes", CA: "yes",
  FLORIDA: "yes", FL: "yes",
  UTAH: "no", UT: "no",
  ALABAMA: "no", AL: "no",
  MISSISSIPPI: "no", MS: "no",
  "SOUTH DAKOTA": "no", SD: "no",
  DELAWARE: "no", DE: "no",
};

function ShippingChecker() {
  const [state, setState] = useState("");
  const [answer, setAnswer] = useState<null | "yes" | "no" | "unknown">(null);

  const check = (event: React.FormEvent) => {
    event.preventDefault();
    const key = state.trim().toUpperCase();
    if (!key) return;
    setAnswer((SHIPPING_STATES[key] as "yes" | "no") ?? "unknown");
  };

  return (
    <form onSubmit={check} className="mt-auto space-y-3">
      <label htmlFor="ship-state" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        Which state?
      </label>
      <div className="flex gap-2">
        <input
          id="ship-state"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setAnswer(null);
          }}
          placeholder="e.g. Michigan or MI"
          className="flex-1 min-w-0 px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="submit"
          className="px-4 py-3 rounded-md border-2 border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-400 font-semibold hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
        >
          Check
        </button>
      </div>
      {answer === "yes" && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Yes — we ship to {state.trim()}. Someone 21 or older has to sign for it.
        </p>
      )}
      {answer === "no" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          No — {state.trim()} does not permit direct shipment from out-of-state producers.
        </p>
      )}
      {answer === "unknown" && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We do not have a licence on file for that one. Email info@drinkblom.com and we will check.
        </p>
      )}
    </form>
  );
}

export default function ShopPage() {
  const bottles = PRODUCTS.filter((p) => p.featured);
  const giftCards = PRODUCTS.filter((p) => p.category === "gift");
  const fills = PRODUCTS.filter((p) => p.category === "growler");

  return (
    <div className="pt-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-100">
          <img
            src={buyBlomHeader}
            alt="Buy Bløm Background"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 20%', transform: 'scale(1)' }}
          />
        </div>
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-shop-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-shop-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-shop-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-shop-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-shop-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-shop-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-shop-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-shop-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Shop
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
            Take Bløm home or give the gift of craft beverages
          </p>
        </div>
      </section>

      {/* Featured Aperitivo Banner */}
      <section className="py-20 bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-aperitivo-banner-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-aperitivo-banner-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-aperitivo-banner-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-aperitivo-banner-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-aperitivo-banner-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-aperitivo-banner-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-aperitivo-banner-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-aperitivo-banner-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-block px-4 py-2 bg-white text-orange-600 font-semibold rounded-full mb-6">
                Now Available
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Bløm Aperitivo
              </h2>
              <p className="text-2xl text-orange-50 mb-6">
                A cider-based botanical aperitif — bitter, floral, and made for sipping.
              </p>
              <p className="text-xl text-orange-100 mb-8">
                Order online for delivery or pickup. Perfect for cocktails or enjoyed on its own.
              </p>
              <div className="flex flex-wrap gap-4">
                <AperitivoBuyButton />
                <Link to="/products">
                  <button className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-orange-600 font-semibold rounded-md transition-colors text-lg">
                    Learn More
                  </button>
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <img
                src={aperitivoPhoto}
                alt="Bløm Aperitivo"
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="shop-bottles" className="py-16 bg-white dark:bg-gray-900 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Shop Our Products
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {bottles.map((product) => (
              <Card key={product.id} className="hover:shadow-xl transition-shadow dark:bg-gray-800 dark:border-gray-700 flex flex-col">
                <CardHeader className="p-0">
                  <img src={product.image} alt={product.name} className="w-full h-80 object-cover rounded-t-lg" />
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <CardTitle className="text-2xl mb-2">{product.name}</CardTitle>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 flex-1">
                    {product.blurb}
                    {product.abv && <span className="block mt-1 text-sm">{product.abv}</span>}
                  </p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-4">
                    {formatPrice(product.price)}
                  </p>
                  <AddToCart id={product.id} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/products">
              <Button size="lg" variant="outline" className="border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-gray-800">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Shop Options */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
            More Ways to Shop
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Buy Online */}
            <Card className="hover:shadow-xl transition-shadow dark:bg-gray-800 dark:border-gray-700 flex flex-col">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-2xl">Buy Online</CardTitle>
                <CardDescription className="text-base">
                  Order for delivery or pickup
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-gray-600 dark:text-gray-400 text-center mb-6 flex-1">
                  Browse our full selection and have it shipped directly to you or ready for pickup at the taproom.
                </p>
                <button
                  onClick={() => document.getElementById("shop-bottles")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full mt-auto px-4 py-3 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 text-white rounded-md font-semibold transition-colors"
                >
                  Shop bottles
                </button>
              </CardContent>
            </Card>

            {/* Gift Cards */}
            <Card className="hover:shadow-xl transition-shadow border-2 border-orange-600 dark:border-orange-500 dark:bg-gray-800 flex flex-col">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-2xl">Gift Cards</CardTitle>
                <CardDescription className="text-base">
                  Perfect for any occasion
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-gray-600 dark:text-gray-400 text-center mb-6 flex-1">
                  Give the gift of choice. Redeemable in our taproom and online shop. Never expires!
                </p>
                <div className="mt-auto space-y-2">
                  {giftCards.map((card) => (
                    <AddToCart key={card.id} id={card.id} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Club Membership */}
            <Card className="hover:shadow-xl transition-shadow dark:bg-gray-800 dark:border-gray-700 flex flex-col">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-2xl">Join the Club</CardTitle>
                <CardDescription className="text-base">
                  Members get exclusive perks
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-gray-600 dark:text-gray-400 text-center mb-6 flex-1">
                  Get early access to releases, discounts, and special member-only events.
                </p>
                <Link to="/club">
                  <Button className="w-full mt-auto bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 text-white">
                    Learn More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Growler Fills */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Growler & Howler Fills</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Take your favorites home fresh from the tap
            </p>
            <div className="mt-8 max-w-md mx-auto">
              <img
                src={meadCiderPhoto}
                alt="Fresh Growler Fills"
                className="w-full h-64 object-cover rounded-lg shadow-lg"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {fills.map((fill) => (
              <Card
                key={fill.id}
                className={`dark:bg-gray-800 ${fill.id === "howler-12" ? "border-2 border-orange-600 dark:border-orange-500" : "dark:border-gray-700"}`}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {formatPrice(fill.price)}
                  </CardTitle>
                  <CardDescription className="text-lg">{fill.name}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{fill.blurb}</p>
                  <AddToCart id={fill.id} />
                  {fill.id === "howler-12" && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 font-semibold">Best value</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-lg max-w-2xl mx-auto">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">How it works:</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-3 mt-2" />
                <span>Purchase your pack online or in the taproom</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-3 mt-2" />
                <span>Bring your own clean containers or purchase from us</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-3 mt-2" />
                <span>Fills never expire - use them at your own pace</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Shipping Info */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Truck className="w-16 h-16 text-orange-600 dark:text-orange-400 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Shipping Information</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="dark:bg-gray-800 dark:border-gray-700 flex flex-col">
              <CardHeader>
                <CardTitle>In-State Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                <div className="flex-1 space-y-3">
                  <p className="text-gray-600 dark:text-gray-400">Free shipping on orders over $75 within Michigan</p>
                  <p className="text-gray-600 dark:text-gray-400">Standard shipping: $10</p>
                  <p className="text-gray-600 dark:text-gray-400">Typical delivery: 2-3 business days</p>
                </div>
                <button
                  onClick={() => document.getElementById("shop-bottles")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full mt-auto px-4 py-3 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 text-white rounded-md font-semibold transition-colors"
                >
                  Start an order
                </button>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700 flex flex-col">
              <CardHeader>
                <CardTitle>Out of State Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                <div className="flex-1 space-y-3">
                  <p className="text-gray-600 dark:text-gray-400">We ship to select states</p>
                  <p className="text-gray-600 dark:text-gray-400">Shipping rates vary by location</p>
                  <p className="text-gray-600 dark:text-gray-400">Signature required on delivery (21+)</p>
                </div>
                <ShippingChecker />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Find Near You CTA */}
      <section className="py-16 bg-gradient-to-r from-orange-600 to-red-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-shop-cta-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-shop-cta-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-shop-cta-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-shop-cta-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-shop-cta-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-shop-cta-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-shop-cta-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-shop-cta-2)" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prefer to Shop Local?
          </h2>
          <p className="text-xl text-orange-50 mb-8">
            Find Bløm at retail stores and restaurants near you
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/locations">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 dark:bg-gray-100 dark:hover:bg-gray-200">
                Find Retail Stores
              </Button>
            </Link>
            <Link to="/taproom">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 dark:bg-gray-100 dark:hover:bg-gray-200">
                Visit Taproom
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
