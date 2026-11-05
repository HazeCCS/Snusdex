import { content } from "@/content/de";
import { site } from "@/lib/site";
import { Reveal, Title } from "@/components/ui";

export function Partner() {
  const { partner } = content;

  return (
    <section className="border-t border-line py-[clamp(72px,9vw,128px)]">
      <div className="container-x">
        <Reveal className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end lg:gap-20">
          <Title heading={partner.title} className="text-[clamp(32px,4vw,60px)]" />
          <div>
            <p className="text-[clamp(16px,1.3vw,19px)] font-medium leading-snug tracking-tight text-muted">{partner.text}</p>
            <a href={site.contactUrl} target="_blank" rel="noopener" className="link mt-5">
              {partner.cta}
              <span aria-hidden="true">›</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
