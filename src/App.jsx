import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/NavBar";
import Footer from "./sections/Footer";

import Home from "./pages/Home";

// Both of these pull in heavy dependencies — the jellyfish drags in the whole
// three.js stack, and the projects route is not what most visitors land on.
// Neither belongs in the bundle that renders the first screen.
const FloatingJelly = lazy(() => import("./components/FloatingJelly"));
const Projects = lazy(() => import("./pages/Projects"));

const App = () => {
  return (
    <>
      <Suspense fallback={null}>
        <FloatingJelly />
      </Suspense>

      <div className="relative" style={{ zIndex: 10 }}>
        <Navbar />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
    </>
  );
};

export default App;
