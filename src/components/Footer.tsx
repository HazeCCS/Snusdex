import Image from "next/image";
import { content } from "@/content/de";
import { site } from "@/lib/site";

export function Footer() {
  const { footer } = content;
  const year = new Date().getFullYear();
  const linkClass = "text-muted transition-colors hover:text-white";

  return (
    <footer className="border-t border-line bg-black">
      <div className="container-x py-10 text-xs leading-relaxed text-faint">
        <p>{footer.health}</p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-line pt-6">
          <span className="flex items-center gap-2.5">
            <Image src="/images/logo.webp" alt="" width={20} height={20} className="h-5 w-5" />
            <span>
              © {year} {site.company}
            </span>
          </span>
          <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={site.privacyUrl} target="_blank" rel="noopener" className={linkClass}>
              {footer.privacy}
            </a>
            <a href={site.imprintUrl} target="_blank" rel="noopener" className={linkClass}>
              {footer.imprint}
            </a>
            <a href={site.contactUrl} target="_blank" rel="noopener" className={linkClass}>
              {footer.contact}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
