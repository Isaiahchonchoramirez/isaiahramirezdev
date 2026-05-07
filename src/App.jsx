import { Routes, Route } from "react-router-dom";

import Navbar from "./components/NavBar";
import Footer from "./sections/Footer";
import FloatingJelly from "./components/FloatingJelly";

import Home from "./pages/Home";
import Projects from "./pages/Projects";

const App = () => {
  return (
    <>
      <FloatingJelly />

      <div className="relative" style={{ zIndex: 10 }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
        </Routes>
        <Footer />
      </div>
    </>
  );
};

export default App;
