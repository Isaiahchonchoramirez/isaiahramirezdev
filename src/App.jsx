import Navbar from "./components/NavBar";
import Hero from "./sections/Hero";
import ShowcaseSection from "./sections/ShowcaseSection";
import LogoSection from "./sections/LogoSection";
import FeatureCards from "./sections/FeatureCards";
import Experience from "./sections/ExperienceSection";
import TechStack from "./sections/TechStack";
import Testimonials from "./sections/Testimonials";
import Contact from "./sections/Contact";
import Footer from "./sections/Footer";
import FloatingJelly from "./components/FloatingJelly"; // ✅ Use wrapper, not raw Jellyfish

const App = () => {
  return (
    <div className="relative overflow-hidden">
    {/* Water shimmer behind everything */}
    <div className="shimmer-overlay fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />

    {/* Actual content */}
    <div className="relative z-10">
      <FloatingJelly />
      <Navbar />
      <Hero />
      <ShowcaseSection />
      <LogoSection />
      <FeatureCards />
      <Experience />
      <TechStack />
      <Testimonials />
      <Contact />
      <Footer />
      
    </div>
  </div>
  );
};


export default App;
