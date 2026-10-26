import Image from "next/image";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "About Indiery | Technology-Driven Logistics Platform",
  description: "Indiery is a technology-driven logistics platform starting in Lucknow, serving individuals and businesses through independent transport partners.",
};

export default function AboutPage() {
  return (
    <div className="innerHeader">
      <SiteHeader active="about" />

      <main>
        {/* Hero Section */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "center" }}>
              <div>
                <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "20px" }}>
                  <i></i> ABOUT INDIERY
                </div>
                <h1 style={{ fontSize: "48px", fontWeight: "800", lineHeight: "1.18", margin: "0 0 20px", color: "#FFFFFF" }}>
                  A technology-driven logistics platform starting in Lucknow, <br />
                  <span style={{ color: "#A78BFA" }}>serving individuals and businesses through independent transport partners.</span>
                </h1>
                <p style={{ fontSize: "18px", lineHeight: "1.75", color: "#E2E8F0", margin: "0 0 28px", maxWidth: "760px" }}>
                  Simplifying goods movement across cities through multiple vehicle categories, dedicated mobile applications, and a trusted network of independent drivers and transport providers.
                </p>
              </div>

              <div style={{ position: "relative", minHeight: "320px", borderRadius: "24px", overflow: "hidden", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <Image
                  src="/banner_img01_indiery.png"
                  alt="Indiery Logistics Technology and Transport Network"
                  width={460}
                  height={300}
                  style={{ objectFit: "contain", filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.4))" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Suggested Positioning & Core Story */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "48px", alignItems: "center" }}>
              <div>
                <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>OUR STORY &amp; POSITIONING</span>
                <h2 style={{ fontSize: "34px", fontWeight: "800", color: "#0F172A", margin: "10px 0 20px", lineHeight: "1.25" }}>
                  Building Reliable Logistics For Modern Trade
                </h2>
                
                {/* Official Suggested Copy Block */}
                <div style={{ background: "#F5F3FF", borderLeft: "4px solid #7C3AED", padding: "20px 24px", borderRadius: "0 12px 12px 0", marginBottom: "24px" }}>
                  <p style={{ color: "#1E1B4B", fontSize: "16px", lineHeight: "1.8", margin: "0 0 12px", fontWeight: "500" }}>
                    &ldquo;Indiery is a technology-driven logistics platform that connects individuals and businesses with suitable goods transportation options. Starting in Lucknow, we aim to simplify logistics through multiple vehicle categories, dedicated customer and driver applications, and a network of independent transport partners.
                  </p>
                  <p style={{ color: "#1E1B4B", fontSize: "16px", lineHeight: "1.8", margin: 0, fontWeight: "500" }}>
                    Our goal is to make goods movement more accessible, organized, and convenient while building trusted relationships with customers, businesses, and transport providers.&rdquo;
                  </p>
                </div>

                <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", marginBottom: "20px" }}>
                  Goods movement in India has traditionally suffered from opaque pricing, unverified vehicle sourcing, and lack of live tracking. Indiery changes this by providing dedicated technology platforms for both shippers and drivers, enabling instant fare estimates, live GPS tracking, and structured coordination.
                </p>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "20px" }}>
                  <Link href="/services" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                    Explore Our Services
                  </Link>
                  <Link href="/contact" className="indiery-cta-btn" style={{ background: "#F1F5F9", color: "#0F172A", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                    Contact Lucknow Office
                  </Link>
                </div>
              </div>

              <div style={{ position: "relative", minHeight: "440px", borderRadius: "24px", overflow: "hidden", background: "#EDE9FE" }}>
                <Image
                  src="/assets/indiery-hero-fleet-cutout.png"
                  alt="Indiery transport partners and vehicle fleet"
                  fill
                  style={{ objectFit: "contain", padding: "20px" }}
                  priority
                  sizes="(max-width: 768px) 100vw, 550px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission, Values, Operating Model & Long-Term Vision */}
        <section className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>FOUNDATIONS</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>Our Pillars &amp; Principles</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                What drives our team as we build an enduring, reliable logistics ecosystem.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              {/* Mission */}
              <div style={{ background: "#FFFFFF", borderRadius: "18px", padding: "32px", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "16px" }}>
                  🎯
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", margin: "0 0 10px" }}>Our Mission</h3>
                <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.7", margin: 0 }}>
                  To organize city and intercity goods transportation through technology, empowering independent drivers with transparent earning opportunities and giving customers and businesses dependable, upfront logistics.
                </p>
              </div>

              {/* Operating Model */}
              <div style={{ background: "#FFFFFF", borderRadius: "18px", padding: "32px", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "16px" }}>
                  🔄
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", margin: "0 0 10px" }}>Operating Model</h3>
                <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.7", margin: 0 }}>
                  Indiery operates as a decentralized network platform. We verify driver documents, inspect commercial vehicles, match real demand with capacity, and coordinate reliable transit without owning heavy vehicle assets.
                </p>
              </div>

              {/* Values */}
              <div style={{ background: "#FFFFFF", borderRadius: "18px", padding: "32px", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "16px" }}>
                  ⚖️
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", margin: "0 0 10px" }}>Core Values</h3>
                <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.7", margin: 0 }}>
                  Clarity in pricing, respect for driver partners, care for every package or commercial consignment, and relentless focus on building honest, dependable logistics solutions.
                </p>
              </div>

              {/* Long-Term Vision */}
              <div style={{ background: "#FFFFFF", borderRadius: "18px", padding: "32px", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "16px" }}>
                  🚀
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", margin: "0 0 10px" }}>Long-Term Vision</h3>
                <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.7", margin: 0 }}>
                  Starting from our roots in Lucknow, Uttar Pradesh, we envision expanding dependable goods transportation corridors across North India, building a connected, seamless digital supply network for businesses of every scale.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Operating Area Callout */}
        <section id="coverage" className="section" style={{ padding: "60px 0 80px", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", marginBottom: "12px" }}>
              Based in Lucknow, Uttar Pradesh
            </h3>
            <p style={{ color: "#64748B", fontSize: "15px", lineHeight: "1.7", margin: "0 0 24px" }}>
              Our official company operations are headquartered at <strong>Devpur, Rajajipuram, Lucknow, Uttar Pradesh</strong>. We actively coordinate deliveries across the city and manage connecting intercity corridors.
            </p>
            <div style={{ display: "inline-flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", padding: "14px 24px", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "14px" }}>
              <span>📞 Phone: <a href="tel:+919264926552" style={{ color: "#7C3AED", fontWeight: "700" }}>+91 92649 26552</a></span>
              <span>✉️ Email: <a href="mailto:contact@indiery.com" style={{ color: "#7C3AED", fontWeight: "700" }}>contact@indiery.com</a></span>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
