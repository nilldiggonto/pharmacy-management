import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 caption-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-[#272727] text-[#d6d3d1] border-[#313131]",
        emerald: "bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30",
        cyan: "bg-[#06b6d4]/15 text-[#22d3ee] border-[#06b6d4]/30",
        amber: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30",
        rose: "bg-[#f43f5e]/15 text-[#fb7185] border-[#f43f5e]/30",
        violet: "bg-[#8b5cf6]/15 text-[#a78bfa] border-[#8b5cf6]/30",
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
      ? "bg-[#10b981]"
      : variant === "cyan"
        ? "bg-[#06b6d4]"
        : variant === "amber"
          ? "bg-[#f59e0b]"
          : variant === "rose"
            ? "bg-[#f43f5e]"
            : variant === "violet"
              ? "bg-[#8b5cf6]"
              : "bg-[#a8a29e]";

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

