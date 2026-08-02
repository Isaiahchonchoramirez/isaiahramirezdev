import TitleHeader from "../components/TitleHeader";
import useReveal from "../hooks/useReveal";
import { education, expCards, leadership } from "../constants";

/**
 * Experience, education and leadership.
 *
 * Rewritten against the résumé. The previous version showed bare job titles
 * with no employer under a "Professional Work Experience" heading — which
 * reads as company employment rather than the freelance engagements these
 * actually are — carried two wrong date ranges, attached unattributed praise
 * quotes to each role, and omitted education entirely.
 *
 * Reveal is the IntersectionObserver helper rather than a ScrollTrigger tween,
 * for the same reason as everywhere else: content must never be able to strand
 * itself at opacity 0.
 */
const ExperienceSection = () => {
  const scopeRef = useReveal({ selector: ".timeline-entry", stagger: 70 });

  return (
    <section id="experience" ref={scopeRef} className="flex-center section-padding xl:px-0">
      <div className="h-full w-full px-5 md:px-20">
        <TitleHeader title="Experience & Education" sub="📁 Where I've been building" />

        {/* ---- Freelance engagements ---- */}
        <ol className="mt-16 space-y-10">
          {expCards.map((card) => (
            <li key={card.title} className="timeline-entry exp-entry">
              <span className="exp-dot" aria-hidden="true" />
              <div className="exp-body">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h3 className="text-xl font-semibold md:text-2xl">{card.title}</h3>
                  <p className="text-white-50 text-sm">{card.date}</p>
                </div>
                <p className="text-blue-50 mt-1 text-sm">
                  {card.org} · {card.location}
                </p>
                <ul className="text-white-50 mt-4 flex flex-col gap-2">
                  {card.responsibilities.map((item) => (
                    <li key={item} className="flex gap-3 leading-relaxed">
                      <span className="bg-white-50 mt-2.5 size-1 flex-none rounded-full" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        {/* ---- Education ---- */}
        <h3 className="mt-24 text-sm font-semibold uppercase tracking-[0.16em] text-blue-50">
          Education
        </h3>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {education.map((ed) => (
            <div key={ed.school} className="timeline-entry card-border rounded-2xl p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h4 className="text-lg font-semibold">{ed.school}</h4>
                <p className="text-white-50 text-sm">{ed.date}</p>
              </div>
              <p className="text-blue-50 mt-1 text-sm">
                {ed.degree} · {ed.location}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {ed.courses.map((course) => (
                  <span
                    key={course}
                    className="card-border text-white-50 rounded-full px-3 py-1 text-xs"
                  >
                    {course}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ---- Leadership ---- */}
        <h3 className="mt-16 text-sm font-semibold uppercase tracking-[0.16em] text-blue-50">
          Leadership & Involvement
        </h3>
        <div className="mt-6 grid gap-6">
          {leadership.map((role) => (
            <div key={role.role} className="timeline-entry card-border rounded-2xl p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h4 className="text-lg font-semibold">
                  {role.role} · <span className="text-white-50 font-normal">{role.org}</span>
                </h4>
                <p className="text-white-50 text-sm">{role.date}</p>
              </div>
              <ul className="text-white-50 mt-4 flex flex-col gap-2">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-3 leading-relaxed">
                    <span className="bg-white-50 mt-2.5 size-1 flex-none rounded-full" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
