"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { content } from "@/content/de";
import { StickyStage } from "@/components/StickyStage";
import { Title } from "@/components/ui";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reviews() {
  const { reviews } = content;

  return (
    <section id="bewertungen" className="relative border-t border-line">
      <StickyStage count={reviews.items.length} distance={60}>
        {(active) => {
          const current = reviews.items[active];
          return (
            <div className="container-x grid h-full w-full grid-rows-[minmax(0,44svh)_minmax(0,1fr)] items-center gap-2 pb-6 pt-[72px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:grid-rows-1 lg:gap-10 lg:pb-0 lg:pt-0">
              <div className="order-2 lg:order-1">
                <span className="eyebrow">{reviews.eyebrow}</span>
                <Title heading={reviews.title} className="text-[clamp(30px,3.6vw,54px)]" />
                <p className="lead mt-4 hidden max-w-[40ch] text-[clamp(15px,1.2vw,18px)] lg:block">{reviews.text}</p>

                <div className="relative mt-6 h-[clamp(72px,13vw,210px)] overflow-hidden lg:mt-10">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.p
                      key={current.key}
                      initial={{ y: "70%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "-70%", opacity: 0 }}
                      transition={{ duration: 0.6, ease }}
                      className="absolute inset-x-0 top-0 text-[clamp(64px,12vw,196px)] font-bold leading-none tracking-[-0.06em]"
                    >
                      {current.name}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <ol className="mt-4 grid max-w-[520px] grid-cols-6 gap-2 lg:mt-8" aria-label={reviews.eyebrow}>
                  {reviews.items.map((item, index) => (
                    <li key={item.key} className="h-[3px] overflow-hidden rounded-full bg-white/15">
                      <motion.span
                        initial={false}
                        animate={{ scaleX: index <= active ? 1 : 0 }}
                        transition={{ duration: 0.5, ease }}
                        className="block h-full origin-left rounded-full"
                        style={{ background: item.tint }}
                      />
                    </li>
                  ))}
                </ol>

                <div className="mt-8 hidden lg:block">
                  <h3 className="text-sm font-semibold">{reviews.picksTitle}</h3>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{reviews.picksText}</p>
                </div>
              </div>

              <div className="relative order-1 h-full lg:order-2" style={{ containerType: "size" }}>
                {reviews.items.map((item, index) => {
                  const on = index === active;
                  return (
                    <motion.div
                      key={item.key}
                      initial={false}
                      animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.92, y: on ? 0 : 30 }}
                      transition={{ duration: 0.7, ease }}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden={!on}
                    >
                      <Image
                        src={`/images/review-${item.key}.webp`}
                        alt={on ? item.alt : ""}
                        width={900}
                        height={900}
                        sizes="(min-width: 1024px) 600px, 46svh"
                        className="fade-radial select-none"
                        style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        }}
      </StickyStage>
    </section>
  );
}
