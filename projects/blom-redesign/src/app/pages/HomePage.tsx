import { Link } from "react-router";
import { motion } from "motion/react";
import { ChevronDown, Play } from "lucide-react";
import { useState } from "react";
import meadCiderPhoto from "../../imports/Bløm_Mead&Cider.webp";
import aperitivoPhoto from "../../imports/Bløm_Aperitivo.webp";
import videoThumbnail from "../../imports/BlømVideoThumbs2.webp";

export default function HomePage() {
  // The film is opt-in rather than an autoplaying background. It used to be a
  // full-screen YouTube iframe that loaded on arrival, which meant the first
  // thing a visitor saw was a black rectangle with a spinner — and, once it
  // did load, a hero carrying no words at all: no headline, no description of
  // what Bløm makes, and nothing to click. The usability study found all three
  // participants unclear on what the Aperitivo even was, and a wordless hero
  // is where that starts.
  const [playing, setPlaying] = useState(false);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="relative min-h-[calc(100vh-5rem)] flex items-center">
        <div className="absolute inset-0 overflow-hidden">
          {playing ? (
            <iframe
              className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-full min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2"
              src="https://www.youtube-nocookie.com/embed/ZOubh0mNxpA?autoplay=1&loop=1&playlist=ZOubh0mNxpA&rel=0&modestbranding=1&playsinline=1"
              title="Bløm: farm to Fourth Ave"
              allow="autoplay; encrypted-media; fullscreen"
            />
          ) : (
            <img src={videoThumbnail} alt="" className="w-full h-full object-cover" />
          )}
          {/* Dark on the left where the copy sits, clearing toward the right. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <p className="text-orange-300 font-semibold tracking-[0.2em] uppercase text-sm mb-4">
              Ann Arbor, Michigan
            </p>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.05]">
              Mead and cider,
              <br />
              grown here.
            </h1>

            <p className="text-xl md:text-2xl text-orange-50 mb-4 leading-relaxed">
              Bløm ferments Michigan wildflower honey and heirloom apples a few miles from where they grow.
            </p>

            <p className="text-lg text-orange-100/80 mb-9">
              Our newest is <span className="font-semibold text-white">Aperitivo</span> — a cider-based botanical
              aperitif, bitter and floral, built for a spritz.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/products"
                className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md transition-colors text-lg"
              >
                Meet the Aperitivo
              </Link>
              <Link
                to="/taproom"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/40 text-white font-semibold rounded-md transition-colors text-lg"
              >
                Visit the taproom
              </Link>
              {!playing && (
                <button
                  onClick={() => setPlaying(true)}
                  className="px-6 py-4 text-white font-semibold rounded-md transition-colors inline-flex items-center gap-2 hover:bg-white/10"
                >
                  <Play size={18} fill="currentColor" />
                  Watch the film
                </button>
              )}
            </div>
          </motion.div>
        </div>

        <button
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce text-white/80 hover:text-white transition-colors"
          aria-label="Scroll to content"
        >
          <ChevronDown size={40} />
        </button>
      </section>

      {/* Introduction Section - White */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-8">
              Welcome to Bløm
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
              We craft small-batch aperitivos, ciders, and meads that celebrate Michigan's rich agricultural heritage.
              Every bottle tells a story of local honey, heirloom apples, and the dedicated farmers who make it all possible.
            </p>
            <Link
              to="/about"
              className="inline-block px-8 py-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold rounded-md transition-colors text-lg"
            >
              Our Story
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Aperitivo Featured Section */}
      <section className="py-24 bg-gradient-to-br from-red-600 via-orange-600 to-red-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-aperitivo-home-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-aperitivo-home-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-aperitivo-home-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-aperitivo-home-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-aperitivo-home-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-aperitivo-home-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-aperitivo-home-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-aperitivo-home-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-block px-4 py-2 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 font-semibold rounded-full mb-6">
                Featured Product
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Bløm Aperitivo
              </h2>
              <p className="text-2xl text-orange-50 mb-6">
                A cider-based botanical aperitif — bitter, floral, and made for sipping.
              </p>
              <p className="text-xl text-orange-100 mb-8">
                Perfect as a spritz with soda and citrus, enjoyed neat over ice, or mixed into your favorite cocktail.
                Our Aperitivo combines Michigan cider with carefully selected botanicals for a uniquely refreshing experience.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-block px-8 py-4 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold rounded-md transition-colors text-lg"
                >
                  Discover Aperitivo
                </Link>
                <Link
                  to="/shop"
                  className="inline-block px-8 py-4 border-2 border-white dark:border-gray-300 text-white dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 font-semibold rounded-md transition-colors text-lg"
                >
                  Buy Now
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <img
                src={aperitivoPhoto}
                alt="Bløm Aperitivo"
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            </motion.div>
          </div>

          {/* Aperitivo Process */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-400 mb-4">1. Cider Base</h3>
              <p className="text-gray-700 dark:text-gray-300">
                We start with our crisp Michigan cider as the foundation, providing the perfect canvas for botanicals.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-400 mb-4">2. Botanicals</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Carefully selected herbs, roots, and flowers are added to create complex bitter and floral notes.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-400 mb-4">3. Infuse</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Time and patience allow the botanicals to meld with the cider, creating a balanced aperitif.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Cider Section - Amber/Orange Tones */}
      <section className="py-24 bg-orange-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl md:text-6xl font-bold mb-6 text-orange-700 dark:text-orange-400">
                Cider
              </h2>
              <p className="text-xl text-gray-800 dark:text-gray-300 mb-6 leading-relaxed">
                Our ciders begin in Michigan orchards where heirloom and modern apple varieties grow side by side.
                We press fresh juice at peak ripeness, capturing the essence of each season.
              </p>
              <p className="text-xl text-gray-800 dark:text-gray-300 mb-8 leading-relaxed">
                Traditional fermentation techniques meet modern craft, creating ciders that are crisp, complex,
                and utterly delicious. From bone-dry to gently sweet, each bottle celebrates the apple.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-block px-8 py-4 bg-orange-700 hover:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-semibold rounded-md transition-colors"
                >
                  Explore Ciders
                </Link>
                <Link
                  to="/shop"
                  className="inline-block px-8 py-4 border-2 border-orange-700 dark:border-orange-600 text-orange-700 dark:text-orange-600 hover:bg-orange-700 dark:hover:bg-orange-600 hover:text-white font-semibold rounded-md transition-colors"
                >
                  Buy Now
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <img
                src={meadCiderPhoto}
                alt="Bløm Mead & Cider"
                className="w-full h-[500px] object-cover rounded-lg shadow-2xl"
              />
            </motion.div>
          </div>

          {/* Cider Process */}
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-400 mb-4">1. Harvest</h3>
              <p className="text-gray-700 dark:text-gray-300">
                We select Michigan apples at peak ripeness, choosing varieties that bring unique flavors
                and characteristics to our ciders.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-400 mb-4">2. Press</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Fresh apples are carefully pressed to extract pure juice, preserving natural flavors
                and aromatics without additives.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-400 mb-4">3. Ferment</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Cultured yeasts transform apple juice into cider over weeks of careful fermentation,
                developing depth and character.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mead Section - Golden/Yellow Tones */}
      <section className="py-24 bg-amber-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-2 md:order-1"
            >
              <img
                src={aperitivoPhoto}
                alt="Bløm Aperitivo"
                className="w-full h-[500px] object-cover rounded-lg shadow-2xl"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-1 md:order-2"
            >
              <h2 className="text-5xl md:text-6xl font-bold mb-6 text-amber-700 dark:text-amber-400">
                Mead
              </h2>
              <p className="text-xl text-gray-800 dark:text-gray-300 mb-6 leading-relaxed">
                Mead is humanity's oldest fermented beverage, and we honor this ancient tradition with
                exceptional Michigan honey from dedicated local beekeepers.
              </p>
              <p className="text-xl text-gray-800 dark:text-gray-300 mb-8 leading-relaxed">
                Each honey variety brings unique flavors—wildflower, clover, basswood—creating meads that
                range from delicate and floral to rich and complex. Some batches include Michigan fruits,
                creating beautiful melomels that showcase our state's bounty.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-block px-8 py-4 bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-semibold rounded-md transition-colors"
                >
                  Explore Meads
                </Link>
                <Link
                  to="/shop"
                  className="inline-block px-8 py-4 border-2 border-amber-700 dark:border-amber-600 text-amber-700 dark:text-amber-600 hover:bg-amber-700 dark:hover:bg-amber-600 hover:text-white font-semibold rounded-md transition-colors"
                >
                  Buy Now
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Mead Process */}
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-400 mb-4">1. Honey</h3>
              <p className="text-gray-700 dark:text-gray-300">
                We source raw, unfiltered honey from Michigan beekeepers who practice sustainable,
                ethical apiary management.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-400 mb-4">2. Blend</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Honey is carefully blended with pure water and select yeasts, sometimes with fruits
                or botanicals for unique expressions.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-400 mb-4">3. Age</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Patience is essential. Our meads age for months, developing complexity and smoothness
                that can't be rushed.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Farm to Table Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Farm to Glass
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              Every ingredient tells a story of Michigan agriculture, sustainable practices,
              and the people who dedicate their lives to quality.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🍎</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Local Apples</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Heirloom and modern varieties from Michigan orchards
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🍯</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Raw Honey</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Unfiltered honey from sustainable Michigan apiaries
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🧬</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Cultured Yeast</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Carefully selected strains for optimal fermentation
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🌱</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Fresh Ingredients</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Seasonal fruits and botanicals for unique flavors
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-cta-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-cta-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-cta-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-cta-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-cta-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-cta-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-cta-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-cta-2)" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Experience Bløm
            </h2>
            <p className="text-xl md:text-2xl text-orange-50 mb-12">
              Visit our taproom to taste the full range of our craft ciders and meads
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/taproom"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold rounded-md transition-colors text-lg"
              >
                Visit Taproom
              </Link>
              <Link
                to="/shop"
                className="px-8 py-4 border-2 border-white dark:border-gray-300 text-white dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 font-semibold rounded-md transition-colors text-lg"
              >
                Shop Online
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
