import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import TitleHeader from "../components/TitleHeader";
import ProjectGallery from "../components/ProjectGallery";
import ProjectVideo from "../components/ProjectVideo";
import DataCaseStudy from "../components/DataCaseStudy";
import projects from "../constants/projects";
import { getAssetPath } from "../utils/assetPath";

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

const DataPreview = ({ preview, title }) => (
  <div className={`data-preview data-preview--${preview.variant}`} role="img" aria-label={preview.alt}>
    <div className="data-preview-topline">
      <span>{preview.eyebrow}</span>
      <span>{preview.metric}</span>
    </div>
    <div className="data-preview-plot" aria-hidden="true">
      {preview.values.map((value, index) => (
        <i key={`${value}-${index}`} style={{ "--value": `${value}%`, "--delay": `${index * 70}ms` }} />
      ))}
    </div>
    <div>
      <strong>{title}</strong>
      <p>{preview.caption}</p>
    </div>
  </div>
);

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

  // Not every project has somewhere to go — the Maya work is media, not a
  // site — so the anchors collapse to plain elements when there is no href.
  const hasLink = Boolean(project.href);
  const linkProps = project.external
    ? { href: project.href, target: "_blank", rel: "noreferrer" }
    : { href: project.href };
  const Wrap = hasLink ? "a" : "div";
  const wrapProps = hasLink ? linkProps : {};

  return (
    <div
      id={project.id}
      ref={rowRef}
      className="group md:py-20 py-12 border-t border-black-50 first:border-t-0"
    >
      <div className="grid xl:grid-cols-2 grid-cols-1 gap-10 xl:gap-16 items-center">
        <div className={flipped ? "xl:order-2" : ""}>
          {project.video ? (
            <ProjectVideo {...project.video} />
          ) : project.preview ? (
            <DataPreview preview={project.preview} title={project.title} />
          ) : (
            <Wrap
              {...wrapProps}
              className="block"
              {...(hasLink ? { "aria-label": `Open ${project.title}` } : {})}
            >
              <ProjectPreview src={project.image} alt={`${project.title} preview`} />
            </Wrap>
          )}
        </div>

        <div className={flipped ? "xl:order-1" : ""}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hero-badge">
              <p>{project.tagline}</p>
            </div>
            <p className="text-white-50 text-sm">{project.year}</p>
          </div>

          <Wrap {...wrapProps} className="block w-fit">
            <h2 className="md:text-5xl text-3xl font-semibold mt-6 group-hover:text-white-50 transition-colors duration-300">
              {project.title}
            </h2>
          </Wrap>

          <p className="text-white-50 md:text-lg mt-5 leading-relaxed">
            {project.description}
          </p>

          {(project.problem || project.outcome) && (
            <dl className="project-evidence-grid">
              <div><dt>The problem</dt><dd>{project.problem}</dd></div>
              <div><dt>The result</dt><dd>{project.outcome}</dd></div>
              <div><dt>My role</dt><dd>{project.role}</dd></div>
            </dl>
          )}

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

          {hasLink && (
            <a
              {...linkProps}
              className="mt-8 inline-flex items-center gap-2 uppercase text-sm tracking-wide"
            >
              {project.cta ?? "Visit site"}
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
          )}

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

      {project.gallery && <ProjectGallery groups={project.gallery} />}
      {project.dataFile && <DataCaseStudy file={project.dataFile} />}
    </div>
  );
};

const Projects = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = ["All", "AI", "Data", "Web", "UX", "Design", "3D"];
  const requested = searchParams.get("category") || "All";
  const active = categories.includes(requested) ? requested : "All";
  const visible = active === "All"
    ? projects
    : projects.filter((project) => project.categories?.includes(active));

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ block: "start" })
    );
  }, [location.hash]);

  return (
    <section id="projects-page" className="section-padding min-h-screen">
      <div className="w-full md:px-20 px-5">
        <TitleHeader
          title="Projects & Case Studies"
          sub="The problem, my role, the process, and what shipped."
        />

        <div className="project-filters" aria-label="Filter projects">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={active === category ? "is-active" : ""}
              aria-pressed={active === category}
              onClick={() => setSearchParams(category === "All" ? {} : { category })}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-16 md:mt-24">
          {visible.map((project, index) => (
            <ProjectRow key={project.id} project={project} index={index} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link to="/" className="cta-wrapper md:w-60 md:h-14 w-48 h-12">
            <div className="cta-button group">
              <div className="bg-circle" />
              <p className="text">Back to Home</p>
              <div className="arrow-wrapper arrow-wrapper--nav">
                <img src={getAssetPath("/images/arrow-right.svg")} alt="" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Projects;
