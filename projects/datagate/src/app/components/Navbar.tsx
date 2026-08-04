import { useEffect, useState } from "react";
import { Zap, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const LINKS = [
  { label: "Capabilities", id: "intelligence" },
  { label: "Upload", id: "archive" },
  { label: "Report", id: "scan" },
  { label: "Relay", id: "relays" },
];

export function Navbar({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("intelligence");

  // Highlight whichever section is on screen, so the nav is a position
  // indicator rather than four inert words.
  useEffect(() => {
    const sections = LINKS.map((link) => document.getElementById(link.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.1, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const go = (id: string) => {
    setOpen(false);
    onNavigate(id);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#000814]/85 border-b border-[#00d9ff]/20">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center space-x-3 flex-shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          aria-label="Back to top"
        >
          <div
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#7c3aed] flex items-center justify-center"
            style={{ boxShadow: "0 0 20px rgba(0, 217, 255, 0.5)" }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-[#e0f4ff] tracking-wider" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            DataGate
          </span>
        </motion.button>

        <motion.div className="hidden md:flex space-x-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => go(link.id)}
              className="transition-colors relative group"
              style={{ color: active === link.id ? "#00d9ff" : "#8ba7c7" }}
            >
              {link.label}
              <span
                className="absolute -bottom-1 left-0 h-0.5 bg-[#00d9ff] transition-all duration-300 group-hover:w-full"
                style={{ width: active === link.id ? "100%" : 0, boxShadow: "0 0 10px #00d9ff" }}
              />
            </button>
          ))}
        </motion.div>

        <motion.button
          onClick={() => go("archive")}
          className="px-6 py-2 rounded-lg backdrop-blur-sm hidden md:block flex-shrink-0"
          style={{
            backgroundColor: "rgba(0, 217, 255, 0.1)",
            border: "1px solid rgba(0, 217, 255, 1)",
            color: "#00d9ff",
            boxShadow: "0 0 20px rgba(0, 217, 255, 0.3)",
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05, backgroundColor: "rgba(0, 217, 255, 0.2)", boxShadow: "0 0 30px rgba(0, 217, 255, 0.6)" }}
        >
          Scan a file
        </motion.button>

        <button
          className="md:hidden text-[#00d9ff] p-1"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[#00d9ff]/20"
          >
            <div className="px-6 py-3 flex flex-col">
              {LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => go(link.id)}
                  className="py-3 text-left transition-colors"
                  style={{ color: active === link.id ? "#00d9ff" : "#8ba7c7" }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
