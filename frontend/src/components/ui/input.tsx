import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-3 py-2 body-6 text-[#1C1917] placeholder:text-[#8C8275] transition-[border-color,box-shadow] duration-200 hover:border-[#C7B8A3] focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
