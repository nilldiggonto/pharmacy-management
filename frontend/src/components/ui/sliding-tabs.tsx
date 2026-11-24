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
        "inline-flex items-center gap-1 rounded-xl border border-[#272727] bg-[#181818] p-1",
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
              "relative flex items-center gap-2 rounded-lg px-3 py-1.5 button-xsm transition-colors duration-300 cursor-pointer",
              active ? "text-[#f5f5f4]" : "text-[#a8a29e] hover:text-[#f5f5f4]"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ duration: 0.45, ease: WEIGHTED_EASE }}
                className="absolute inset-0 rounded-lg border border-[#313131] bg-[#272727]"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "relative z-10 rounded-full px-1.5 py-0.5 font-mono caption-5",
                  active ? "bg-[#181818] text-[#10b981]" : "bg-[#1f1f1f] text-[#78716c]"
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

