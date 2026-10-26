"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const faqCategories = [
  {
    id: "vehicles",
    title: "Vehicle Options & Capacities",
    icon: "🚚",
    items: [
      {
        q: "What vehicle options does Indiery provide?",
        a: "Indiery provides multiple vehicle options categorized into: 1) Two-Wheeler Bikes for lightweight parcels up to 20 kg; 2) Mini Loaders for carton and medium loads up to 90 kg; 3) 500 kg Mini Trucks for compact commercial loads; 4) 750 kg Mini Trucks (Tata Ace) for heavy trade goods and appliances; and 5) Larger Commercial Trucks (1 Ton to 10+ Tons) for high-tonnage intercity routes through our transport partner network.",
      },
      {
        q: "How do I choose the right vehicle for my goods?",
        a: "Choose a bike if your items are under 20 kg and fit in a courier bag (documents, medicines, gifts, food). Choose an e-loader for up to 90 kg of packaged cartons. For bulk inventory, furniture items, electronics, or shop restocking, book a 500 kg or 750 kg mini truck. For multi-ton regional shipments, contact our logistics desk for commercial trucks.",
      },
      {
        q: "Does Indiery offer Packers & Movers services?",
        a: "No. Indiery strictly provides goods transportation and commercial cargo transport connecting customers and businesses with verified vehicle drivers. We do not offer residential packing and moving or household shifting services.",
      },
    ],
  },
  {
    id: "coverage",
    title: "Service Coverage",
    icon: "📍",
    items: [
      {
        q: "Where is Indiery currently operating?",
        a: "Indiery's initial launch location is Lucknow, Uttar Pradesh. Our local delivery and goods transport services operate across Lucknow, including Hazratganj, Gomti Nagar, Alambagh, Indira Nagar, Charbagh, Rajajipuram, Transport Nagar, Chowk, Aminabad, and surrounding sectors.",
      },
      {
        q: "Which intercity routes are supported?",
        a: "We coordinate dedicated Full Truck Load (FTL) transport between Lucknow and major trade hubs across Uttar Pradesh, including Kanpur (~80 km), Ayodhya (~135 km), Prayagraj (~200 km), Varanasi (~310 km), Gorakhpur (~270 km), Bareilly (~250 km), and connecting trade corridors to Delhi NCR.",
      },
    ],
  },
  {
    id: "app",
    title: "App Usage & Bookings",
    icon: "📱",
    items: [
      {
        q: "How do customers book a delivery?",
        a: "Customer bookings are made directly through the Indiery Customer App available on Google Play Store. Simply select your pickup and drop locations in Lucknow, choose a suitable vehicle category, review the upfront fare, and confirm your booking.",
      },
      {
        q: "How is delivery verified and tracked?",
        a: "Once a verified driver partner is assigned, you can follow their real-time location on the map. At both pickup and drop-off, secure OTP verification ensures that goods are only handed over to authorized recipients.",
      },
      {
        q: "What payment methods are supported in the app?",
        a: "The Indiery platform supports secure cashless payments through UPI, credit/debit cards, net banking, Cash on Delivery (where applicable), and the Indiery In-App Wallet.",
      },
    ],
  },
  {
    id: "intercity",
    title: "Intercity Delivery",
    icon: "🛣️",
    items: [
      {
        q: "How does intercity logistics work on Indiery?",
        a: "Indiery coordinates intercity goods transportation on a Full Truck Load (FTL) basis through our vetted network of independent transport partners. You submit your route, cargo description, and preferred schedule. We verify vehicle availability and confirm realistic timelines and pricing.",
      },
      {
        q: "Can individuals book intercity transport as well as businesses?",
        a: "Yes. Both individual customers and businesses with full truck load requirements can enquire and book intercity transport through our dedicated logistics desk.",
      },
      {
        q: "Are intercity rates fixed or instant?",
        a: "Intercity shipments are quoted transparently based on route distance, vehicle payload, cargo handling requirements, and partner availability. We provide clear upfront rates before your consignment is confirmed.",
      },
    ],
  },
  {
    id: "business",
    title: "Business Partnerships",
    icon: "🤝",
    items: [
      {
        q: "How can businesses partner with Indiery?",
        a: "Retailers, wholesalers, distributors, e-commerce sellers, and manufacturers can submit a business enquiry through our 'For Business' page or contact our Lucknow office directly. We evaluate your typical dispatch volumes, set up central accounts, and coordinate vehicle availability.",
      },
      {
        q: "Does Indiery offer special credit terms or guaranteed delivery slots?",
        a: "Indiery maintains clear, upfront platform settlements. We do not make speculative credit promises, guaranteed delivery times, or unverified special rate offers. All dispatches reflect real operating conditions, transparent pricing, and partner availability.",
      },
      {
        q: "Can businesses schedule daily or recurring routes?",
        a: "Yes. For businesses with predictable daily or weekly delivery needs between godowns, retail stores, or neighboring cities, our operations team coordinates recurring partner allocations.",
      },
    ],
  },
];

export default function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState("vehicles");
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (catId, itemIdx) => {
    const key = `${catId}-${itemIdx}`;
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentCategory = faqCategories.find((c) => c.id === selectedCategory) || faqCategories[0];

  return (
    <div className="innerHeader">
      <SiteHeader active="home" />

      <main>
        {/* Hero Section */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "800px" }}>
              <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "20px" }}>
                <i></i> FREQUENTLY ASKED QUESTIONS
              </div>
              <h1 style={{ fontSize: "50px", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", color: "#FFFFFF" }}>
                Frequently Asked <span style={{ color: "#A78BFA" }}>Questions</span>
              </h1>
              <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 32px" }}>
                Find verified answers regarding Indiery&apos;s vehicle options, Lucknow service coverage, customer app usage, intercity freight, and business partnerships.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs Layout */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "48px", alignItems: "flex-start" }}>
              
              {/* Category Navigation Sidebar */}
              <div style={{ background: "#F8FAFC", borderRadius: "18px", padding: "18px", border: "1px solid #E2E8F0", position: "sticky", top: "100px" }}>
                <span style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#64748B", textTransform: "uppercase", padding: "8px 12px", letterSpacing: "0.5px" }}>
                  FAQ TOPICS
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {faqCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "14.5px",
                        fontWeight: "700",
                        background: selectedCategory === cat.id ? "#7C3AED" : "transparent",
                        color: selectedCategory === cat.id ? "#FFFFFF" : "#334155",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.title}</span>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #E2E8F0", paddingLeft: "12px", paddingRight: "12px" }}>
                  <div style={{ fontSize: "12.5px", color: "#64748B", marginBottom: "8px" }}>Have more questions?</div>
                  <Link href="/contact" style={{ color: "#7C3AED", fontWeight: "700", fontSize: "14px", textDecoration: "none" }}>
                    Contact Support Team →
                  </Link>
                </div>
              </div>

              {/* Accordion Content */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                  <span style={{ fontSize: "28px" }}>{currentCategory.icon}</span>
                  <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#0F172A", margin: 0 }}>
                    {currentCategory.title}
                  </h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {currentCategory.items.map((item, idx) => {
                    const isOpen = !!openItems[`${currentCategory.id}-${idx}`];
                    return (
                      <div
                        key={idx}
                        style={{
                          borderRadius: "14px",
                          border: "1px solid #E2E8F0",
                          overflow: "hidden",
                          transition: "border-color 0.2s ease",
                          borderColor: isOpen ? "#C4B5FD" : "#E2E8F0",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(currentCategory.id, idx)}
                          style={{
                            width: "100%",
                            padding: "20px 24px",
                            textAlign: "left",
                            background: isOpen ? "#F5F3FF" : "#FFFFFF",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "16.5px",
                            fontWeight: "700",
                            color: "#0F172A",
                          }}
                        >
                          <span style={{ paddingRight: "16px" }}>{item.q}</span>
                          <span style={{ color: "#7C3AED", fontSize: "22px", flexShrink: 0 }}>
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: "18px 24px 24px", background: "#FFFFFF", color: "#475569", fontSize: "15px", lineHeight: "1.75", borderTop: "1px solid #EDE9FE" }}>
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Additional Help Callout */}
                <div style={{ marginTop: "40px", padding: "24px 28px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A", margin: "0 0 4px" }}>Still have questions?</h3>
                    <p style={{ color: "#64748B", fontSize: "14px", margin: 0 }}>Call our Lucknow office at +91 92649 26552 or email contact@indiery.com</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <a href="tel:+919264926552" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700", fontSize: "14px" }}>
                      Call Us
                    </a>
                    <a href="https://wa.me/919264926552" target="_blank" rel="noopener noreferrer" className="indiery-cta-btn" style={{ background: "#059669", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700", fontSize: "14px" }}>
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
