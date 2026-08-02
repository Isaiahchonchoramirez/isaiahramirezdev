import { Link } from "react-router-dom";

import TitleHeader from "../components/TitleHeader";
import projects from "../constants/projects";
import useReveal from "../hooks/useReveal";

const FeaturedWork = () => {
  const scopeRef = useReveal({ selector: ".featured-project", stagger: 90 });
  const featured = projects.filter((project) => project.featured).slice(0, 3);

  return (
    <section id="featured-work" ref={scopeRef} className="section-padding">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
        <TitleHeader
          title="Featured Work"
          sub="Selected systems where data, design, and code meet"
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {featured.map((project, index) => (
            <article key={project.id} className="featured-project">
              <div className="featured-project-media">
                <img src={project.image} alt={`${project.title} interface`} loading="lazy" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="featured-project-body">
                <p className="featured-project-kicker">{project.role}</p>
                <h3>{project.title}</h3>
                <p className="featured-project-outcome">{project.outcome}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {project.stack.slice(0, 4).map((item) => (
                    <span key={item} className="design-tool">{item}</span>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-4 text-sm uppercase tracking-[0.12em]">
                  <Link to={`/projects#${project.id}`} className="featured-link">
                    Case study <span aria-hidden="true">→</span>
                  </Link>
                  <a href={project.href} target="_blank" rel="noreferrer" className="featured-link muted">
                    Live demo <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link to="/projects" className="project-pill-link">Explore every project</Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedWork;
