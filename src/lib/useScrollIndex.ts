"use client";

import { useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

export function useScrollIndex(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [index, setIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(count - 1, Math.max(0, Math.floor(value * count)));
    setIndex((current) => (current === next ? current : next));
  });

  return { ref, index, progress: scrollYProgress };
}
