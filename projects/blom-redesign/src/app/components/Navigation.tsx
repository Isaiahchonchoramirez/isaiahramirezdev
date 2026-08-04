import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, Search, Moon, Sun, ShoppingBag } from "lucide-react";
import blomLogo from "../../imports/BLOM_Logo.png";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useCart } from "../contexts/CartContext";
import SearchDialog from "./SearchDialog";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { count, setOpen: setCartOpen } = useCart();

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Cmd/Ctrl-K opens search, the shortcut anyone who searches expects.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  const navLinks = [
    { path: "/products", label: "Aperitivo" },
    { path: "/about", label: "About" },
    { path: "/taproom", label: "Taproom + Menu" },
    { path: "/events", label: "Events" },
    { path: "/shop", label: "Shop" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-md transition-all duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={blomLogo}
              alt="BLØM Mead + Cider"
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium ${
                  location.pathname === link.path ? 'text-orange-600 dark:text-orange-400' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Search"
              title="Search (⌘K)"
            >
              <Search size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <CartButton count={count} onClick={() => setCartOpen(true)} />
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun size={20} className="text-gray-300" />
              ) : (
                <Moon size={20} className="text-gray-700" />
              )}
            </button>
          </div>

          {/* Mobile Menu & Dark Mode Toggle */}
          <div className="md:hidden flex items-center space-x-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Search"
            >
              <Search size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <CartButton count={count} onClick={() => setCartOpen(true)} />
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun size={20} className="text-gray-300" />
              ) : (
                <Moon size={20} className="text-gray-700" />
              )}
            </button>
            <button
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md font-medium ${
                    location.pathname === link.path ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}

function CartButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart, empty"}
    >
      <ShoppingBag size={20} className="text-gray-700 dark:text-gray-300" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
