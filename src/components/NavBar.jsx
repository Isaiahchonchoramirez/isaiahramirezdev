import React, { useState, useEffect } from "react";
import { navLinks } from "../constants/index.js";

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className={`navbar ${scrolled ? "scrolled" : 'not-scrolled'}`}>
      <div className="inner">
        <a className="logo" href="#hero">
          Isaiah Ramirez
        </a>

        <nav className="desktop">
          <ul>
            {navLinks.map((linkObj, index) => (
              <li key={index} className="group">
                <a href={linkObj.link}>
                  <span>{linkObj.name}</span>
                  <span className="underline"></span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href="#contact" className="contact-btn group">
          <div className="inner">
            <span>Contact me</span>
          </div>
        </a>
      </div>
    </header>
  );
};

export default NavBar;

