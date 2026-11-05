import type { ReactNode } from "react";
import { content } from "@/content/de";
import { Reveal, Title } from "@/components/ui";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const icons = {
  scanner: (
    <Icon>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" />
    </Icon>
  ),
  search: (
    <Icon>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </Icon>
  ),
  bolt: (
    <Icon>
      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
    </Icon>
  ),
  cans: (
    <Icon>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
      <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </Icon>
  ),
  photo: (
    <Icon>
      <rect x="3.5" y="6" width="17" height="13" rx="3" />
      <circle cx="12" cy="12.5" r="3.2" />
      <path d="M9 6l1-2h4l1 2" />
    </Icon>
  ),
  globe: (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5S14.4 18.1 12 20.5C9.6 18.1 8.4 15.3 8.4 12S9.6 5.9 12 3.5z" />
    </Icon>
  ),
};

function Card({
  icon,
  title,
  className = "",
  children,
}: {
  icon: ReactNode;
  title: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Reveal className={className}>
      <div className="flex h-full min-h-[240px] flex-col justify-between gap-10 rounded-[28px] border border-line bg-surface p-7 sm:p-9">
        <span className="text-white">{icon}</span>
        <div>
          <h3 className="text-[clamp(22px,2vw,28px)] font-semibold tracking-tight">{title}</h3>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-medium text-muted">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function More() {
  const { more } = content;
  const text = "mt-2 max-w-[34ch] text-base leading-snug text-muted";

  return (
    <section className="section border-t border-line">
      <div className="container-x">
        <Reveal>
          <span className="eyebrow">{more.eyebrow}</span>
          <Title heading={more.title} />
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card icon={icons.scanner} title={more.scanner.title} className="lg:col-span-3">
            <p className={text}>{more.scanner.text}</p>
          </Card>
          <Card icon={icons.search} title={more.search.title} className="lg:col-span-3">
            <p className={text}>{more.search.text}</p>
          </Card>
          <Card icon={icons.bolt} title={more.quick.title} className="lg:col-span-2">
            <p className={text}>{more.quick.text}</p>
            <Chips items={more.quick.chips} />
          </Card>
          <Card icon={icons.cans} title={more.cans.title} className="lg:col-span-4">
            <p className={text}>{more.cans.text}</p>
          </Card>
          <Card icon={icons.photo} title={more.photos.title} className="lg:col-span-3">
            <p className={text}>{more.photos.text}</p>
          </Card>
          <Card icon={icons.globe} title={more.languages.title} className="lg:col-span-3">
            <Chips items={more.languages.chips} />
          </Card>
        </div>
      </div>
    </section>
  );
}
