"use client";

import { useId, useState } from "react";
import { content } from "@/content/de";
import { Reveal, Title } from "@/components/ui";

export function Faq() {
  const { faq } = content;
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <section id="faq" className="section border-t border-line">
      <div className="container-x grid gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-24">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <span className="eyebrow">{faq.eyebrow}</span>
          <Title heading={faq.title} />
        </Reveal>
        <ul className="border-t border-line">
          {faq.items.map((item, index) => {
            const isOpen = open === index;
            const id = `${base}-${index}`;
            return (
              <li key={item.question} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => setOpen(isOpen ? null : index)}
                    className="group flex w-full items-center gap-5 py-7 text-left"
                  >
                    <span className="w-7 shrink-0 text-xs font-semibold tabular-nums text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-[clamp(17px,1.7vw,22px)] font-semibold tracking-tight">{item.question}</span>
                    <span
                      aria-hidden="true"
                      className={`relative h-5 w-5 shrink-0 transition-transform duration-500 ${isOpen ? "rotate-45" : ""}`}
                    >
                      <span className="absolute left-0 top-1/2 h-px w-full bg-white/70 group-hover:bg-white" />
                      <span className="absolute left-1/2 top-0 h-full w-px bg-white/70 group-hover:bg-white" />
                    </span>
                  </button>
                </h3>
                <div id={id} role="region" className="disclosure" data-open={isOpen ? "" : undefined}>
                  <div>
                    <p className="max-w-[60ch] pb-8 pl-12 text-[15px] leading-relaxed text-muted">{item.answer}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
