"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { content } from "@/content/de";
import { Reveal, StoreButton, Title } from "@/components/ui";

export function EndCta() {
  const { end } = content;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [50, -30]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1, 1]);

  return (
    <section className="relative overflow-hidden border-t border-line pt-[clamp(96px,12vw,170px)]">
      <div className="container-x text-center">
        <Reveal>
          <Title heading={end.title} className="mx-auto text-[clamp(48px,9vw,140px)] leading-[0.95]" />
          <p className="lead mx-auto">{end.text}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <StoreButton label={end.appStore} />
            <span className="btn btn-ghost cursor-default opacity-70" aria-disabled="true">
              {end.googlePlay}
              <span className="text-xs font-medium text-muted">{end.later}</span>
            </span>
          </div>
        </Reveal>
      </div>
      <div ref={ref} className="mx-auto mt-10 w-full max-w-[1800px] overflow-hidden">
        <motion.div style={{ y, scale }}>
          <Image
            src="/images/sammlung.webp"
            alt={end.imageAlt}
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
