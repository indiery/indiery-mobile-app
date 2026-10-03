import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { services } from "../../lib/site-data";

export const metadata = {
  title: "Delivery & Shifting Services",
  description: "Explore Indiery bike delivery, mini trucks, commercial vehicles, business dispatch, house shifting, and driver partner services.",
};

export default function ServicesPage() {
  return (
    <main>
      <SiteHeader active="services" />
      <section className="newsHero innerPageHero">
        <div className="shell">
          <h1>One app for parcels,<br /><span>goods and complete moves.</span></h1>
          <p>Choose the service that matches what you need to send, shift, or deliver across your city.</p>
        </div>
      </section>
      <section className="section newsArchive">
        <div className="shell newsArchiveGrid">
          {Object.entries(services).map(([slug, service]) => (
            <article key={slug}>
              <a href={`/services/${slug}`} className="archiveImage">
                <Image src={service.image} alt={service.title} fill sizes="(max-width: 820px) 100vw, 33vw" />
              </a>
              <div className="kicker"><i /> {service.eyebrow}</div>
              <h2><a href={`/services/${slug}`}>{service.title}</a></h2>
              <p>{service.description}</p>
              <a className="readLink" href={`/services/${slug}`}>Explore service ↗</a>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
