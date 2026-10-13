import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import { legacyServiceSlugs, services } from "../../../lib/site-data";

export function generateStaticParams() {
  return [...Object.keys(services), ...Object.keys(legacyServiceSlugs)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = services[legacyServiceSlugs[slug] || slug];
  return {
    title: service?.title || "Delivery Service",
    description: service?.description || "Explore Indiery's on-demand city delivery and shifting services.",
  };
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  if (legacyServiceSlugs[slug]) redirect(`/services/${legacyServiceSlugs[slug]}`);
  const service = services[slug];
  if (!service) notFound();
  return <main><SiteHeader active="services" /><section className="serviceDetailHero innerPageHero"><div className="shell serviceDetailGrid"><aside><b>Other Services</b>{service.other.map(([label, href]) => <a key={href} href={href}>{label}</a>)}<div className="brochure"><strong>Not sure which vehicle or service fits your move?</strong><a href="/contact">Talk to Indiery</a></div></aside><div className="serviceDetailContent"><div className="largeServiceIcon">{service.icon}</div><div className="kicker"><i /> {service.eyebrow}</div><h1>{service.title}</h1><p className="serviceLead">{service.description}</p><div className="servicePhoto"><Image src={service.image} alt={`${service.title} with Indiery`} fill priority sizes="(max-width: 820px) 100vw, 65vw" /></div></div></div></section><section className="section includedSection"><div className="shell includedGrid"><div><h2>What you get with<br />this service</h2><p>Indiery combines the right vehicle or moving team with clear booking details and support from pickup to completion.</p></div><ul>{service.includes.map((item, i) => <li key={item}><b>0{i + 1}</b><span>{item}</span></li>)}</ul></div></section><section className="servicePromise"><div className="shell"><h2>Every move is different.<br /><span>The experience stays simple.</span></h2><div><p>Clear fare estimate</p><p>Verified partners</p><p>Live trip visibility</p></div></div></section><SiteFooter /></main>;
}
