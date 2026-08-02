
import AnimatedCounter from "../components/AnimatedCounter";
import Button from "../components/Button";
import { words } from "../constants";
import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";

// Ambient particles are decoration; they must not block the headline.
const HeroExperience = lazy(() =>
  import("../components/Models/HeroModels/HeroExperience")
);
import { getAssetPath } from "../utils/assetPath";

// Hero Section Component
const Hero = () => {

  return (
    <section id="hero" className="relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute top-0 left-0 z-10">
        <img src={getAssetPath("/images/bg.png")} alt="Background" />
      </div>

      <div className="hero-layout">
        {/* Left: Hero Content */}
        <header className="flex flex-col justify-center md:w-full w-screen md:px-10 px-5">
          <div className="flex flex-col gap-7">
            <div className="hero-text">
              <h1>
                Bringing
                <span className="slide">
                  <span className="wrapper">
                    {[...words, ...words].map((word, index) => (
                      <span key={index} className="flex items-center md:gap-3 gap-1 pb-2">
                        <img
                          src={word.imgPath}
                          alt={word.text}
                          className="xl:size-12 md:size-10 size-7 md:p-2 p-1 rounded-full bg-white"
                        />
                        <span>{word.text}</span>
                      </span>
                    ))}
                  </span>
                </span>
              </h1>
              <h1>to life through pixels.</h1>
              <h1>Data, design, code—and curiosity.</h1>
            </div>

            <p className="text-white-50 md:text-xl relative z-10 pointer-events-none">
              University of Michigan information analysis student building AI tools,
              data applications, interactive websites, and human-centered experiences.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button text="View Featured Work" className="md:w-72 md:h-16 w-60 h-12" id="featured-work" />
              <button
                type="button"
                className="hero-secondary-action"
                onClick={() => window.dispatchEvent(new Event("open-explore-current"))}
              >
                Explore with the jellyfish
              </button>
              <Link to="/projects" className="hero-text-link">All projects →</Link>
            </div>
          </div>
        </header>

        {/* Right: Hero 3D (Optional visual element) */}
        <figure>
          <div className="hero-3d-layout">
            <Suspense fallback={null}>
              <HeroExperience />
            </Suspense>
          </div>
        </figure>
      </div>

      <AnimatedCounter />
    </section>
  );
};

export default Hero;
