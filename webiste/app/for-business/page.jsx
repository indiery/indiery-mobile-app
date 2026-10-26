"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const businessUseCases = [
  {
    icon: "🏪",
    title: "Retailers & Merchants",
    description: "Reliable store replenishment, customer doorstep deliveries, and rapid intra-city stock transfers across commercial markets in Lucknow.",
    vehicles: "Bike Delivery (up to 20 kg) & 500 kg / 750 kg Mini Trucks",
  },
  {
    icon: "📦",
    title: "Wholesalers & Distributors",
    description: "Scheduled dispatch from central godowns and Transport Nagar to regional sub-dealers, trade partners, and retail outlets.",
    vehicles: "750 kg Tata Ace, 1-2 Ton commercial trucks & Intercity FTL",
  },
  {
    icon: "🛒",
    title: "E-Commerce & D2C Brands",
    description: "Efficient first-mile pickup from fulfillment hubs and scheduled same-day delivery across municipal zones.",
    vehicles: "Bikes for small parcels & Loaders / Mini trucks for batches",
  },
  {
    icon: "⚙️",
    title: "Manufacturers & Industrial Supply",
    description: "Movement of raw materials, machinery spare parts, hardware, and packaging supplies on verified local and intercity routes.",
    vehicles: "Commercial Trucks & Dedicated Intercity Full Truck Load",
  },
  {
    icon: "🍎",
    title: "FMCG & Perishable Goods",
    description: "Time-conscious transportation for packaged consumables, dry groceries, and FMCG supplies with direct driver coordination.",
    vehicles: "Closed container mini trucks & scheduled corridor transport",
  },
  {
    icon: "🏗️",
    title: "Hardware, Paints & Electricals",
    description: "Transport of heavy building materials, cables, fittings, and equipment suited to vehicle payload and bay dimensions.",
    vehicles: "500 kg, 750 kg Mini Trucks & 2+ Ton Commercial Vehicles",
  },
];

const businessFaqs = [
  {
    q: "How does Indiery work with businesses?",
    a: "Indiery connects your business with verified independent driver-partners and transport providers for both local goods movement across Lucknow and dedicated intercity routes. You can book individual trips through the Customer App or discuss recurring requirements directly with our logistics team.",
  },
  {
    q: "Can businesses request multiple vehicles or recurring dispatches?",
    a: "Yes. Businesses with regular dispatch schedules can discuss their transport volume, preferred pickup windows, and routes with us. We coordinate partner availability to support consistent goods movement.",
  },
  {
    q: "What types of goods can be transported?",
    a: "Indiery facilitates the transport of legal commercial goods, packaged products, retail cartons, hardware, electronics, spare parts, and general trade inventory that conform to vehicle payload and dimensions. Hazardous, illegal, or prohibited materials cannot be carried.",
  },
  {
    q: "Are fares fixed or subject to change?",
    a: "Local deliveries booked via the Indiery Customer App follow transparent, upfront fare calculations based on vehicle category and trip distance. Intercity goods transportation quotes are determined transparently based on route distance, vehicle capacity, and partner availability.",
  },
  {
    q: "Does Indiery offer credit facilities or guaranteed delivery windows?",
    a: "Indiery operates transparent, upfront cash/digital settlements through our platform. We do not provide speculative credit facilities or unverified delivery guarantees; transit times and partner allocation depend on real operating conditions, route permissions, and vehicle availability.",
  },
  {
    q: "How do we receive trip updates and delivery confirmation?",
    a: "Local orders can be tracked in real-time through the customer interface with live GPS. For intercity routes, our operations desk provides coordinated milestone updates from pickup to delivery handoff.",
  },
];

export default function ForBusinessPage() {
  const [formData, setFormData] = useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    email: "",
    businessType: "Retailer / Merchant",
    transportRequirements: "Local Goods Transport (Mini Trucks)",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Indiery Business Partner Enquiry: ${formData.businessName}`);
    const body = encodeURIComponent(
      `Business Name: ${formData.businessName}\n` +
      `Contact Person: ${formData.contactPerson}\n` +
      `Phone: ${formData.phone}\n` +
      `Email: ${formData.email}\n` +
      `Business Type: ${formData.businessType}\n` +
      `Transport Requirements: ${formData.transportRequirements}\n\n` +
      `Additional Details:\n${formData.notes || "None provided"}`
    );
    window.location.href = `mailto:contact@indiery.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="innerHeader">
      <SiteHeader active="business" />

      <main>
        {/* Hero Section */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "800px" }}>
              <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "20px" }}>
                <i></i> LOGISTICS PLATFORM FOR BUSINESSES
              </div>
              <h1 style={{ fontSize: "50px", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", color: "#FFFFFF" }}>
                Technology-Driven Logistics <br />
                <span style={{ color: "#A78BFA" }}>For Growing Businesses</span>
              </h1>
              <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 32px", maxWidth: "680px" }}>
                Connect your business with dependable independent drivers and transport partners for on-demand local distribution across Lucknow and reliable intercity goods movement.
              </p>

              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <a href="#enquiry" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                  Become a Business Partner
                </a>
                <a href="https://wa.me/919264926552?text=Hello%20Indiery,%20I%20want%20to%20discuss%20logistics%20requirements%20for%20my%20business" target="_blank" rel="noopener noreferrer" className="indiery-cta-btn" style={{ background: "rgba(255,255,255,0.1)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.25)", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Overview */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "48px", alignItems: "center" }}>
              <div>
                <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>OVERVIEW OF INDIERY</span>
                <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "12px 0 20px", lineHeight: "1.25" }}>
                  A Smarter Way To Coordinate Goods Movement
                </h2>
                <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.75", marginBottom: "18px" }}>
                  Indiery simplifies logistics for businesses by eliminating the hassle of unorganized vehicle sourcing, unpredictable driver availability, and unclear rates.
                </p>
                <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.75", marginBottom: "24px" }}>
                  Through our network of independent driver-partners and transport providers, businesses can access suitable vehicles for lightweight parcels, heavy commercial cargo, or regional intercity dispatches—backed by digital coordination and responsive support.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ padding: "16px", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#7C3AED", fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>Local Deliveries &amp; Goods Transport</div>
                    <div style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.5" }}>Bikes, loaders, and 500/750 kg mini trucks across Lucknow.</div>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#7C3AED", fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>Intercity Logistics (FTL)</div>
                    <div style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.5" }}>Full Truck Load routes connecting Lucknow to key regional trade hubs.</div>
                  </div>
                </div>
              </div>

              <div style={{ position: "relative", minHeight: "420px", borderRadius: "24px", overflow: "hidden", background: "#EDE9FE" }}>
                <Image
                  src="/assets/service-business-v2.png"
                  alt="Indiery business logistics solutions"
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 768px) 100vw, 550px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Suitable Business Use Cases */}
        <section className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>INDUSTRY FIT</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>Suitable Business Use Cases</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                From small retailers to regional distributors, Indiery connects your goods with the right vehicle category and transport partner.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {businessUseCases.map((uc, idx) => (
                <div key={idx} style={{ background: "#FFFFFF", borderRadius: "16px", padding: "28px", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: "32px", marginBottom: "16px" }}>{uc.icon}</div>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#0F172A", margin: "0 0 10px" }}>{uc.title}</h3>
                  <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.65", margin: "0 0 16px", flexGrow: 1 }}>
                    {uc.description}
                  </p>
                  <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "12px", fontSize: "12.5px", color: "#7C3AED", fontWeight: "600" }}>
                    <strong>Recommended:</strong> {uc.vehicles}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to Become a Business Partner */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>PARTNERSHIP JOURNEY</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>How To Become A Business Partner</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                Getting started with Indiery is straightforward, professional, and transparent.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
              <div style={{ padding: "28px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>1</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>Submit Enquiry</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  Fill out the business enquiry form below or reach our team via phone or WhatsApp with your goods details and routes.
                </p>
              </div>

              <div style={{ padding: "28px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>2</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>Requirements Discussion</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  We discuss your typical dispatch volume, vehicle requirements (bikes, mini trucks, commercial trucks), and preferred schedules.
                </p>
              </div>

              <div style={{ padding: "28px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>3</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>Account Setup &amp; App Access</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  Set up your Indiery profile, configure pickup locations in Lucknow, and equip your staff with the Indiery Customer App.
                </p>
              </div>

              <div style={{ padding: "28px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>4</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>Dispatch &amp; Dedicated Support</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  Book deliveries whenever you need, track trips in real time, and receive direct coordination support from our local team.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Business Enquiry Form */}
        <section id="enquiry" className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "48px", border: "1px solid #E2E8F0", boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 36px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                  <Image
                    src="/assets/service-business-truck-cutout.png"
                    alt="Indiery Commercial Goods Transport"
                    width={180}
                    height={100}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 8px 16px rgba(124, 58, 237, 0.18))" }}
                  />
                </div>
                <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>PARTNERSHIP ENQUIRY</span>
                <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0F172A", margin: "8px 0 12px" }}>Discuss Your Logistics Requirements</h2>
                <p style={{ color: "#64748B", fontSize: "15px", lineHeight: "1.6" }}>
                  Tell us about your business and goods movement needs. Our Lucknow operations team will contact you promptly.
                </p>
              </div>

              {submitted ? (
                <div style={{ textAlign: "center", padding: "40px", background: "#EDE9FE", borderRadius: "16px" }}>
                  <div style={{ fontSize: "42px", marginBottom: "12px" }}>🎉</div>
                  <h3 style={{ color: "#4C1D95", fontSize: "22px", fontWeight: "800", margin: "0 0 8px" }}>Thank You For Reaching Out</h3>
                  <p style={{ color: "#5B21B6", fontSize: "15px", maxWidth: "540px", margin: "0 auto 20px" }}>
                    Your enquiry details have been drafted for submission to contact@indiery.com. You can also contact our business desk directly.
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <a href="tel:+919264926552" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>
                      Call +91 92649 26552
                    </a>
                    <a href="https://wa.me/919264926552" target="_blank" rel="noopener noreferrer" className="indiery-cta-btn" style={{ background: "#059669", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>
                      WhatsApp Business Desk
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sharma Traders, Quick Retail"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Contact Person&apos;s Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="business@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Business Type *
                    </label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px", background: "#fff" }}
                    >
                      <option value="Retailer / Merchant">Retailer / Merchant</option>
                      <option value="Wholesaler / Distributor">Wholesaler / Distributor</option>
                      <option value="E-Commerce / D2C Brand">E-Commerce / D2C Brand</option>
                      <option value="Manufacturing / Industrial">Manufacturing / Industrial</option>
                      <option value="FMCG / Grocery">FMCG / Grocery</option>
                      <option value="Hardware / Construction Supplies">Hardware / Construction Supplies</option>
                      <option value="Other Commercial Business">Other Commercial Business</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Transport Requirements *
                    </label>
                    <select
                      value={formData.transportRequirements}
                      onChange={(e) => setFormData({ ...formData, transportRequirements: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px", background: "#fff" }}
                    >
                      <option value="Local Goods Transport (Mini Trucks 500kg / 750kg)">Local Goods Transport (Mini Trucks 500kg / 750kg)</option>
                      <option value="Local Small Parcel Deliveries (Bikes & Loaders)">Local Small Parcel Deliveries (Bikes &amp; Loaders)</option>
                      <option value="Intercity Goods Logistics (Full Truck Load)">Intercity Goods Logistics (Full Truck Load)</option>
                      <option value="Both Local & Intercity Transportation">Both Local &amp; Intercity Transportation</option>
                      <option value="Recurring / Daily Scheduled Routes">Recurring / Daily Scheduled Routes</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Any Relevant Additional Details
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Expected weekly volume, typical routes, cargo dimensions, or specific timing requirements..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginTop: "10px" }}>
                    <div style={{ fontSize: "13px", color: "#64748B" }}>
                      Call Us: <a href="tel:+919264926552" style={{ color: "#7C3AED", fontWeight: "700" }}>+91 92649 26552</a> · <a href="https://wa.me/919264926552" target="_blank" rel="noopener noreferrer" style={{ color: "#059669", fontWeight: "700" }}>WhatsApp Support</a>
                    </div>
                    <button
                      type="submit"
                      className="indiery-cta-btn"
                      style={{ background: "#7C3AED", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "15px" }}
                    >
                      Submit Business Enquiry
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQs for Business Clients */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 40px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>COMMON QUESTIONS</span>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0F172A", margin: "8px 0 12px" }}>FAQs For Business Clients</h2>
              <p style={{ color: "#64748B", fontSize: "15px" }}>
                Clear answers regarding our platform, pricing, vehicle categories, and operating policies.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {businessFaqs.map((faq, idx) => (
                <div key={idx} style={{ borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === idx ? -1 : idx)}
                    style={{ width: "100%", padding: "18px 24px", textAlign: "left", background: activeFaq === idx ? "#F5F3FF" : "#FFFFFF", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "16px", fontWeight: "700", color: "#0F172A" }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ color: "#7C3AED", fontSize: "20px", marginLeft: "12px" }}>{activeFaq === idx ? "−" : "+"}</span>
                  </button>
                  {activeFaq === idx && (
                    <div style={{ padding: "16px 24px 22px", background: "#FFFFFF", color: "#475569", fontSize: "15px", lineHeight: "1.7", borderTop: "1px solid #EDE9FE" }}>
                      {faq.a}
                    </div>
                  )}
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
