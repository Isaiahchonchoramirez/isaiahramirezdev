import { createHashRouter } from "react-router";
import Root from "./components/Root";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ProductsPage from "./pages/ProductsPage";
import TaproomPage from "./pages/TaproomPage";
import LocationsPage from "./pages/LocationsPage";
import EventsPage from "./pages/EventsPage";
import PrivateEventsPage from "./pages/PrivateEventsPage";
import ShopPage from "./pages/ShopPage";
import ClubPage from "./pages/ClubPage";

// Hash routing, not browser routing: this ships as static files inside the
// portfolio, and GitHub Pages answers /blom/shop with a 404 rather than
// handing the request back to index.html. The hash keeps every deep link and
// every refresh working without a server rewrite rule.
export const router = createHashRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: AboutPage },
      { path: "products", Component: ProductsPage },
      { path: "taproom", Component: TaproomPage },
      { path: "locations", Component: LocationsPage },
      { path: "events", Component: EventsPage },
      { path: "private-events", Component: PrivateEventsPage },
      { path: "shop", Component: ShopPage },
      { path: "club", Component: ClubPage },
    ],
  },
]);
