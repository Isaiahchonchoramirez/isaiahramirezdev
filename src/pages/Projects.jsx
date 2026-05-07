import { Link } from "react-router-dom";

import TitleHeader from "../components/TitleHeader";

const Projects = () => {
  return (
    <section id="projects-page" className="flex-center section-padding min-h-screen">
      <div className="w-full h-full md:px-20 px-5">
        <TitleHeader
          title="More Projects"
          sub="A growing collection of work I've shipped."
        />

        <div className="mt-16 grid md:grid-cols-2 gap-8">
          {/* Add project cards here as you build them out. */}
          <div className="rounded-2xl border border-white/10 p-8">
            <h3 className="text-2xl font-semibold">Coming soon</h3>
            <p className="text-white-50 mt-2">
              More projects will be listed here. Reach out if you'd like to see
              specific work.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <Link to="/" className="cta-wrapper">
            <div className="cta-button group">
              <div className="bg-circle" />
              <p className="text">Back to Home</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Projects;
