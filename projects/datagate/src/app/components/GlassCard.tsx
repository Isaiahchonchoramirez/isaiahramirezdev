import { ReactNode } from "react";
import { motion } from "motion/react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = "", hover = true }: GlassCardProps) {
  return (
    <motion.div
      className={`relative backdrop-blur-xl bg-[#0a1929]/40 rounded-2xl p-6 ${className}`}
      style={{
        border: "1px solid rgba(0, 217, 255, 0.2)",
        borderColor: "rgba(0, 217, 255, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 217, 255, 0.1)",
      }}
      whileHover={hover ? {
        scale: 1.02,
        borderColor: "rgba(0, 217, 255, 0.4)",
        boxShadow: "0 12px 40px rgba(0, 217, 255, 0.2), inset 0 1px 0 rgba(0, 217, 255, 0.2)"
      } : {}}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
