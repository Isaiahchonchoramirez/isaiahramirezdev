import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Link } from "react-router";
import { useCart } from "../contexts/CartContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import aperitivoPhoto from "../../imports/Bløm_Aperitivo.webp";
import meadCiderPhoto from "../../imports/Bløm_Mead&Cider.webp";

interface Product {
  id: number;
  name: string;
  type: "cider" | "mead" | "aperitivo";
  style: string;
  abv: string;
  description: string;
  flavorProfile: string[];
  availability: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "Bløm Aperitivo",
    type: "aperitivo",
    style: "Botanical Aperitif",
    abv: "15%",
    description: "Fortified Michigan cider rested on local bittering herbs and fruit. Similar to sipping vermouth.",
    flavorProfile: ["Bitter", "Floral", "Refreshing"],
    availability: "Year-round"
  },
  {
    id: 2,
    name: "Dry Cider 2025 Harvest",
    type: "cider",
    style: "Dry Cider",
    abv: "6.5%",
    description: "2025 Michigan harvest featuring Brown's, Medaille d'Or, and Michelin apples.",
    flavorProfile: ["Sharp", "Tannic", "Dapper"],
    availability: "Year-round"
  },
  {
    id: 3,
    name: "Tart Cider",
    type: "cider",
    style: "Tart Cider",
    abv: "5.4%",
    description: "Fruit-forward green apple flavor. Heavy tart, light tannins, smooth finish.",
    flavorProfile: ["Green", "Fresh", "Peppy"],
    availability: "Year-round"
  },
  {
    id: 4,
    name: "Semi-Dry Cider",
    type: "cider",
    style: "Semi-Dry Cider",
    abv: "5.6%",
    description: "Easy-drinking with red apple flavor balancing mild acidity and light tannins.",
    flavorProfile: ["Clean", "Stone Fruit", "Easy Going"],
    availability: "Year-round"
  },
  {
    id: 5,
    name: "Pear Ginger Cider",
    type: "cider",
    style: "Pear Cider",
    abv: "5.7%",
    description: "Michigan apples and pears fermented with fresh ginger root. Has a zip!",
    flavorProfile: ["Tart", "Lush", "Lively"],
    availability: "Seasonal"
  },
  {
    id: 6,
    name: "Perry Saison",
    type: "cider",
    style: "Perry",
    abv: "6.8%",
    description: "Bosc pear forward with Saison funk. Warm fermentation. Semi-dry.",
    flavorProfile: ["Funky", "Fruity", "Eccentric"],
    availability: "Limited Release"
  },
  {
    id: 7,
    name: "Standard Mead",
    type: "mead",
    style: "Semi-Dry Mead",
    abv: "6.4%",
    description: "Mildly back-sweetened to emphasize honey taste and aroma.",
    flavorProfile: ["Citrus", "Mineral", "Playful"],
    availability: "Year-round"
  },
  {
    id: 8,
    name: "Apple Cyser",
    type: "mead",
    style: "Cyser",
    abv: "6.2%",
    description: "Wildflower honey with Michigan apple cider blend. Highlights tannins and acidity.",
    flavorProfile: ["Golden", "Crisp", "Sociable"],
    availability: "Year-round"
  },
  {
    id: 9,
    name: "Blueberry Maple Mead",
    type: "mead",
    style: "Melomel",
    abv: "6.6%",
    description: "Floral pressed blueberries with rich maple syrup for moderate sweetness.",
    flavorProfile: ["Woodsy", "Jammy", "Charming"],
    availability: "Seasonal"
  },
  {
    id: 10,
    name: "Paw Paw Sour Mead",
    type: "mead",
    style: "Sour Mead",
    abv: "6.9%",
    description: "Hand-picked local paw paws with sour yeast. Hint of pineapple on first sip!",
    flavorProfile: ["Tropical", "Sour", "Unique"],
    availability: "Limited Release"
  },
];

export default function ProductsPage() {
  const { add } = useCart();

  const [selectedTab, setSelectedTab] = useState("all");

  const filteredProducts = selectedTab === "all" 
    ? products 
    : products.filter(p => p.type === selectedTab);

  return (
    <div className="pt-20 min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Our Products
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto">
            Explore our aperitivo, craft ciders, and meads
          </p>
        </div>
      </section>

      {/* Featured: Aperitivo */}
      <section className="py-20 bg-gradient-to-b from-orange-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src={aperitivoPhoto}
                alt="Bløm Aperitivo"
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            </div>
            <div>
              <div className="inline-block px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white font-semibold rounded-full mb-6">
                Featured Product
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Bløm Aperitivo
              </h2>
              <p className="text-2xl text-gray-700 dark:text-gray-300 mb-6 font-semibold">
                A cider-based botanical aperitif — bitter, floral, and made for sipping.
              </p>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Perfect as a spritz with soda and citrus, enjoyed neat over ice, or mixed into your favorite cocktail.
                Our Aperitivo combines Michigan cider with carefully selected botanicals for a uniquely refreshing aperitif experience.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="px-4 py-2 bg-orange-100 dark:bg-gray-800 text-orange-800 dark:text-orange-400 font-semibold rounded-full">
                  15% ABV
                </span>
                <span className="px-4 py-2 bg-orange-100 dark:bg-gray-800 text-orange-800 dark:text-orange-400 font-semibold rounded-full">
                  Bitter Orange
                </span>
                <span className="px-4 py-2 bg-orange-100 dark:bg-gray-800 text-orange-800 dark:text-orange-400 font-semibold rounded-full">
                  Botanicals
                </span>
                <span className="px-4 py-2 bg-orange-100 dark:bg-gray-800 text-orange-800 dark:text-orange-400 font-semibold rounded-full">
                  Floral
                </span>
              </div>
              <button onClick={() => add("aperitivo")} className="px-8 py-4 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 text-white font-semibold rounded-md transition-colors text-lg">
                Buy Aperitivo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-12">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="aperitivo">Aperitivo</TabsTrigger>
              <TabsTrigger value="cider">Ciders</TabsTrigger>
              <TabsTrigger value="mead">Meads</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
                <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
                  {product.type === "aperitivo" ? (
                    <img
                      src={aperitivoPhoto}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={meadCiderPhoto}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-2xl dark:text-white">{product.name}</CardTitle>
                    <span className="text-sm font-semibold bg-orange-100 dark:bg-gray-700 text-orange-800 dark:text-orange-400 px-3 py-1 rounded-full">
                      {product.abv}
                    </span>
                  </div>
                  <CardDescription className="text-base">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{product.style}</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-600 dark:text-gray-400">{product.availability}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{product.description}</p>
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Flavor Profile:</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.flavorProfile.map((flavor, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full"
                        >
                          {flavor}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Where to Find */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Where to Find Our Products
          </h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
            Experience the full range at our taproom or find us at select retailers
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/taproom"
              className="inline-block px-8 py-4 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 text-white font-semibold rounded-md transition-colors"
            >
              Visit the taproom
            </Link>
            <Link
              to="/locations"
              className="inline-block px-8 py-4 border-2 border-gray-900 dark:border-gray-300 hover:bg-gray-900 dark:hover:bg-gray-300 hover:text-white dark:hover:text-gray-900 dark:text-gray-300 font-semibold rounded-md transition-colors"
            >
              Find retail stores
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
