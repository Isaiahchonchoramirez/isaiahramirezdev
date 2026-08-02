import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";

import TitleHeader from "../components/TitleHeader";
import { getAssetPath } from "../utils/assetPath";
import useReveal from "../hooks/useReveal";

const Contact = () => {
  const scopeRef = useReveal({ selector: ".contact-reveal", stagger: 120, variant: "alternate" });
  const formRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Show loading state

    try {
      await emailjs.sendForm(
        import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
        formRef.current,
        import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY
      );

      // Reset form and stop loading
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("EmailJS Error:", error); // Optional: show toast
    } finally {
      setLoading(false); // Always stop loading, even on error
    }
  };

  return (
    <section id="contact" ref={scopeRef} className="flex-center section-padding">
      <div className="w-full h-full md:px-10 px-5">
        <TitleHeader
          title="Get in Touch – Let's Connect"
          sub="💬 Have questions or ideas? Let's talk! 🚀"
        />
        <div className="grid-12-cols mt-16">
          <div className="contact-reveal xl:col-span-5">
            <div className="flex-center card-border rounded-xl p-10">
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="w-full flex flex-col gap-7"
              >
                <div>
                  <label htmlFor="name">Your name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="What's your name?"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email">Your Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="What's your email address?"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message">Your Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can I help you?"
                    rows="5"
                    required
                  />
                </div>

                <button type="submit">
                  <div className="cta-button group">
                    <div className="bg-circle" />
                    <p className="text">
                      {loading ? "Sending..." : "Send Message"}
                    </p>
                    <div className="arrow-wrapper arrow-wrapper--nav">
                      <img src={getAssetPath("/images/arrow-right.svg")} alt="" />
                    </div>
                  </div>
                </button>
              </form>
            </div>
          </div>
          {/* A glass panel rather than a second WebGL scene: the computer GLB
              cost ~500 KB and an orange box that fought the ocean palette. */}
          <div className="contact-reveal xl:col-span-7 min-h-96">
            <div className="contact-panel h-full w-full rounded-3xl p-8 md:p-10">
              <p className="text-white-50 text-lg leading-relaxed">
                I'm a University of Michigan information analysis student building AI tools,
                data applications and interactive web experiences. I'm looking for internships
                and freelance work in data, full-stack development and UX.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                {[
                  { label: "Email", value: "Isaiahramirez37@gmail.com", href: "mailto:Isaiahramirez37@gmail.com" },
                  { label: "GitHub", value: "@Isaiahchonchoramirez", href: "https://github.com/Isaiahchonchoramirez" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="contact-link group flex items-center justify-between gap-4 rounded-xl px-5 py-4"
                  >
                    <span>
                      <span className="block text-xs uppercase tracking-[0.14em] text-white-50">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-white">{item.value}</span>
                    </span>
                    <span className="text-white-50 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                ))}
              </div>

              <p className="text-white-50 mt-8 text-sm">
                Usually replies within a day.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
