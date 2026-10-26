import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Pricing & Plans | Indiery Logistics",
  description: "Transparent pricing options for individual customer deliveries, business logistics accounts, and intercity freight.",
};

const options = [
  {
    name: "On-Demand Local Delivery",
    price: "Transparent Fare by Trip",
    description: "For small parcels, cartons, appliances, and shop inventory across Lucknow booked via Customer App.",
    features: ["Bikes (20 kg) & Loaders (90 kg)", "500 kg & 750 kg Mini Trucks", "Upfront distance-based fare", "Live GPS tracking & OTP delivery"],
    action: "Download Customer App",
    href: "/download-apps",
  },
  {
    name: "Business Logistics Partnership",
    price: "Based on Usage & Volume",
    description: "For retailers, merchants, wholesalers, and distributors needing regular store and trade dispatches.",
    features: ["Recurring route coordination", "Direct logistics support", "Multi-vehicle access across Lucknow", "GST-compliant invoices"],
    action: "Become a Business Partner",
    href: "/for-business",
    popular: true,
  },
  {
    name: "Intercity Logistics (FTL)",
    price: "Custom Route Quote",
    description: "Dedicated full truck load transport connecting Lucknow with Kanpur, Ayodhya, Varanasi, and regional trade hubs.",
    features: ["Dedicated full truck load vehicles", "Verified regional transport partners", "Milestone coordination updates", "For businesses & individual shippers"],
    action: "Explore Intercity Services",
    href: "/intercity",
  },
];

export default function PackagesPage() {
  return (
    <div className="innerHeader">
      <SiteHeader active="pricing" />
      <main>
        <section className="pricingHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <h1 style={{ fontSize: "44px", fontWeight: "800", color: "#FFFFFF" }}>
              Transparent Logistics Options For <br />
              <span style={{ color: "#A78BFA" }}>Every Goods Transportation Need</span>
            </h1>
            <p style={{ color: "#E2E8F0", fontSize: "17px", maxWidth: "680px" }}>
              Pay upfront per trip on the Customer App, partner with us for business logistics, or request dedicated intercity freight.
            </p>
          </div>
        </section>

        <section className="section pricingSection" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div className="pricingGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
              {options.map((option) => (
                <article
                  key={option.name}
                  style={{
                    background: option.popular ? "#FAF5FF" : "#F8FAFC",
                    borderColor: option.popular ? "#C4B5FD" : "#E2E8F0",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderRadius: "20px",
                    padding: "36px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: option.popular ? "0 10px 30px rgba(124, 58, 237, 0.08)" : "none",
                  }}
                >
                  {option.popular && (
                    <em style={{ background: "#7C3AED", color: "#fff", fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "12px", alignSelf: "flex-start", fontStyle: "normal", marginBottom: "14px" }}>
                      Recommended for Commercial Needs
                    </em>
                  )}
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", margin: "0 0 8px" }}>{option.name}</h2>
                  <strong style={{ fontSize: "20px", color: "#7C3AED", fontWeight: "800", display: "block", marginBottom: "12px" }}>{option.price}</strong>
                  <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.65", margin: "0 0 20px" }}>{option.description}</p>
                  <hr style={{ border: "none", borderTop: "1px solid #E2E8F0", margin: "0 0 20px" }} />
                  <b style={{ fontSize: "13.5px", color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px", display: "block" }}>What It Includes</b>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#334155", flexGrow: 1 }}>
                    {option.features.map((item) => (
                      <li key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={option.href}
                    className="indiery-cta-btn"
                    style={{
                      background: option.popular ? "#7C3AED" : "#0F172A",
                      color: "#FFFFFF",
                      textAlign: "center",
                      justifyContent: "center",
                      padding: "13px 22px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      textDecoration: "none",
                      fontSize: "14.5px",
                    }}
                  >
                    {option.action}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
