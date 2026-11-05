import { AppShowcase } from "@/components/AppShowcase";
import { Dex } from "@/components/Dex";
import { EndCta } from "@/components/EndCta";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { More } from "@/components/More";
import { Partner } from "@/components/Partner";
import { Reviews } from "@/components/Reviews";
import { Scan } from "@/components/Scan";
import { content } from "@/content/de";
import { site } from "@/lib/site";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    operatingSystem: "iOS 18.0 or later",
    applicationCategory: "LifestyleApplication",
    description: content.meta.description,
    url: site.url,
    downloadUrl: site.appStoreUrl,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@type": "Organization", name: site.company, url: site.companyUrl },
    inLanguage: ["de", "en", "es", "fr", "it", "nl", "pl", "ru"],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Dex />
        <Scan />
        <Reviews />
        <AppShowcase />
        <More />
        <Faq />
        <Partner />
        <EndCta />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
