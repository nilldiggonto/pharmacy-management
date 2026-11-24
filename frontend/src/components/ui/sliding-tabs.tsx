"use client";

import { motion } from "motion/react";
import { cn, WEIGHTED_EASE } from "@/lib/utils";

export interface TabOption {
  id: string;
  label: string;
  count?: number;
}

interface SlidingTabsProps {
  options: TabOption[];
  value: string;
  onChange: (id: string) => void;
  layoutId: string;
  className?: string;
}

export function SlidingTabs({
  options,
  value,
  onChange,
  layoutId,
  className,
}: SlidingTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#E7DDD0] bg-[#F5EFE6] p-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3 py-1.5 button-xsm transition-colors duration-200 cursor-pointer",
              active ? "text-[#991B1B]" : "text-[#57534E] hover:text-[#1C1917]"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ duration: 0.35, ease: WEIGHTED_EASE }}
                className="absolute inset-0 rounded-lg border border-[#FECACA] bg-[#FFFDF9] shadow-xs"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "relative z-10 rounded-full px-1.5 py-0.5 font-mono caption-5",
                  active ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[#EAE2D6] text-[#57534E]"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
