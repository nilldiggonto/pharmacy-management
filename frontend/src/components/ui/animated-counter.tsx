"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "motion/react";
import { WEIGHTED_EASE } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  format?: (val: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  format = (v) => Math.round(v).toLocaleString("en-US"),
  className,
}: AnimatedCounterProps) {
  const motionVal = useMotionValue(value);
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.65,
      ease: WEIGHTED_EASE,
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
  }, [value, format, motionVal]);

  return <span className={className}>{display}</span>;
}

