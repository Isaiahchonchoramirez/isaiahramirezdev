import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { navLinks } from "../constants/index.js";

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // navLinks store hrefs like "#work" — strip the # to get the element id.
  const goToSection = (href) => (e) => {
    e.preventDefault();
    const id = href.replace(/^#/, "");
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    if (location.pathname !== "/") {
      navigate("/");
      // Wait for Home to mount before scrolling.
      setTimeout(scroll, 50);
    } else {
      scroll();
    }
  };

  return (
    <header className={`navbar ${scrolled ? "scrolled" : "not-scrolled"}`}>
      <div className="inner">
        <a className="logo" href="#hero" onClick={goToSection("#hero")}>
          Isaiah Ramirez
        </a>

        <nav className="desktop">
          <ul>
            {navLinks.map((linkObj, index) => (
              <li key={index} className="group">
                <a href={linkObj.link} onClick={goToSection(linkObj.link)}>
                  <span>{linkObj.name}</span>
                  <span className="underline"></span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href="#contact"
          onClick={goToSection("#contact")}
          className="contact-btn group"
        >
          <div className="inner">
            <span>Contact me</span>
          </div>
        </a>
      </div>
    </header>
  );
};

export default NavBar;
