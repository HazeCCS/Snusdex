"use client";

import { useState } from "react";
import Image from "next/image";
import { useMotionValueEvent, useScroll } from "motion/react";
import { content } from "@/content/de";
import { StoreButton } from "@/components/ui";

export function Header() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);

  useMotionValueEvent(scrollY, "change", (value) => {
    setSolid((current) => (current === value > 24 ? current : value > 24));
  });

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,box-shadow] duration-300 ${
        solid ? "bg-black/70 shadow-[0_1px_0_var(--color-line)] backdrop-blur-2xl backdrop-saturate-150" : ""
      }`}
    >
      <div className="container-x flex h-14 items-center justify-between gap-6">
        <a href="#top" className="flex items-center gap-2.5" aria-label="Snusdex">
          <Image src="/images/logo.webp" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="text-[17px] font-semibold tracking-tight">Snusdex</span>
        </a>
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-8 md:flex">
          {content.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium text-muted transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <StoreButton label="App Store" small />
      </div>
    </header>
  );
}
