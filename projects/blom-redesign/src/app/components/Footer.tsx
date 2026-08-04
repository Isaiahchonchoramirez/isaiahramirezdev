import { MapPin, Clock, Mail, Instagram, Facebook } from "lucide-react";
import { Link } from "react-router";
import NewsletterForm from "./NewsletterForm";

export default function Footer() {
  return (
    <footer className="bg-amber-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Hours */}
          <div>
            <h3 className="text-stone-900 dark:text-stone-100 font-bold text-lg mb-6 flex items-center">
              <Clock size={20} className="mr-2 text-orange-600 dark:text-orange-400" />
              DAYS & HOURS
            </h3>
            <div className="space-y-2 text-base">
              <p><span className="font-semibold text-stone-900 dark:text-stone-100">Tues - Thurs:</span> 4-10</p>
              <p><span className="font-semibold text-stone-900 dark:text-stone-100">Fri:</span> 2-11</p>
              <p><span className="font-semibold text-stone-900 dark:text-stone-100">Sat:</span> 12-11</p>
              <p><span className="font-semibold text-stone-900 dark:text-stone-100">Sun:</span> 2-7</p>
              <p><span className="font-semibold text-stone-900 dark:text-stone-100">Mon:</span> Closed</p>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-stone-900 dark:text-stone-100 font-bold text-lg mb-6 flex items-center">
              <Mail size={20} className="mr-2 text-orange-600 dark:text-orange-400" />
              CONTACT US
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin size={20} className="text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 mb-1">BLØM Taproom</p>
                  <p>123 Main Street</p>
                  <p>Ann Arbor, MI 48104</p>
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-full flex items-center justify-center hover:bg-orange-600 hover:text-white dark:hover:bg-orange-500 transition-colors border border-stone-300 dark:border-stone-600"
                  aria-label="Instagram"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-full flex items-center justify-center hover:bg-orange-600 hover:text-white dark:hover:bg-orange-500 transition-colors border border-stone-300 dark:border-stone-600"
                  aria-label="Facebook"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href="mailto:info@drinkblom.com"
                  className="w-10 h-10 bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-full flex items-center justify-center hover:bg-orange-600 hover:text-white dark:hover:bg-orange-500 transition-colors border border-stone-300 dark:border-stone-600"
                  aria-label="Email"
                >
                  <Mail size={20} />
                </a>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-stone-900 dark:text-stone-100 font-bold text-lg mb-6">GET THE NEWS</h3>
            <p className="text-sm mb-4">What kind of Bløm news interests you?</p>
            <NewsletterForm variant="stacked" interests />
          </div>
        </div>

        {/* Quick Links */}
        <div className="border-t border-stone-300 dark:border-stone-700 pt-8">
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <Link to="/about" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              About
            </Link>
            <Link to="/products" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Our Products
            </Link>
            <Link to="/taproom" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Taproom
            </Link>
            <Link to="/locations" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Find Blom
            </Link>
            <Link to="/events" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Events
            </Link>
            <Link to="/shop" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Shop
            </Link>
            <Link to="/club" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Club
            </Link>
          </div>
          <div className="text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Bløm Mead + Cider. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
