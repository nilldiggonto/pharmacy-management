import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 caption-4 whitespace-nowrap font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-[#F5EFE6] text-[#44403C] border-[#E7DDD0]",
        crimson: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
        emerald: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]",
        cyan: "bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC]",
        amber: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
        rose: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
        violet: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
}

export function Badge({
  className,
  variant,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const dotColor =
    variant === "emerald"
      ? "bg-[#10B981]"
      : variant === "cyan"
        ? "bg-[#06B6D4]"
        : variant === "amber"
          ? "bg-[#D97706]"
          : variant === "rose" || variant === "crimson"
            ? "bg-[#B91C1C]"
            : variant === "violet"
              ? "bg-[#7C3AED]"
              : "bg-[#78716C]";

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "animate-beacon absolute inline-flex h-full w-full rounded-full opacity-75",
              dotColor
            )}
          />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor)} />
        </span>
      )}
      {children}
    </span>
  );
}
