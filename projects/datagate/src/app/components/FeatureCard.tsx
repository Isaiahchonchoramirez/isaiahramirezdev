import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "blue" | "purple" | "pink";
}

export function FeatureCard({ icon: Icon, title, description, accent = "blue" }: FeatureCardProps) {
  const accentColors = {
    blue: {
      bg: "bg-[#00d9ff]/10",
      border: "border-[#00d9ff]/30",
      icon: "text-[#00d9ff]",
    },
    purple: {
      bg: "bg-[#7c3aed]/10",
      border: "border-[#7c3aed]/30",
      icon: "text-[#7c3aed]",
    },
    pink: {
      bg: "bg-[#ec4899]/10",
      border: "border-[#ec4899]/30",
      icon: "text-[#ec4899]",
    }
  };

  const colors = accentColors[accent];

  return (
    <GlassCard className="text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
          <Icon className={`w-8 h-8 ${colors.icon}`} />
        </div>
        <h3 className="text-[#e0f4ff]">{title}</h3>
        <p className="text-[#8ba7c7]">{description}</p>
      </div>
    </GlassCard>
  );
}
