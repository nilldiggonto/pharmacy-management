"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#B91C1C] text-[#FFFDF9] border-[#B91C1C] hover:bg-[#991B1B] hover:border-[#991B1B] shadow-xs",
        secondary:
          "bg-[#F5EFE6] text-[#1C1917] border-[#E2D6C5] hover:bg-[#EDE3D4] hover:border-[#D4C3AC]",
        ghost:
          "bg-transparent text-[#57534E] border-transparent hover:bg-[#F5EFE6] hover:text-[#1C1917]",
        outline:
          "bg-[#FFFDF9] text-[#1C1917] border-[#DDD2C2] hover:bg-[#FAF6F0] hover:border-[#B91C1C]/40",
        danger:
          "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] hover:bg-[#FEE2E2]",
      },
      size: {
        md: "px-3.5 py-2 button-sm",
        sm: "px-3 py-1.5 button-xsm",
        lg: "px-4 py-2.5 button-md",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
