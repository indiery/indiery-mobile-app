"use client";

import Image from "next/image";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const localServices = [
  {
    title: "Bike Delivery",
    capacity: "Up to 20 kg",
    icon: "🛵",
    description: "Fast two-wheeler delivery for small parcels, documents, medicines, packaged retail products, food, and daily essentials across Lucknow.",
    features: ["Capacity up to 20 kg", "Direct doorstep pickup & drop", "Live GPS tracking in Customer App", "Instant fare calculation"],
    booking: "Book via Indiery Customer App",
    slug: "bike-delivery",
    image: "/assets/service-bike-cutout.png",
  },
  {
    title: "Loader Delivery",
    capacity: "Up to 90 kg",
    icon: "🛺",
    description: "Convenient three-wheeler and e-loader delivery for suitable goods, multiple cartons, equipment, and medium commercial loads.",
    features: ["Capacity up to 90 kg", "Suitable for bulk parcel cartons", "Economical intra-city dispatch", "App booking with OTP protection"],
    booking: "Book via Indiery Customer App",
    slug: "loader-delivery",
    image: "/assets/service-tempo-cutout.png",
  },
];

const goodsTransportServices = [
  {
    title: "500 kg Mini Truck",
    capacity: "500 kg payload",
    icon: "🚚",
    description: "Compact commercial goods carrier ideal for navigating tight markets, wholesale deliveries, electronics, and medium shipments.",
    features: ["Payload up to 500 kg", "Dimensions suited for city lanes", "Upfront distance-based fare", "Direct driver coordination"],
    booking: "Book via Customer App & Business Desk",
    slug: "mini-truck-500",
    image: "/assets/generated/service-business-van-realistic-v3.png",
  },
  {
    title: "750 kg Mini Truck (Tata Ace)",
    capacity: "750 kg payload",
    icon: "🚛",
    description: "High-demand Tata Ace and equivalent mini trucks for commercial inventory, industrial goods, shop restocking, and heavy trade stock.",
    features: ["Payload up to 750 kg", "Open and covered bed availability", "Live route tracking on phone", "Verified independent drivers"],
    booking: "Book via Customer App & Business Desk",
    slug: "mini-truck-750",
    image: "/assets/service-tempo-cutout.png",
  },
  {
    title: "Larger-Capacity Trucks",
    capacity: "1 Ton to 10+ Tons (Subject to availability)",
    icon: "🏭",
    description: "Commercial vehicles available through Indiery's network of transport partners for bulk trade cargo, manufacturing parts, and heavy loads.",
    features: ["Capacity matched to your shipment", "Subject to route and partner availability", "Direct business enquiry process", "Coordinated dispatch support"],
    booking: "Enquire via Business / Logistics Desk",
    slug: "commercial-truck",
    image: "/assets/service-business-truck-cutout.png",
  },
];

export default function ServicesPage() {
  return (
    <div className="innerHeader">
      <SiteHeader active="services" />

      <main>
        {/* Hero Banner */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "820px" }}>
              <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "20px" }}>
                <i></i> COMPREHENSIVE GOODS TRANSPORTATION
              </div>
              <h1 style={{ fontSize: "50px", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", color: "#FFFFFF" }}>
                Our Logistics Services <br />
                <span style={{ color: "#A78BFA" }}>Local Delivery to Intercity Freight</span>
              </h1>
              <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 32px", maxWidth: "680px" }}>
                Indiery provides multiple vehicle categories across three distinct services: Local Deliveries, Goods Transport, and Intercity Logistics—connecting you with independent transport partners starting in Lucknow.
              </p>

              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <a href="#local" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                  Local Deliveries
                </a>
                <a href="#goods" className="indiery-cta-btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>
                  Goods Transport
                </a>
                <a href="#intercity" className="indiery-cta-btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>
                  Intercity Logistics
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            CATEGORY A: LOCAL DELIVERIES
            ================================================================= */}
        <section id="local" className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "760px", marginBottom: "40px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>CATEGORY A</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "8px 0 14px" }}>Local Deliveries</h2>
              <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.7" }}>
                On-demand intra-city delivery for everyday parcels and commercial loads across Lucknow. Customers access and book these services directly through the <strong>Indiery Customer App</strong>.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "30px" }}>
              {localServices.map((service) => (
                <div key={service.slug} style={{ background: "#F8FAFC", borderRadius: "20px", padding: "36px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ width: "54px", height: "54px", borderRadius: "14px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px" }}>
                      {service.icon}
                    </div>
                    <span style={{ background: "#7C3AED", color: "#FFFFFF", fontWeight: "700", fontSize: "13px", padding: "6px 14px", borderRadius: "20px" }}>
                      Capacity: {service.capacity}
                    </span>
                  </div>

                  <div style={{ position: "relative", height: "140px", margin: "6px 0 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image
                      src={service.image}
                      alt={service.title}
                      width={220}
                      height={130}
                      style={{ objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(124, 58, 237, 0.16))" }}
                    />
                  </div>

                  <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", margin: "0 0 12px" }}>{service.title}</h3>
                  <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.65", margin: "0 0 20px" }}>
                    {service.description}
                  </p>

                  <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0", marginBottom: "24px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Key Features</h4>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px", color: "#334155" }}>
                      {service.features.map((f, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #E2E8F0", paddingTop: "18px" }}>
                    <span style={{ fontSize: "13px", color: "#64748B", fontWeight: "600" }}>
                      📱 {service.booking}
                    </span>
                    <Link href="/download-apps" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "8px 18px", borderRadius: "8px", fontSize: "13.5px", textDecoration: "none", fontWeight: "700" }}>
                      Get App
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            CATEGORY B: GOODS TRANSPORT
            ================================================================= */}
        <section id="goods" className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "760px", marginBottom: "40px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>CATEGORY B</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "8px 0 14px" }}>Goods Transport</h2>
              <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.7" }}>
                Commercial goods transport for heavier, bulkier items. Suitability depends strictly on vehicle capacity, payload weight, dimensions, type of goods, and route conditions.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
              {goodsTransportServices.map((service) => (
                <div key={service.slug} style={{ background: "#FFFFFF", borderRadius: "20px", padding: "34px", border: "1px solid #E2E8F0", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.03)", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                      {service.icon}
                    </div>
                    <span style={{ background: "#F1F5F9", color: "#0F172A", fontWeight: "700", fontSize: "12.5px", padding: "5px 12px", borderRadius: "16px" }}>
                      {service.capacity}
                    </span>
                  </div>

                  <div style={{ position: "relative", height: "140px", margin: "6px 0 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image
                      src={service.image}
                      alt={service.title}
                      width={220}
                      height={130}
                      style={{ objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(15, 23, 42, 0.16))" }}
                    />
                  </div>

                  <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", margin: "0 0 10px" }}>{service.title}</h3>
                  <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.65", margin: "0 0 18px", flexGrow: 1 }}>
                    {service.description}
                  </p>

                  <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0", marginBottom: "22px" }}>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "#334155" }}>
                      {service.features.map((f, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12.5px", color: "#64748B" }}>
                      {service.booking}
                    </span>
                    <Link href="/contact" style={{ color: "#7C3AED", fontWeight: "700", fontSize: "13.5px", textDecoration: "none" }}>
                      Enquire →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            CATEGORY C: INTERCITY LOGISTICS
            ================================================================= */}
        <section id="intercity" className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)", borderRadius: "24px", padding: "48px 40px", color: "#FFFFFF", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "center" }}>
              <div>
                <span style={{ color: "#C4B5FD", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>CATEGORY C</span>
                <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#FFFFFF", margin: "8px 0 16px" }}>
                  Intercity Logistics (Full Truck Load)
                </h2>
                <p style={{ color: "#E2E8F0", fontSize: "16px", lineHeight: "1.75", marginBottom: "20px" }}>
                  Transportation of goods between cities through Indiery’s network of verified transport partners. Suitable trucks and transport providers are matched to different shipment volumes, connecting Lucknow with major commercial hubs across Uttar Pradesh and connecting corridors.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "28px" }}>
                  <div style={{ background: "rgba(255,255,255,0.08)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <div style={{ fontWeight: "700", fontSize: "14px", color: "#C4B5FD" }}>Full Truck Load (FTL)</div>
                    <div style={{ fontSize: "13px", color: "#CBD5E1" }}>Dedicated transport for commercial shipments.</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.08)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <div style={{ fontWeight: "700", fontSize: "14px", color: "#C4B5FD" }}>For Individuals &amp; Businesses</div>
                    <div style={{ fontSize: "13px", color: "#CBD5E1" }}>Transparent enquiry and rate confirmation.</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <Link href="/intercity" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "13px 26px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                    Explore Intercity Services &amp; Routes
                  </Link>
                  <Link href="/intercity#enquiry-form" className="indiery-cta-btn" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "13px 26px", borderRadius: "10px", fontWeight: "700", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
                    Submit Intercity Enquiry
                  </Link>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "18px", padding: "28px", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ position: "relative", height: "130px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image
                    src="/assets/hero-truck.png"
                    alt="Indiery Intercity Heavy Commercial Trucks"
                    width={260}
                    height={130}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.35))" }}
                  />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#FFFFFF", marginBottom: "14px" }}>Active Intercity Corridors From Lucknow:</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#E2E8F0" }}>
                  <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
                    <span>Lucknow ↔ Kanpur</span>
                    <strong style={{ color: "#A78BFA" }}>~80 km (Daily)</strong>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
                    <span>Lucknow ↔ Ayodhya</span>
                    <strong style={{ color: "#A78BFA" }}>~135 km (Daily)</strong>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
                    <span>Lucknow ↔ Prayagraj</span>
                    <strong style={{ color: "#A78BFA" }}>~200 km (Scheduled)</strong>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
                    <span>Lucknow ↔ Varanasi</span>
                    <strong style={{ color: "#A78BFA" }}>~310 km (Regular)</strong>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
                    <span>Lucknow ↔ Gorakhpur / Bareilly</span>
                    <strong style={{ color: "#A78BFA" }}>Regional trade routes</strong>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Lucknow ↔ Delhi NCR</span>
                    <strong style={{ color: "#A78BFA" }}>~500 km (Expressway)</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
