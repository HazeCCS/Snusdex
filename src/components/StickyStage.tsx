"use client";

import type { ReactNode } from "react";
import { useScrollIndex } from "@/lib/useScrollIndex";

export function StickyStage({
  count,
  distance = 70,
  children,
}: {
  count: number;
  distance?: number;
  children: (index: number) => ReactNode;
}) {
  const { ref, index } = useScrollIndex(count);

  return (
    <div ref={ref} style={{ height: `calc(100svh + ${count * distance}svh)` }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">{children(index)}</div>
    </div>
  );
}
