import { useState } from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Clock, MapPin, Phone } from "lucide-react";
import drinkMenuImage from "../../imports/drinkmenu.webp";
import foodMenuImage from "../../imports/foodmenu.webp";

export default function TaproomPage() {
  const [activeTab, setActiveTab] = useState("drinks");

  return (
    <div className="pt-20 min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-taproom-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-taproom-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-taproom-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-taproom-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-taproom-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-taproom-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-taproom-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-taproom-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Taproom + Menu
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto">
            Experience Bløm in person
          </p>
        </div>
      </section>

      {/* Taproom Info */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1698842390212-7399050a3627?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaWRlcnklMjB0YXByb29tfGVufDF8fHx8MTc3NTgzNzE3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Bløm Taproom"
                className="w-full h-96 object-cover rounded-lg shadow-xl"
              />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Visit Us</h2>
              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">123 Main Street</p>
                    <p className="text-gray-600 dark:text-gray-400">Ann Arbor, MI 48104</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">Hours</p>
                    <div className="text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Tues - Thurs: 4-10pm</p>
                      <p>Fri: 2-11pm</p>
                      <p>Sat: 12-11pm</p>
                      <p>Sun: 2-7pm</p>
                      <p>Mon: Closed</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">(734) 555-BLOM</p>
                  </div>
                </div>
              </div>
              <a href="https://www.google.com/maps/dir/?api=1&destination=123+Main+Street,+Ann+Arbor,+MI+48104" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md transition-colors">
                Get directions
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Menus */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-12 text-center">Menus</h2>

          <Tabs defaultValue="drinks" onValueChange={setActiveTab} className="max-w-5xl mx-auto">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
              <TabsTrigger value="drinks">Drink Menu</TabsTrigger>
              <TabsTrigger value="food">Food Menu</TabsTrigger>
            </TabsList>

            <div className="mb-8">
              <img
                src={activeTab === "drinks" ? drinkMenuImage : foodMenuImage}
                alt={activeTab === "drinks" ? "Drink Menu" : "Food Menu"}
                className="w-full h-[600px] object-cover rounded-lg shadow-xl"
              />
            </div>

            <TabsContent value="drinks" className="space-y-8">
              <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 p-8 rounded-lg shadow-md">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">On Tap Now</h3>
                <div className="space-y-6">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Heritage Blend</h4>
                      <span className="text-gray-600 dark:text-gray-400">$7</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Dry Cider • 6.5% ABV</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Our flagship dry cider from Michigan heirloom apples</p>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Golden Meadow</h4>
                      <span className="text-gray-600 dark:text-gray-400">$9</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Traditional Mead • 12.5% ABV</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Classic honey wine with wildflower honey</p>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Berry Blossom</h4>
                      <span className="text-gray-600 dark:text-gray-400">$10</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Melomel • 11.0% ABV</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Honey wine with Michigan raspberries and blueberries</p>
                  </div>
                </div>
                <div className="mt-8 p-4 bg-orange-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">Flights Available</p>
                  <p className="text-gray-700 dark:text-gray-300">Try 4 of our beverages for $18</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="food" className="space-y-8">
              <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 p-8 rounded-lg shadow-md">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Food Menu</h3>
                <div className="space-y-6">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Artisan Cheese Board</h4>
                      <span className="text-gray-600 dark:text-gray-400">$16</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Selection of Michigan cheeses, honey, seasonal fruit, and crackers</p>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Charcuterie Plate</h4>
                      <span className="text-gray-600 dark:text-gray-400">$18</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Cured meats, pickled vegetables, mustard, bread</p>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Seasonal Flatbread</h4>
                      <span className="text-gray-600 dark:text-gray-400">$14</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Rotating seasonal toppings, ask your server</p>
                  </div>
                </div>
                <div className="mt-8 p-4 bg-orange-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300">Food trucks on weekends! Check our events calendar.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
