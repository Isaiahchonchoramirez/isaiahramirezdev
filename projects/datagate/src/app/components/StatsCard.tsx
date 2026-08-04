import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  color?: "blue" | "purple" | "pink" | "green";
}

export function StatsCard({ icon: Icon, label, value, change, color = "blue" }: StatsCardProps) {
  const colors = {
    blue: { icon: "text-[#00d9ff]", bg: "bg-[#00d9ff]/10", border: "border-[#00d9ff]/30" },
    purple: { icon: "text-[#7c3aed]", bg: "bg-[#7c3aed]/10", border: "border-[#7c3aed]/30" },
    pink: { icon: "text-[#ec4899]", bg: "bg-[#ec4899]/10", border: "border-[#ec4899]/30" },
    green: { icon: "text-[#10b981]", bg: "bg-[#10b981]/10", border: "border-[#10b981]/30" },
  };

  const style = colors[color];

  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[#8ba7c7]">{label}</p>
          <motion.h2
            className="text-[#e0f4ff]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {value}
          </motion.h2>
          {change && (
            <p className="text-[#10b981]">{change}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${style.bg} border ${style.border}`}>
          <Icon className={`w-6 h-6 ${style.icon}`} />
        </div>
      </div>
    </GlassCard>
  );
}
