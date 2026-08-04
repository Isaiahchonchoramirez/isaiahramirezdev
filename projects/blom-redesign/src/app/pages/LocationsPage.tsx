import { MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import NewsletterForm from "../components/NewsletterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const retailStores = [
  { name: "Downtown Market", address: "456 Market St, Ann Arbor, MI", type: "Grocery" },
  { name: "Harvest Co-op", address: "789 Main St, Ypsilanti, MI", type: "Co-op" },
  { name: "The Beverage Center", address: "321 State St, Ann Arbor, MI", type: "Liquor Store" },
  { name: "Whole Earth Foods", address: "654 Liberty St, Ann Arbor, MI", type: "Grocery" },
];

const restaurants = [
  { name: "The Local Kitchen", address: "111 Washington St, Ann Arbor, MI", type: "Restaurant" },
  { name: "Craft & Cork", address: "222 Ashley St, Ann Arbor, MI", type: "Wine Bar" },
  { name: "Harvest Table", address: "333 Division St, Ypsilanti, MI", type: "Restaurant" },
];

export default function LocationsPage() {
  return (
    <div className="pt-20 min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-locations-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-locations-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-locations-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-locations-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-locations-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-locations-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-locations-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-locations-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Find Bløm
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto">
            Discover where to find our ciders and meads
          </p>
        </div>
      </section>

      {/* Taproom */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl text-gray-900 dark:text-white">Bløm Taproom</CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-400">Our home base - the best place to experience the full Bløm selection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3 mb-4">
                <MapPin className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-lg text-gray-900 dark:text-white">123 Main Street</p>
                  <p className="text-gray-600 dark:text-gray-400">Ann Arbor, MI 48104</p>
                </div>
              </div>
              <div className="text-gray-700 dark:text-gray-300 mb-6 space-y-1">
                <p><span className="font-semibold">Tues - Thurs:</span> 4-10pm</p>
                <p><span className="font-semibold">Fri:</span> 2-11pm</p>
                <p><span className="font-semibold">Sat:</span> 12-11pm</p>
                <p><span className="font-semibold">Sun:</span> 2-7pm</p>
                <p><span className="font-semibold">Mon:</span> Closed</p>
              </div>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=123+Main+Street,+Ann+Arbor,+MI+48104"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md transition-colors"
              >
                Get directions
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Retail Stores */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">Retail Stores</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Find Bløm products at these fine retailers across Michigan
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {retailStores.map((store, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">{store.name}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">{store.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{store.address}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bløm in the Wild (Restaurants) */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">Bløm in the Wild</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Enjoy Bløm on tap at these local restaurants and bars
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">{restaurant.name}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">{restaurant.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{restaurant.address}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Blom News */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Bløm News</h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
            Stay updated on new locations, releases, and events
          </p>
          <div className="max-w-md mx-auto text-left">
            <NewsletterForm />
          </div>
        </div>
      </section>

      {/* Out of State Shipping CTA */}
      <section className="py-16 bg-gradient-to-r from-orange-600 to-red-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-locations-cta-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-locations-cta-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-locations-cta-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-locations-cta-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-locations-cta-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-locations-cta-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-locations-cta-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-locations-cta-2)" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">
            Out of State?
          </h2>
          <p className="text-xl text-orange-50 mb-8">
            We ship to select states! Check if we can deliver to you.
          </p>
          <Link
            to="/shop"
            className="px-8 py-4 bg-white text-orange-600 hover:bg-gray-100 font-semibold rounded-md transition-colors inline-flex items-center"
          >
            Check your state
            <ExternalLink className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
