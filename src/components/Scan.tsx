"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { content } from "@/content/de";
import { Reveal, Title } from "@/components/ui";

export function Scan() {
  const { scan } = content;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [1.1, 1, 1]);
  const x = useTransform(scrollYProgress, [0, 1], [50, -30]);

  return (
    <section id="scan" className="relative overflow-hidden border-t border-line pt-[clamp(96px,12vw,180px)]">
      <div className="container-x text-center">
        <Reveal>
          <span className="eyebrow">{scan.eyebrow}</span>
          <Title heading={scan.title} className="mx-auto max-w-[14ch]" />
          <p className="lead mx-auto">{scan.text}</p>
        </Reveal>
      </div>
      <div ref={ref} className="relative mx-auto mt-6 w-full max-w-[1800px] overflow-hidden">
        <motion.div style={{ scale, x }} className="origin-center">
          <Image
            src="/images/scan.webp"
            alt={scan.imageAlt}
            width={2000}
            height={1333}
            sizes="100vw"
            className="fade-edges h-auto w-full select-none"
          />
        </motion.div>
      </div>
    </section>
  );
}
