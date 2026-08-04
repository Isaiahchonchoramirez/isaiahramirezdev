import { motion } from "motion/react";

export function PortalRings() {
  return (
    <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${60 + i * 50}px`,
            height: `${60 + i * 50}px`,
            border: "2px solid",
            borderColor: i % 2 === 0 ? "#00d9ff" : "#7c3aed",
            boxShadow: `0 0 ${15 + i * 5}px ${i % 2 === 0 ? "#00d9ff" : "#7c3aed"}`,
          }}
          animate={{
            rotate: i % 2 === 0 ? 360 : -360,
            scale: [1, 1.08, 1],
          }}
          transition={{
            rotate: {
              duration: 25 - i * 3,
              repeat: Infinity,
              ease: "linear",
            },
            scale: {
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        />
      ))}
      <motion.div
        className="absolute w-20 h-20 rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          backgroundImage: "linear-gradient(to bottom right, #00d9ff, #7c3aed)",
          boxShadow: "0 0 60px rgba(0, 217, 255, 0.8), 0 0 80px rgba(124, 58, 237, 0.6)",
        }}
      />
    </div>
  );
}
