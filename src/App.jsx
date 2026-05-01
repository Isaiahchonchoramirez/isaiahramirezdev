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
    <>
      {/* Jellyfish OUTSIDE the main div so it's not affected by overflow */}
      <FloatingJelly />
      
      <div className="relative" style={{zIndex:10}}>
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
    </>
  );
};

export default App;