

import TitleHeader from "../components/TitleHeader";
import useReveal from "../hooks/useReveal";
import TechMark from "../components/TechMark";
import TechIconCardExperience from "../components/Models/TechLogos/TechIcon";
import { techStackIcons } from "../constants";
// import { techStackImgs } from "../constants";

const TechStack = () => {
  const scopeRef = useReveal({ selector: ".tech-card", stagger: 85, variant: "scale" });

  return (
    <div id="skills" ref={scopeRef} className="flex-center section-padding">
      <div className="w-full h-full md:px-10 px-5">
        <TitleHeader
          title="How I Can Contribute & My Key Skills"
          sub="🤝 What I Bring to the Table"
        />
        <div className="tech-grid">
          {/* Loop through the techStackIcons array and create a component for each item. 
              The key is set to the name of the tech stack icon, and the classnames are set to 
              card-border, tech-card, overflow-hidden, and group. The xl:rounded-full and rounded-lg 
              classes are only applied on larger screens. */}
          {techStackIcons.map((tech) => (
            <div
              key={tech.name}
              className="card-border tech-card overflow-hidden group rounded-2xl"
            >
              <div className="tech-card-animated-bg" />
              <div className="tech-card-content">
                {/* The SVG mark holds the space until the model scrolls into
                    view, and stands in permanently for reduced motion. */}
                <div className="tech-icon-wrapper">
                  <TechIconCardExperience
                    model={tech}
                    fallback={
                      <div className="tech-mark-static">
                        <TechMark mark={tech.mark} size={64} />
                      </div>
                    }
                  />
                </div>
                <div className="padding-x w-full text-center">
                  <p className="font-semibold">{tech.label}</p>
                  <p className="text-white-50 mt-1.5 text-sm leading-snug">{tech.blurb}</p>
                </div>
              </div>
            </div>
          ))}

          {/* This is for the img part */}
          {/* {techStackImgs.map((techStackIcon, index) => (
            <div
              key={index}
              className="card-border tech-card overflow-hidden group xl:rounded-full rounded-lg"
            >
              <div className="tech-card-animated-bg" />
              <div className="tech-card-content">
                <div className="tech-icon-wrapper">
                  <img src={techStackIcon.imgPath} alt="" />
                </div>
                <div className="padding-x w-full">
                  <p>{techStackIcon.name}</p>
                </div>
              </div>
            </div>
          ))} */}
        </div>
      </div>
    </div>
  );
};

export default TechStack;
