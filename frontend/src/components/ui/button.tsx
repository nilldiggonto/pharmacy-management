"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#10b981] text-[#000000] border-[#10b981] hover:bg-[#34d399] hover:border-[#34d399]",
        secondary:
          "bg-[#272727] text-[#f5f5f4] border-[#313131] hover:bg-[#313131] hover:border-[#44403c]",
        ghost:
          "bg-transparent text-[#a8a29e] border-transparent hover:bg-[#1f1f1f] hover:text-[#f5f5f4]",
        outline:
          "bg-[#181818] text-[#f5f5f4] border-[#313131] hover:bg-[#272727]",
        danger:
          "bg-[#f43f5e]/15 text-[#fb7185] border-[#f43f5e]/40 hover:bg-[#f43f5e]/25",
      },
      size: {
        md: "px-3 py-2 button-sm",
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

