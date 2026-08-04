import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import Navigation from "./Navigation";
import Footer from "./Footer";
import BackToTop from "./BackToTop";
import CartDrawer from "./CartDrawer";
import { DarkModeProvider } from "../contexts/DarkModeContext";
import { CartProvider } from "../contexts/CartContext";

/**
 * A client-side route change does not reset the scroll position, so following
 * a link from halfway down one page landed halfway down the next.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Root() {
  return (
    <DarkModeProvider>
      <CartProvider>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
          <Navigation />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
          <BackToTop />
          <CartDrawer />
        </div>
      </CartProvider>
    </DarkModeProvider>
  );
}
