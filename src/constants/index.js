import { getAssetPath } from "../utils/assetPath";

const navLinks = [
  {
    name: "Projects",
    link: "#featured-work",
  },
  {
    name: "Experience",
    link: "#experience",
  },
  {
    name: "Skills",
    link: "#skills",
  },
  {
    name: "About",
    link: "#testimonials",
  },
];

const words = [
  { text: "Ideas", imgPath: getAssetPath("/images/ideas.svg") },
  { text: "Concepts", imgPath: getAssetPath("/images/concepts.svg") },
  { text: "Designs", imgPath: getAssetPath("/images/designs.svg") },
  { text: "Code", imgPath: getAssetPath("/images/code.svg") },
];

const counterItems = [
  { value: 30, suffix: "+", label: "Projects Built" },
  { value: 6, suffix: "+", label: "Technologies Learned" },
  { value: 70, suffix: "+", label: "Certifications Earned" },
  { value: 100, suffix: "%", label: "Commitment to Learning" },
];

const logoIconsList = [
  {
    imgPath: getAssetPath("/images/logos/company-logo-1.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-2.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-3.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-4.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-5.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-6.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-7.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-8.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-9.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-10.png"),
  },
  {
    imgPath: getAssetPath("/images/logos/company-logo-11.png"),
  },
];

const abilities = [
  {
    imgPath: getAssetPath("/images/seo.png"),
    title: "Quality Focus",
    desc: "Delivering high-quality results while maintaining attention to every detail.",
  },
  {
    imgPath: getAssetPath("/images/chat.png"),
    title: "Reliable Communication",
    desc: "Keeping you updated at every step to ensure transparency and clarity.",
  },
  {
    imgPath: getAssetPath("/images/time.png"),
    title: "On-Time Delivery",
    desc: "Making sure projects are completed on schedule, with quality & attention to detail.",
  },
];

const techStackImgs = [
  {
    name: "React Developer",
    imgPath: getAssetPath("/images/logos/react.png"),
  },
  {
    name: "Python Developer",
    imgPath: getAssetPath("/images/logos/python.svg"),
  },
  {
    name: "Backend Developer",
    imgPath: getAssetPath("/images/logos/node.png"),
  },
  {
    name: "Interactive Developer",
    imgPath: getAssetPath("/images/logos/three.png"),
  },
  {
    name: "Project Manager",
    imgPath: getAssetPath("/images/logos/git.svg"),
  },
];

// Each card shows an SVG mark until its 3D model is scrolled into view, then
// swaps to the interactive one. `mark` is the placeholder; `modelPath` is what
// gets loaded lazily.
const techStackIcons = [
  {
    name: "React Developer",
    label: "React & Frontend",
    blurb: "Interactive, accessible interfaces",
    mark: "react",
    modelPath: getAssetPath("/models/react_logo-transformed.glb"),
    scale: 1,
    rotation: [0, 0, 0],
  },
  {
    name: "Python Developer",
    label: "Python, pandas & SQL",
    blurb: "Analysis, modelling and querying data",
    mark: "python",
    modelPath: getAssetPath("/models/python-transformed.glb"),
    scale: 0.8,
    rotation: [0, 0, 0],
  },
  {
    name: "Backend Developer",
    label: "APIs & Backends",
    blurb: "FastAPI, Node, REST design, deployment",
    mark: "node",
    modelPath: getAssetPath("/models/node-transformed.glb"),
    scale: 5,
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    name: "Interactive Developer",
    label: "Three.js & WebGL",
    blurb: "Real-time 3D in the browser",
    mark: "data",
    modelPath: getAssetPath("/models/three.js-transformed.glb"),
    scale: 0.05,
    rotation: [0, 0, 0],
  },
  {
    name: "Project Manager",
    label: "Git & Collaboration",
    blurb: "Version control, review, shipping together",
    mark: "git",
    modelPath: getAssetPath("/models/git-svg-transformed.glb"),
    scale: 0.05,
    rotation: [0, -Math.PI / 4, 0],
  },
];

// Straight from the résumé. The employer line matters: these are freelance
// engagements, and the site previously showed bare job titles under a
// "Professional Work Experience" heading, which read as company employment.
const expCards = [
  {
    title: "Big Data Visualization",
    org: "Freelance / Projects",
    location: "Remote",
    date: "August 2025 — Present",
    responsibilities: [
      "Analysed agricultural yield data to identify performance outliers and patterns using z-scores.",
      "Built interactive visualisation dashboards backed by data normalisation and outlier detection.",
    ],
  },
  {
    title: "Frontend Developer & 3D Web Designer",
    org: "Freelance / Projects",
    location: "Saline, MI",
    date: "September 2022 — Present",
    responsibilities: [
      "Designed and built interactive, user-centric web experiences using React, Three.js and Tailwind CSS.",
      "Led UI/UX initiatives to improve usability, performance and mobile responsiveness.",
      "Integrated animation libraries like GSAP to create visually engaging, dynamic experiences.",
      "Collaborated on design systems emphasising accessibility, scalability and cross-platform consistency.",
    ],
  },
  {
    title: "Full Stack Developer & UI/UX Enthusiast",
    org: "Freelance / Projects",
    location: "Remote",
    date: "June 2022 — August 2023",
    responsibilities: [
      "Developed personal and client web applications using React, Node.js and Express.",
      "Created inclusive, accessible designs through close collaboration with researchers and users.",
      "Implemented RESTful APIs, enhancing backend functionality and real-time performance.",
      "Applied responsive design principles for seamless cross-device experiences.",
    ],
  },
  {
    title: "Junior Developer & Mobile Web Specialist",
    org: "Freelance / Projects",
    location: "Remote",
    date: "June 2021 — April 2022",
    responsibilities: [
      "Built mobile-first web applications prioritising accessibility, speed and clean UI.",
      "Experimented with React Native and responsive layouts for cross-device compatibility.",
      "Refined front-end and mobile skills, laying the groundwork for 3D web design.",
    ],
  },
];

const education = [
  {
    school: "University of Michigan — School of Information",
    location: "Ann Arbor, MI",
    degree: "B.S. Information — Big Data",
    date: "Junior · Expected May 2027",
    courses: [
      "Data Mining",
      "Applied Machine Learning",
      "Qualitative Methods & Research",
      "Data Exploration",
      "Data Manipulation",
      "Models of Social Information Processing",
    ],
  },
  {
    school: "Washtenaw Community College",
    location: "Ann Arbor, MI",
    degree: "A.S. Web Design and Development",
    date: "December 2024",
    courses: [
      "C++",
      "Python",
      "Data Structures & Algorithms",
      "3D Modeling & Production Pipeline",
      "Web User Experience",
      "Interface Design",
      "Database Principles & Applications",
    ],
  },
];

const leadership = [
  {
    role: "STEM Leader",
    org: "Washtenaw Community College",
    date: "December 2023 — Present",
    points: [
      "Recruit and engage prospective STEM students through outreach events and campus activities.",
      "Support diversity, equity and inclusion initiatives through STEAM events for underrepresented students.",
      "Mentor students across science, technology, engineering and maths, providing career guidance.",
    ],
  },
];

const expLogos = [
  {
    name: "logo1",
    imgPath: getAssetPath("/images/logo1.png"),
  },
  {
    name: "logo2",
    imgPath: getAssetPath("/images/logo2.png"),
  },
  {
    name: "logo3",
    imgPath: getAssetPath("/images/logo3.png"),
  },
];

// Design work — all made in Photoshop, with supporting Adobe tools and
// AI-generated vectors redrawn by hand. Descriptions cover the craft and what
// is visibly in each piece; none of them claim a client engagement.
const designWork = [
  {
    id: "xbox",
    title: "Xbox Storefront",
    format: "Landing page design",
    year: "2024",
    image: getAssetPath("/images/Xbox_website.webp"),
    tools: ["Photoshop", "Type & layout", "Merchandising grid"],
    summary:
      "A full storefront comp built around a Black Friday campaign — a leaderboard hero that turns friend rankings into the headline act, then a dense merchandising grid beneath it.",
    detail:
      "The hard part was rhythm: fourteen game tiles at four different aspect ratios that still had to scan as one page. I set a strict green-and-black promo system so every discount badge reads the same way, then let the key art carry the variety. Composited entirely in Photoshop.",
  },
  {
    id: "hemingway",
    title: "Cuervo y Sobrinos",
    format: "Print advertisement",
    year: "2024",
    image: getAssetPath("/images/ad_watch_hemingway.webp"),
    tools: ["Photoshop", "AI-assisted vector", "Hand redraw"],
    summary:
      "A luxury watch ad for the Havana house, built as a layered composite where the watch face becomes the whole visual field.",
    detail:
      "Generated vector ornament with AI, then redrew and recut it by hand so the flourishes actually followed the dial's curve instead of sitting on top of it. Wireframe mesh, engraved silhouette and Roman numerals sit on separate layers so the eye falls to the tagline last — “Ecos del pasado, creados para el presente.”",
  },
  {
    id: "lafayette",
    title: "Lafayette Coney Island",
    format: "Website design",
    year: "2024",
    image: getAssetPath("/images/lafayette_coney.webp"),
    tools: ["Photoshop", "Compositing", "Layout"],
    summary:
      "A site design for the Detroit landmark, warm enough to feel like the room and structured enough to order from.",
    detail:
      "Detroit's skyline at night sits behind a cut-out of the storefront, so the page reads as the city before it reads as a menu. Delivery partners get their own band at the foot rather than a floating badge, which keeps the ordering path obvious without hijacking the hero.",
  },
  {
    id: "rockport",
    title: "Fly Fish Rockport",
    format: "Website design",
    year: "2024",
    image: getAssetPath("/images/rockport_flyfishing.webp"),
    tools: ["Photoshop", "UI layout", "Design system"],
    summary:
      "A charter booking site where the search panel is the hero — trip filters sit directly over the water instead of below the fold.",
    detail:
      "Boat type, location and crew are the three decisions a customer actually makes, so they lead. Vessel cards, article cards and the amenities checklist all share one spacing scale and a single red accent, which keeps a page full of photography from turning into noise.",
  },
  {
    id: "teapigs",
    title: "Tea Pigs",
    format: "Website design",
    year: "2024",
    image: getAssetPath("/images/teapigs.webp"),
    tools: ["Photoshop", "Colour & type", "Layout"],
    summary:
      "A softer commerce layout — product photography carried on a pale palette with generous air around every element.",
    detail:
      "A deliberate counterweight to the Xbox piece: where that page is dense and loud, this one is quiet, and both had to work. Same underlying grid discipline, opposite temperature.",
  },
  {
    id: "windpower",
    title: "SouthCentral Power",
    format: "Banner ad pair",
    year: "2024",
    image: getAssetPath("/images/ad_windpower.png"),
    imageAlt: getAssetPath("/images/ad_windpower01.png"),
    // Fixed-size ad units. Upscaling a 300x250 to full bleed just makes it
    // blurry, so these render at native size the way they would run on a page.
    display: "native",
    tools: ["Photoshop", "IAB ad units"],
    summary:
      "One campaign cut to two standard IAB units — a 300×250 medium rectangle and a 728×90 leaderboard.",
    detail:
      "The real constraint is that a leaderboard is eight times wider than it is tall. The turbines, the headline and the call to action all had to re-stack for each format without the campaign looking like two different ads.",
  },
  {
    id: "first-gif",
    title: "First Animation",
    format: "Motion study",
    year: "2023",
    image: getAssetPath("/images/first_gif.webp"),
    tools: ["Photoshop", "Frame animation"],
    summary:
      "The first thing I ever animated, kept here on purpose.",
    detail:
      "Frame-by-frame in Photoshop's timeline before I knew what easing was. It is here because the gap between this and the Hemingway piece is the actual portfolio.",
  },
];

const testimonials = [
  {
    name: "Susan Dentel",
    relation: "Mentor",
    review:
      "Isaiah has a natural drive for learning and leadership. His creativity, technical growth, and ability to tackle new challenges with a positive mindset have always impressed me. I'm excited to see where his skills will take him.",
  },
  {
    name: "Jing Swanson",
    relation: "Mentor",
    review:
      "Isaiah brings a strong work ethic and curiosity to every coding project. His willingness to dive deep into Java concepts and ask insightful questions shows true potential for excellence in software development.",
  },
  {
    name: "Khaled",
    relation: "Teacher",
    review:
      "Isaiah stood out in my databases and algorithms classes for his determination and growth mindset. He approached complex problems with persistence and creativity, making consistent strides in his technical skills.",
  },
  {
    name: "Trevor Fisher",
    relation: "Co-worker",
    review:
      "During a tough time like COVID, Isaiah was dependable and hardworking. He stepped up to help our family business with deliveries and logistics, always showing up with a positive attitude and strong work ethic.",
  },
  {
    name: "Anthony Mcgriff",
    relation: "Co-worker",
    review:
      "Working with Isaiah on landscaping projects was great — he's reliable, detail-oriented, and willing to put in the hard work. He always found ways to get the job done efficiently while keeping a good attitude.",
  },
  {
    name: "Jerald Robinson",
    relation: "Co-worker",
    review:
      "Isaiah was a key part of our kitchen and prep team at the arena and racetrack. He worked quickly under pressure, stayed organized, and could be counted on to help the team during busy events.",
  },
];

const socialImgs = [
  {
    name: "insta",
    imgPath: getAssetPath("/images/insta.png"),
  },
  {
    name: "fb",
    imgPath: getAssetPath("/images/fb.png"),
  },
  {
    name: "x",
    imgPath: getAssetPath("/images/x.png"),
  },
  {
    name: "linkedin",
    imgPath: getAssetPath("/images/linkedin.png"),
  },
];

export {
  words,
  abilities,
  logoIconsList,
  counterItems,
  expCards,
  expLogos,
  testimonials,
  socialImgs,
  techStackIcons,
  techStackImgs,
  designWork,
  education,
  leadership,
  navLinks,
};
