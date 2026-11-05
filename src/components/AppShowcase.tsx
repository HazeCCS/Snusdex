"use client";

import { motion } from "motion/react";
import { content } from "@/content/de";
import { Phone } from "@/components/Phone";
import { StickyStage } from "@/components/StickyStage";
import { Title } from "@/components/ui";

const ease = [0.22, 1, 0.36, 1] as const;

export function AppShowcase() {
  const { app } = content;

  return (
    <section id="app" className="relative border-t border-line">
      <StickyStage count={app.items.length} distance={75}>
        {(active) => (
          <div className="container-x grid h-full w-full grid-rows-[minmax(0,42svh)_minmax(0,1fr)] items-center gap-4 pb-6 pt-[76px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-1 lg:gap-16 lg:pb-0 lg:pt-0">
            <div className="relative flex h-full items-center justify-center lg:h-[min(78svh,740px)]">
              {app.items.map((item, index) => {
                const on = index === active;
                const offset = index < active ? -60 : 60;
                return (
                  <motion.div
                    key={item.key}
                    initial={false}
                    animate={{ opacity: on ? 1 : 0, x: on ? 0 : offset, scale: on ? 1 : 0.92, rotate: on ? 0 : offset / 12 }}
                    transition={{ duration: 0.8, ease }}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-hidden={!on}
                  >
                    <Phone name={item.image} alt={on ? item.alt : ""} priority={index === 0} />
                  </motion.div>
                );
              })}
            </div>

            <div className="grid">
              {app.items.map((item, index) => {
                const on = index === active;
                return (
                  <motion.div
                    key={item.key}
                    initial={false}
                    animate={{ opacity: on ? 1 : 0, y: on ? 0 : index < active ? -28 : 28 }}
                    transition={{ duration: 0.7, ease }}
                    className="col-start-1 row-start-1 self-center"
                    style={{ pointerEvents: on ? "auto" : "none" }}
                    aria-hidden={!on}
                  >
                    <span className="eyebrow">{item.eyebrow}</span>
                    <Title heading={item.title} className="text-[clamp(38px,4.8vw,72px)]" />
                    <p className="lead mt-5 sm:mt-7">{item.text}</p>
                    <ul className="mt-6 hidden gap-5 sm:grid lg:mt-9">
                      {item.points.map((point) => (
                        <li key={point.title} className="border-t border-line pt-4">
                          <span className="block text-[15px] font-semibold">{point.title}</span>
                          <span className="mt-1 block text-sm text-muted">{point.text}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </StickyStage>
    </section>
  );
}
