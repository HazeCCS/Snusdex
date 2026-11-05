"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { content } from "@/content/de";
import { StickyStage } from "@/components/StickyStage";
import { Reveal, Title } from "@/components/ui";

const unlockable = content.dex.tiles.filter((tile) => tile !== null).length;

export function Dex() {
  const { dex } = content;
  let order = -1;

  return (
    <section id="dex" className="relative border-t border-line">
      <StickyStage count={unlockable + 1} distance={34}>
        {(unlocked) => {
          order = -1;
          return (
            <div className="container-x grid h-full w-full grid-rows-[auto_minmax(0,1fr)] items-center gap-6 pb-8 pt-[76px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-1 lg:gap-20 lg:pb-0 lg:pt-0">
              <div>
                <span className="eyebrow">{dex.eyebrow}</span>
                <Title heading={dex.title} />
                <p className="lead mt-4 text-[clamp(15px,1.5vw,21px)] sm:mt-6">{dex.text}</p>
              </div>

              <div className="mx-auto w-full max-w-[min(100%,560px)] self-center">
                <ul className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
                  {dex.tiles.map((tile, index) => {
                    const number = `#${String(index + 1).padStart(3, "0")}`;
                    if (tile === null) {
                      return (
                        <li
                          key={number}
                          className="relative aspect-square rounded-[22%] border border-line bg-surface"
                        >
                          <span className="absolute left-[12%] top-[10%] text-[10px] font-semibold tabular-nums text-faint sm:text-xs">
                            {number}
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center text-[clamp(22px,3.4vw,40px)] font-semibold text-faint">
                            {dex.unknown}
                          </span>
                        </li>
                      );
                    }
                    order += 1;
                    const on = order < unlocked;
                    return (
                      <motion.li
                        key={tile.key}
                        initial={false}
                        animate={{ borderColor: on ? `${tile.color}66` : "rgba(255,255,255,0.1)" }}
                        transition={{ duration: 0.5 }}
                        className="relative aspect-square rounded-[22%] border bg-surface"
                      >
                        <span
                          className="absolute left-[12%] top-[10%] text-[10px] font-semibold tabular-nums transition-colors duration-500 sm:text-xs"
                          style={{ color: on ? tile.color : "var(--color-faint)" }}
                        >
                          {number}
                        </span>
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-[clamp(22px,3.4vw,40px)] font-semibold text-faint transition-opacity duration-300 ${
                            on ? "opacity-0" : "opacity-100"
                          }`}
                        >
                          {dex.unknown}
                        </span>
                        <motion.div
                          initial={false}
                          animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.5, rotate: on ? 0 : -24 }}
                          transition={{ type: "spring", stiffness: 230, damping: 17 }}
                          className="absolute inset-[16%] bottom-[24%]"
                        >
                          <Image
                            src={`/images/top-${tile.key}.webp`}
                            alt={on ? tile.name : ""}
                            width={360}
                            height={360}
                            className="h-full w-full select-none object-contain"
                          />
                        </motion.div>
                        <span
                          className={`absolute inset-x-1 bottom-[8%] truncate text-center text-[9px] font-semibold text-muted transition-opacity duration-500 sm:text-[11px] ${
                            on ? "opacity-100" : "opacity-0"
                          }`}
                        >
                          {tile.name}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
                <p className="mt-5 text-right text-sm font-semibold tabular-nums text-muted">
                  {unlocked} / {dex.tiles.length}
                </p>
              </div>
            </div>
          );
        }}
      </StickyStage>

      <div className="border-t border-line py-[clamp(72px,9vw,140px)]">
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">{dex.rarityLabel}</span>
          </Reveal>
        </div>
        <div className="relative mx-auto mt-6 w-full max-w-[1800px]">
          <Image
            src="/images/seltenheiten.webp"
            alt={dex.rarityAlt}
            width={2000}
            height={1000}
            sizes="100vw"
            className="fade-edges h-auto w-full select-none"
          />
          <ul className="absolute inset-x-0 bottom-[7%] hidden sm:block" aria-label={dex.rarityLabel}>
            {dex.rarities.map((item) => (
              <li
                key={item.name}
                className="absolute -translate-x-1/2 whitespace-nowrap text-[clamp(11px,1.15vw,16px)] font-semibold"
                style={{ left: `${item.at}%`, color: item.color }}
              >
                {item.name}
              </li>
            ))}
          </ul>
        </div>
        <ul className="container-x mt-8 flex flex-wrap gap-2 sm:hidden" aria-label={dex.rarityLabel}>
          {dex.rarities.map((item) => (
            <li
              key={item.name}
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ color: item.color, borderColor: `${item.color}55` }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
