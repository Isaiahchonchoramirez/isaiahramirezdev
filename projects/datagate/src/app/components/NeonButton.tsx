import { motion } from "motion/react";
import { ReactNode } from "react";

interface NeonButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function NeonButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  size = "md"
}: NeonButtonProps) {
  const colors = {
    primary: {
      bg: "rgba(0, 217, 255, 0.1)",
      border: "rgba(0, 217, 255, 1)",
      text: "#00d9ff",
      shadow: "0 0 20px rgba(0, 217, 255, 0.5)",
    },
    secondary: {
      bg: "rgba(124, 58, 237, 0.1)",
      border: "rgba(124, 58, 237, 1)",
      text: "#7c3aed",
      shadow: "0 0 20px rgba(124, 58, 237, 0.5)",
    }
  };

  const sizes = {
    sm: "px-4 py-2",
    md: "px-8 py-3",
    lg: "px-10 py-4"
  };

  const style = colors[variant];

  return (
    <motion.button
      onClick={onClick}
      className={`${sizes[size]} rounded-lg backdrop-blur-sm ${className}`}
      style={{
        backgroundColor: style.bg,
        border: `2px solid ${style.border}`,
        color: style.text,
        boxShadow: style.shadow,
      }}
      whileHover={{
        scale: 1.05,
        boxShadow: variant === "primary"
          ? "0 0 30px rgba(0, 217, 255, 0.8)"
          : "0 0 30px rgba(124, 58, 237, 0.8)"
      }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}
