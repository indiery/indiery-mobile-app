import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import { legacyServiceSlugs, services } from "../../../lib/site-data";

export function generateStaticParams() {
  return [...Object.keys(services), ...Object.keys(legacyServiceSlugs), "driver-partners", "intercity"].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = services[legacyServiceSlugs[slug] || slug];
  return {
    title: service ? `${service.title} | Indiery Logistics` : "Logistics Service",
    description: service?.description || "Explore Indiery's on-demand city delivery and goods transportation services in Lucknow.",
  };
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  if (slug === "driver-partners") redirect("/driver-partner");
  if (slug === "intercity") redirect("/intercity");
  if (legacyServiceSlugs[slug]) redirect(`/services/${legacyServiceSlugs[slug]}`);
  
  const service = services[slug];
  if (!service) notFound();

  return (
    <div className="innerHeader">
      <SiteHeader active="services" />
      <main>
        <section className="serviceDetailHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "48px", alignItems: "flex-start" }}>
              <aside style={{ background: "rgba(255,255,255,0.06)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.12)" }}>
                <b style={{ display: "block", color: "#C4B5FD", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
                  Explore Services
                </b>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {service.other.map(([label, href]) => (
                    <Link key={href} href={href} style={{ color: "#E2E8F0", fontSize: "14px", textDecoration: "none", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                      {label}
                    </Link>
                  ))}
                  <Link href="/intercity" style={{ color: "#C4B5FD", fontWeight: "700", fontSize: "14px", textDecoration: "none", padding: "8px 12px", borderRadius: "8px", background: "rgba(124, 58, 237, 0.25)", border: "1px solid rgba(139, 92, 246, 0.4)" }}>
                    Intercity Logistics (FTL) →
                  </Link>
                </div>
                <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <p style={{ fontSize: "13px", color: "#CBD5E1", margin: "0 0 10px" }}>Need advice on vehicle capacity?</p>
                  <Link href="/contact" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: "13.5px" }}>
                    Talk to Indiery Logistics →
                  </Link>
                </div>
              </aside>

              <div>
                <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "16px" }}>
                  <i></i> {service.categoryTitle || "LOGISTICS"}
                </div>
                <h1 style={{ fontSize: "42px", fontWeight: "800", color: "#FFFFFF", margin: "0 0 16px" }}>{service.title}</h1>
                <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 28px", maxWidth: "680px" }}>
                  {service.description}
                </p>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <Link href="/download-apps" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                    Book on Customer App
                  </Link>
                  <Link href="/contact" className="indiery-cta-btn" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>
                    Enquire Directly
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "700px", marginBottom: "36px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>INCLUDED WITH THIS SERVICE</span>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0F172A", margin: "8px 0 12px" }}>What You Get With {service.title}</h2>
              <p style={{ color: "#64748B", fontSize: "15px", lineHeight: "1.6" }}>
                Indiery pairs verified vehicle drivers with upfront distance-based pricing and active trip support from pickup to doorstep completion.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
              {service.includes.map((item, i) => (
                <div key={item} style={{ background: "#F8FAFC", padding: "26px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <b style={{ color: "#7C3AED", fontSize: "20px", display: "block", marginBottom: "8px" }}>0{i + 1}</b>
                  <p style={{ color: "#1E293B", fontSize: "15px", fontWeight: "600", margin: 0, lineHeight: "1.5" }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
