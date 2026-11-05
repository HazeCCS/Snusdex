"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { content } from "@/content/de";
import { StoreButton } from "@/components/ui";

type Layer = {
  src: string;
  left: number;
  top: number;
  size: string;
  depth: number;
  rotate: number;
  z: number;
  delay: number;
  dur: number;
  blur?: number;
  opacity?: number;
  desktopOnly?: boolean;
  mobile?: { left: number; top: number };
};

const big = "clamp(120px, 17vw, 300px)";
const mid = "clamp(84px, 10vw, 180px)";
const far = "clamp(56px, 7vw, 120px)";

const layers: Layer[] = [
  { src: "can-menthol", left: 41, top: 5, size: far, depth: 0.4, rotate: 8, z: 3, delay: 700, dur: 9, blur: 3, opacity: 0.65, desktopOnly: true },
  { src: "can-strawberry", left: 22, top: 9, size: mid, depth: 0.8, rotate: -8, z: 6, delay: 620, dur: 8.6, blur: 1.5, opacity: 0.9, mobile: { left: 38, top: 5 } },
  { src: "can-blueberry", left: 74, top: 62, size: far, depth: 0.5, rotate: 12, z: 4, delay: 760, dur: 10, blur: 2.5, opacity: 0.7, desktopOnly: true },
  { src: "can-ice-watermelon", left: 21, top: 74, size: mid, depth: 0.6, rotate: 6, z: 5, delay: 700, dur: 9.4, blur: 2, opacity: 0.85, mobile: { left: 40, top: 80 } },
  { src: "can-cactus-lemon", left: 60, top: 84, size: far, depth: 0.35, rotate: -14, z: 3, delay: 800, dur: 10.5, blur: 3, opacity: 0.6, desktopOnly: true },
  { src: "can-banana-blast", left: -2, top: 16, size: big, depth: 1.75, rotate: -16, z: 30, delay: 400, dur: 7.4, mobile: { left: -6, top: 9 } },
  { src: "can-blue-raspberry", left: 79, top: 8, size: big, depth: 1.45, rotate: 14, z: 28, delay: 500, dur: 8.2, mobile: { left: 68, top: 11 } },
  { src: "can-wild-berries", left: 5, top: 63, size: big, depth: 2.1, rotate: 11, z: 34, delay: 560, dur: 6.8, mobile: { left: 1, top: 73 } },
  { src: "can-spearmint", left: 80, top: 56, size: big, depth: 1.15, rotate: -12, z: 22, delay: 650, dur: 9, mobile: { left: 68, top: 72 } },
];

function ParallaxLayer({
  layer,
  px,
  py,
  scroll,
}: {
  layer: Layer;
  px: MotionValue<number>;
  py: MotionValue<number>;
  scroll: MotionValue<number>;
}) {
  const x = useTransform(px, (value) => value * layer.depth * 90);
  const pointerY = useTransform(py, (value) => value * layer.depth * 60);
  const scrollY = useTransform(scroll, [0, 1], [0, (layer.depth - 1) * -260]);
  const y = useTransform(() => pointerY.get() + scrollY.get());

  const anchor = {
    "--ld": `${layer.left}%`,
    "--td": `${layer.top}%`,
    "--lm": `${layer.mobile?.left ?? layer.left}%`,
    "--tm": `${layer.mobile?.top ?? layer.top}%`,
  } as CSSProperties;

  return (
    <div className="contents" style={anchor}>
      <motion.div
        aria-hidden="true"
        className={`pointer-events-none absolute [left:var(--lm)] [top:var(--tm)] md:[left:var(--ld)] md:[top:var(--td)] ${
          layer.desktopOnly ? "hidden md:block" : ""
        }`}
        style={{ width: layer.size, zIndex: layer.z, x, y }}
      >
        <div className="rise" style={{ "--delay": `${layer.delay}ms` } as CSSProperties}>
          <div
            className="float"
            style={
              {
                "--r": `${layer.rotate}deg`,
                "--dur": `${layer.dur}s`,
                "--float-delay": `-${layer.delay / 100}s`,
                transform: `rotate(${layer.rotate}deg)`,
                filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
                opacity: layer.opacity,
              } as CSSProperties
            }
          >
            <Image
              src={`/images/${layer.src}.webp`}
              alt=""
              width={640}
              height={640}
              sizes="(min-width: 1024px) 17vw, 30vw"
              className="h-auto w-full select-none"
              draggable={false}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const px = useSpring(useMotionValue(0), { stiffness: 55, damping: 16, mass: 0.6 });
  const py = useSpring(useMotionValue(0), { stiffness: 55, damping: 16, mass: 0.6 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      px.set(event.clientX / window.innerWidth - 0.5);
      py.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py, reduced]);

  const { hero } = content;

  return (
    <section ref={ref} id="top" className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden text-center">
      <div aria-hidden="true" className="absolute inset-0">
        {layers.map((layer) => (
          <ParallaxLayer key={layer.src} layer={layer} px={px} py={py} scroll={scrollYProgress} />
        ))}
      </div>

      <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 px-5 pb-16 pt-24">
        <h1 className="text-[clamp(54px,10.6vw,176px)] font-bold leading-[0.93] tracking-[-0.055em]">
          {hero.lines.map((line, index) => (
            <span key={line} className="rise block" style={{ "--delay": `${120 + index * 110}ms` } as CSSProperties}>
              {line}
            </span>
          ))}
        </h1>
        <p
          className="rise mx-auto mt-7 max-w-[34ch] text-balance text-[clamp(18px,1.7vw,24px)] font-medium leading-snug tracking-tight text-muted"
          style={{ "--delay": "520ms" } as CSSProperties}
        >
          {hero.text}
        </p>
        <div
          className="rise mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4"
          style={{ "--delay": "640ms" } as CSSProperties}
        >
          <StoreButton label={hero.download} />
          <a href="#dex" className="link">
            {hero.explore}
            <span aria-hidden="true">›</span>
          </a>
        </div>
      </motion.div>

      <p
        className="rise absolute inset-x-0 bottom-7 z-10 px-5 text-[13px] font-medium text-faint"
        style={{ "--delay": "900ms" } as CSSProperties}
      >
        {hero.meta.join("  ·  ")}
      </p>
    </section>
  );
}
