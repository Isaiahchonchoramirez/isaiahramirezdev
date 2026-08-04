import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Link } from "react-router";
import { Leaf, Heart, Award, Users } from "lucide-react";
import muralGraphic from "../../imports/Mural.Graphic.webp";
import ownersPhoto from "../../imports/Owners.webp";

export default function AboutPage() {
  return (
    <div className="pt-20 min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-about-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-about-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-about-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-about-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-about-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-about-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-about-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-about-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            About Bløm
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto">
            Crafting exceptional aperitivo, cider, and mead in the heart of Michigan
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">Our Story</h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Bløm began with a simple passion: to create beverages that celebrate Michigan's rich agricultural heritage and the timeless craft of fermentation.
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Our name, Bløm, reflects the blossoming of flavors in every bottle. We believe in letting quality ingredients shine, using traditional methods combined with innovative techniques to create aperitivos, ciders, and meads that are both approachable and complex.
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Every batch we produce is a labor of love, carefully crafted to bring joy to those who share it.
              </p>
            </div>
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1665315302321-46989ca7829a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHByb2R1Y2UlMjBmYXJtfGVufDF8fHx8MTc3NTgzNjMwOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Our Ingredients"
                className="w-full h-96 object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Founders */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Meet the Founders
            </h2>
          </div>

          <div className="mb-12">
            <img
              src={ownersPhoto}
              alt="Lauren and Matt, Bløm Founders"
              className="w-full max-w-4xl mx-auto h-auto rounded-lg shadow-2xl"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Lauren */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Lauren</h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                After years in the nonprofit sector, Lauren discovered that her true passion lay in what had become her outside-of-work stress reliever: food. More specifically, local food production.
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                She joined the board of Slow Food Chicago, advocating for the value and pleasure of good food for all. When Lauren and Matt moved to Ann Arbor, they were ready to put down roots in their home state and create Bløm—a business highlighting Michigan's mouth-watering local ingredients through sessionable brews.
              </p>
            </div>

            {/* Matt */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Matt</h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Matt started as a financial professional but found it far more exciting to apply those analytical skills to brewing chemistry. As owner and head brewer for Begyle Brewing in Chicago, he unfortunately discovered he couldn't process gluten—his love affair with beer had ended.
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Still hooked on creative fermentation and intrigued by the quirky possibilities of mead and cider, Matt found Bløm to be the perfect fusion of what he enjoys making and drinking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-12 text-center">What We Stand For</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Quality</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We use only the finest ingredients and time-tested techniques to ensure exceptional flavor.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Sustainability</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Environmental responsibility guides our sourcing and production practices.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Community</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Supporting local farmers, beekeepers, and artisans who share our values.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Passion</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Every bottle reflects our dedication to the craft and love for what we do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Aperitivo, Cider + Mead Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              About Aperitivo, Cider + Mead
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Ancient beverages, modern craft
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900 dark:to-orange-900 p-8 rounded-lg">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Aperitivo</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our aperitivo is a cider-based botanical aperitif that combines Michigan cider with carefully selected herbs, roots, and flowers.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Perfect for cocktails or sipping on its own, our aperitivo offers bitter and floral notes that awaken the palate and celebrate the art of the aperitif.
              </p>
              <Link
                to="/products"
                className="inline-block text-orange-600 dark:text-orange-400 font-semibold hover:text-orange-700 dark:hover:text-orange-300"
              >
                Explore Our Aperitivo →
              </Link>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900 dark:to-orange-900 p-8 rounded-lg">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Cider</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Cider is one of the world's oldest fermented beverages, made from the juice of apples. We use a blend of heirloom and modern apple varieties to create complex flavor profiles.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our cider-making process combines traditional pressing methods with modern fermentation science, resulting in beverages that honor the past while embracing innovation.
              </p>
              <Link
                to="/products"
                className="inline-block text-orange-600 dark:text-orange-400 font-semibold hover:text-orange-700 dark:hover:text-orange-300"
              >
                Explore Our Ciders →
              </Link>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900 dark:to-amber-900 p-8 rounded-lg">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Mead</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Mead, often called "honey wine," is the oldest known fermented beverage, dating back thousands of years. We work with local Michigan beekeepers to source exceptional honey.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Each batch of mead is a unique expression of the flowers the bees visited, creating flavors that change with the seasons and reflect our local terroir.
              </p>
              <Link
                to="/products"
                className="inline-block text-orange-600 dark:text-orange-400 font-semibold hover:text-orange-700 dark:hover:text-orange-300"
              >
                Explore Our Meads →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1751482599820-f5b80c0852bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXN0YWluYWJsZSUyMGZhcm1pbmclMjBiZWVzfGVufDF8fHx8MTc3NTgzNzE3Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Sustainable Farming"
                className="w-full h-96 object-cover rounded-lg shadow-xl"
              />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Sustainability</h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                We believe that great beverages start with a healthy planet. Our commitment to sustainability guides every decision we make, from sourcing to production.
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-3 mt-2" />
                  <span>Partnering with organic and sustainable farms whenever possible</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-3 mt-2" />
                  <span>Supporting local beekeepers who practice ethical apiary management</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-3 mt-2" />
                  <span>Minimizing waste through composting and recycling programs</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-3 mt-2" />
                  <span>Using energy-efficient equipment and sustainable packaging</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Our Farmers & Partners */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Our Farmers & Partners
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12">
              We're proud to work with these exceptional Michigan farms and producers
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            {/* Left Column - First 9 Farmers */}
            <div className="space-y-3 text-right pr-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Green Family Honey Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Midland</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Droscha Sugarbush</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Mason</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">King Orchard</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Central Lake</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Schaub Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lake Leelanau</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Great Lakes Bee Company</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Fremont</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Lutz Farms</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kaleva</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Coons Berry Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Coleman</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">White Lotus Farms</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ann Arbor</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Dutcher Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Goetzville</p>
              </div>
            </div>

            {/* Center - Image */}
            <div className="flex items-center justify-center">
              <img
                src={muralGraphic}
                alt="Michigan Farmers and Partners"
                className="w-full h-auto"
              />
            </div>

            {/* Right Column - Remaining 8 Farmers */}
            <div className="space-y-3 pl-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Brines Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Whitmore Lake</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Lakeview Hill</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Traverse City</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Seeley Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ann Arbor</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Green Things Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ann Arbor</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Gateway Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plymouth</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">The Farm on Jennings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ann Arbor</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">MSU Student Organic Farm</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Holt</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Treeborn</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Owosso</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PBS Episode */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              As Featured on PBS
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300">
              Watch our story and learn more about the craft of aperitivo, cider, and mead making
            </p>
          </div>
          <div className="aspect-video w-full rounded-lg overflow-hidden shadow-2xl">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/dJVfB79pNOQ"
              title="Bløm Featured on PBS"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
      </section>
    </div>
  );
}
