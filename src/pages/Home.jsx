import Hero from "../sections/Hero";
import ShowcaseSection from "../sections/ShowcaseSection";
import LogoSection from "../sections/LogoSection";
import FeatureCards from "../sections/FeatureCards";
import Experience from "../sections/ExperienceSection";
import TechStack from "../sections/TechStack";
import Testimonials from "../sections/Testimonials";
import Contact from "../sections/Contact";

const Home = () => {
  return (
    <>
      <Hero />
      <ShowcaseSection />
      <LogoSection />
      <FeatureCards />
      <Experience />
      <TechStack />
      <Testimonials />
      <Contact />
    </>
  );
};

export default Home;
