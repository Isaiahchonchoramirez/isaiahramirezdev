import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import TitleHeader from "../components/TitleHeader";
import projects from "../constants/projects";

gsap.registerPlugin(ScrollTrigger);

const ProjectPreview = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden border border-black-50 bg-black-100 shadow-2xl shadow-black/60">
      <div className="flex items-center gap-2 px-4 py-3 bg-black-200/60 border-b border-black-50">
        <span className="size-3 rounded-full bg-white/20" />
        <span className="size-3 rounded-full bg-white/20" />
        <span className="size-3 rounded-full bg-white/20" />
      </div>

      {failed ? (
        <div className="aspect-video flex-center bg-gradient-to-br from-black-200 to-black-100">
          <p className="text-white-50 text-sm px-6 text-center">
            Add a screenshot at{" "}
            <span className="font-mono text-xs break-all">{src}</span>
          </p>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full aspect-video object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
        />
      )}
    </div>
  );
};

const ProjectRow = ({ project, index }) => {
  const rowRef = useRef(null);
  const flipped = index % 2 === 1;

  useGSAP(
    () => {
      gsap.fromTo(
        rowRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: rowRef.current,
            start: "top bottom-=120",
          },
        }
      );
    },
    { scope: rowRef }
  );

  const linkProps = project.external
    ? { href: project.href, target: "_blank", rel: "noreferrer" }
    : { href: project.href };

  return (
    <div
      ref={rowRef}
      className="group md:py-20 py-12 border-t border-black-50 first:border-t-0"
    >
      <div className="grid xl:grid-cols-2 grid-cols-1 gap-10 xl:gap-16 items-center">
        <div className={flipped ? "xl:order-2" : ""}>
          <a {...linkProps} className="block" aria-label={`Open ${project.title}`}>
            <ProjectPreview src={project.image} alt={`${project.title} preview`} />
          </a>
        </div>

        <div className={flipped ? "xl:order-1" : ""}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hero-badge">
              <p>{project.tagline}</p>
            </div>
            <p className="text-white-50 text-sm">{project.year}</p>
          </div>

          <a {...linkProps} className="block w-fit">
            <h2 className="md:text-5xl text-3xl font-semibold mt-6 group-hover:text-white-50 transition-colors duration-300">
              {project.title}
            </h2>
          </a>

          <p className="text-white-50 md:text-lg mt-5 leading-relaxed">
            {project.description}
          </p>

          {project.highlights?.length > 0 && (
            <ul className="mt-6 space-y-3">
              {project.highlights.map((item) => (
                <li key={item} className="flex gap-3 text-white-50">
                  <span className="mt-2 size-1.5 rounded-full bg-white-50 flex-none" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {project.stack?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-7">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 rounded-full text-sm card-border text-white-50"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          <a
            {...linkProps}
            className="mt-8 inline-flex items-center gap-2 uppercase text-sm tracking-wide"
          >
            {project.cta ?? "Visit site"}
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>

          {project.related && (
            <a
              href={project.related.href}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center gap-3 w-fit rounded-xl card-border px-4 py-3 text-white-50 hover:text-white transition-colors duration-300"
            >
              <span className="text-xs uppercase tracking-wide flex-none">
                Pairs with
              </span>
              <span className="text-sm">
                <span className="text-white font-semibold">
                  {project.related.title}
                </span>{" "}
                — {project.related.blurb}
              </span>
              <span className="flex-none">↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  return (
    <section id="projects-page" className="section-padding min-h-screen">
      <div className="w-full md:px-20 px-5">
        <TitleHeader
          title="More Projects"
          sub="A growing collection of work I've shipped."
        />

        <div className="mt-16 md:mt-24">
          {projects.map((project, index) => (
            <ProjectRow key={project.id} project={project} index={index} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link to="/" className="cta-wrapper md:w-60 md:h-14 w-48 h-12">
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
