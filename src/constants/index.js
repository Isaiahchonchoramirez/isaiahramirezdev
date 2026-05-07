import { getAssetPath } from "../utils/assetPath";

const navLinks = [
  {
    name: "Projects",
    link: "#work",
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

const techStackIcons = [
  {
    name: "React Developer",
    modelPath: getAssetPath("/models/react_logo-transformed.glb"),
    scale: 1,
    rotation: [0, 0, 0],
  },
  {
    name: "Python Developer",
    modelPath: getAssetPath("/models/python-transformed.glb"),
    scale: 0.8,
    rotation: [0, 0, 0],
  },
  {
    name: "Backend Developer",
    modelPath: getAssetPath("/models/node-transformed.glb"),
    scale: 5,
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    name: "Interactive Developer",
    modelPath: getAssetPath("/models/three.js-transformed.glb"),
    scale: 0.05,
    rotation: [0, 0, 0],
  },
  {
    name: "Project Manager",
    modelPath: getAssetPath("/models/git-svg-transformed.glb"),
    scale: 0.05,
    rotation: [0, -Math.PI / 4, 0],
  },
];

const expCards = [
  {
    review: "Isaiah blends technical expertise with a strong creative vision. His commitment to crafting fast, accessible, and visually rich web applications makes him a standout in any project he tackles.",
    // imgPath: getAssetPath("/images/exp1.png"),
    // logoPath: getAssetPath("/images/logo1.png"),
    title: "Frontend Developer & 3D Web Designer",
    date: "September 2023 – Present",
    responsibilities: [
      "Designed and built interactive, user-centric web experiences using React, Three.js, and Tailwind CSS.",
      "Led UI/UX initiatives to improve usability, performance, and mobile responsiveness.",
      "Integrated advanced animation libraries like GSAP to enhance visual storytelling and engagement.",
    ],
  },
  {
    review: "Isaiah brings full-stack thinking to every project, bridging the gap between design, functionality, and scalability. His passion for elegant code and strong user experiences drives results.",
    // imgPath: getAssetPath("/images/exp2.png"),
    // logoPath: getAssetPath("/images/logo2.png"),
    title: "Full Stack Developer & UI/UX Enthusiast",
    date: "June 2022 – August 2023",
    responsibilities: [
      "Developed personal and client web applications with full-stack technologies including React, Node.js, and Express.",
      "Collaborated with designers and researchers to create inclusive, accessible web apps.",
      "Implemented RESTful APIs and improved backend functionality to support real-time features and optimized performance.",
    ],
  },
  {
    review: "Isaiah's early mobile development work set a strong foundation for his focus on cross-platform experiences. His attention to responsive design ensures every user feels first-class.",
    // imgPath: getAssetPath("/images/exp3.png"),
    // logoPath: getAssetPath("/images/logo3.png"),
    title: "Junior Developer & Mobile Web Specialist",
    date: "January 2021 – May 2022",
    responsibilities: [
      "Built mobile-first web applications focused on accessibility, speed, and clean UI principles.",
      "Learned and applied key concepts in React Native, responsive design, and cross-device compatibility.",
      "Worked on personal projects to refine front-end and mobile interface skills before advancing into 3D web development.",
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

const testimonials = [
  {
    name: "Mentor",
    mentions: "@SusanDentel",
    review:
      "Isaiah has a natural drive for learning and leadership. His creativity, technical growth, and ability to tackle new challenges with a positive mindset have always impressed me. I'm excited to see where his skills will take him.",
    // imgPath: getAssetPath("/images/client1.png"),
  },
  {
    name: "Mentor",
    mentions: "@JingSwanson",
    review:
      "Isaiah brings a strong work ethic and curiosity to every coding project. His willingness to dive deep into Java concepts and ask insightful questions shows true potential for excellence in software development.",
    // imgPath: getAssetPath("/images/client3.png"),
  },
  {
    name: "Teacher",
    mentions: "@Khaled",
    review:
      "Isaiah stood out in my databases and algorithms classes for his determination and growth mindset. He approached complex problems with persistence and creativity, making consistent strides in his technical skills.",
    // imgPath: getAssetPath("/images/client2.png"),
  },
  {
    name: "Co-worker",
    mentions: "@TrevorFisher",
    review:
      "During a tough time like COVID, Isaiah was dependable and hardworking. He stepped up to help our family business with deliveries and logistics, always showing up with a positive attitude and strong work ethic.",
    // imgPath: getAssetPath("/images/client5.png"),
  },
  {
    name: "Co-worker",
    mentions: "@AnthonyMcgriff",
    review:
      "Working with Isaiah on landscaping projects was great — he's reliable, detail-oriented, and willing to put in the hard work. He always found ways to get the job done efficiently while keeping a good attitude.",
    // imgPath: getAssetPath("/images/client4.png"),
  },
  {
    name: "Co-worker",
    mentions: "@JeraldRobinson",
    review:
      "Isaiah was a key part of our kitchen and prep team at the arena and racetrack. He worked quickly under pressure, stayed organized, and could be counted on to help the team during busy events.",
    // imgPath: getAssetPath("/images/client6.png"),
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
  navLinks,
};