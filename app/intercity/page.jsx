"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const intercityVehicles = [
  {
    name: "Mini Truck (750 kg / Tata Ace)",
    capacity: "Up to 750 kg",
    bestFor: "Cartons, light commercial inventory, appliances, short-to-mid haul intercity runs",
    specs: "Approx. 7 ft × 4.5 ft cargo bay",
    image: "/assets/service-tempo-cutout.png",
  },
  {
    name: "1 Ton - 2 Ton Light Commercial Trucks",
    capacity: "1,000 kg - 2,000 kg",
    bestFor: "Wholesale consignments, distributor dispatches, manufacturing spare parts",
    specs: "Approx. 8 ft - 10 ft closed or open container",
    image: "/assets/service-business-truck-cutout.png",
  },
  {
    name: "Intermediate Commercial Trucks (14 ft / 17 ft / 19 ft)",
    capacity: "3 Ton - 7 Ton",
    bestFor: "FMCG bulk goods, industrial equipment, textile shipments, large trade loads",
    specs: "High-volume cargo bodies, weather-sealed options",
    image: "/assets/service-moving-truck-cutout.png",
  },
  {
    name: "Full Truck Load (FTL Heavy Vehicles)",
    capacity: "Up to 10+ Tons (Subject to availability)",
    bestFor: "Heavy bulk shipments, seasonal harvests, raw materials, regional distribution",
    specs: "Arranged through verified regional transport partners",
    image: "/assets/hero-truck.png",
  },
];

const intercityRoutes = [
  { from: "Lucknow", to: "Kanpur", distance: "~80 km", transitTime: "Same day (3-4 hrs)", frequency: "Daily active corridor" },
  { from: "Lucknow", to: "Ayodhya", distance: "~135 km", transitTime: "Same day (4-5 hrs)", frequency: "Daily active corridor" },
  { from: "Lucknow", to: "Prayagraj", distance: "~200 km", transitTime: "Same day / Overnight", frequency: "Regular scheduled routes" },
  { from: "Lucknow", to: "Varanasi", distance: "~310 km", transitTime: "Next day delivery", frequency: "Regular scheduled routes" },
  { from: "Lucknow", to: "Gorakhpur", distance: "~270 km", transitTime: "Same day / Overnight", frequency: "Active Eastern UP route" },
  { from: "Lucknow", to: "Bareilly", distance: "~250 km", transitTime: "Same day / Overnight", frequency: "Active Western UP route" },
  { from: "Lucknow", to: "Agra / Mathura", distance: "~335 km", transitTime: "Next day via Expressway", frequency: "Express corridor" },
  { from: "Lucknow", to: "Delhi NCR", distance: "~500 km", transitTime: "Next day delivery", frequency: "Key trade corridor" },
];

export default function IntercityPage() {
  const [formData, setFormData] = useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    email: "",
    pickupCity: "Lucknow",
    destinationCity: "",
    goodsType: "",
    approxWeight: "",
    preferredDate: "",
    notes: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Indiery Intercity Enquiry: ${formData.pickupCity} to ${formData.destinationCity || "City"}`);
    const body = encodeURIComponent(
      `Business / Individual: ${formData.businessName || "Not provided"}\n` +
      `Contact Person: ${formData.contactPerson}\n` +
      `Phone: ${formData.phone}\n` +
      `Email: ${formData.email}\n` +
      `Route: ${formData.pickupCity} to ${formData.destinationCity}\n` +
      `Goods Description: ${formData.goodsType}\n` +
      `Approx Weight / Vehicle: ${formData.approxWeight}\n` +
      `Preferred Date: ${formData.preferredDate || "Immediate"}\n\n` +
      `Additional Notes:\n${formData.notes || "None"}`
    );
    window.location.href = `mailto:contact@indiery.com?subject=${subject}&body=${body}`;
    setFormSubmitted(true);
  };

  return (
    <div className="innerHeader">
      <SiteHeader active="intercity" />

      <main>
        {/* Hero Section */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "820px" }}>
              <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "20px" }}>
                <i></i> INTERCITY GOODS TRANSPORTATION
              </div>
              <h1 style={{ fontSize: "50px", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", color: "#FFFFFF" }}>
                Intercity Logistics &amp; <br />
                <span style={{ color: "#A78BFA" }}>Full Truck Load Services</span>
              </h1>
              <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 32px", maxWidth: "680px" }}>
                Indiery coordinates intercity goods transportation connecting Lucknow with major commercial hubs through our network of verified independent transport partners.
              </p>

              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <a href="#enquiry-form" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                  Request Intercity Transport
                </a>
                <a href="https://wa.me/919264926552?text=Hello%20Indiery,%20I%20have%20an%20intercity%20goods%20transport%20requirement" target="_blank" rel="noopener noreferrer" className="indiery-cta-btn" style={{ background: "rgba(255,255,255,0.1)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.25)", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span>WhatsApp Logistics Desk</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Introduction & Operating Model */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "48px", alignItems: "center" }}>
              <div>
                <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>HOW INDIERY OPERATES INTERCITY</span>
                <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "12px 0 20px", lineHeight: "1.25" }}>
                  Direct Transport Coordination For Reliable Goods Movement
                </h2>
                <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.75", marginBottom: "18px" }}>
                  Indiery operates as a technology-driven logistics platform. Rather than making speculative online promises, our intercity operations pair your specific cargo, volume, and timeline with vetted regional transport providers who operate dedicated routes.
                </p>
                <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.75", marginBottom: "24px" }}>
                  Whether you are a wholesaler moving regular inventory, a manufacturer shipping components, or a business transporting bulk commercial goods, we verify vehicle availability, confirm realistic schedules, and coordinate transit updates directly.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
                  <div style={{ padding: "16px", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#7C3AED", fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>Full Truck Load (FTL)</div>
                    <div style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.5" }}>Dedicated vehicles assigned exclusively to your cargo.</div>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#7C3AED", fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>Verified Transport Partners</div>
                    <div style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.5" }}>Background-checked drivers and road-worthy commercial vehicles.</div>
                  </div>
                </div>
              </div>

              <div style={{ position: "relative", minHeight: "420px", borderRadius: "24px", overflow: "hidden", background: "#FAF5FF", border: "1px solid #EDE9FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Image
                  src="/assets/hero-truck.png"
                  alt="Indiery intercity logistics and commercial goods transport"
                  fill
                  style={{ objectFit: "contain", padding: "20px" }}
                  sizes="(max-width: 768px) 100vw, 550px"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Supported Vehicle Options */}
        <section className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>FLEET &amp; CAPACITY</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>Supported Vehicle Categories &amp; Capacities</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                We support a range of commercial vehicles suited for different shipment volumes, payload weights, and route restrictions.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              {intercityVehicles.map((vehicle, idx) => (
                <div key={idx} style={{ background: "#FFFFFF", borderRadius: "16px", padding: "28px", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                      🚚
                    </div>
                    <span style={{ background: "#F1F5F9", color: "#0F172A", fontWeight: "700", fontSize: "12.5px", padding: "4px 10px", borderRadius: "8px" }}>
                      {vehicle.capacity}
                    </span>
                  </div>

                  <div style={{ position: "relative", height: "120px", margin: "6px 0 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image
                      src={vehicle.image}
                      alt={vehicle.name}
                      width={200}
                      height={110}
                      style={{ objectFit: "contain", filter: "drop-shadow(0 8px 16px rgba(124, 58, 237, 0.15))" }}
                    />
                  </div>

                  <h3 style={{ fontSize: "19px", fontWeight: "700", color: "#0F172A", margin: "0 0 8px" }}>{vehicle.name}</h3>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.6", margin: "0 0 16px", flexGrow: 1 }}>
                    {vehicle.bestFor}
                  </p>
                  <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "12px", fontSize: "12.5px", color: "#64748B" }}>
                    <strong>Specs:</strong> {vehicle.specs}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real Routes Served */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>INTERCITY NETWORK</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>Active Routes Connected From Lucknow</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                Our network operates key transit corridors across Uttar Pradesh and connecting interstate corridors with verified transport providers.
              </p>
            </div>

            <div style={{ overflowX: "auto", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14.5px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#0F172A" }}>
                    <th style={{ padding: "16px 20px", fontWeight: "700" }}>Origin</th>
                    <th style={{ padding: "16px 20px", fontWeight: "700" }}>Destination</th>
                    <th style={{ padding: "16px 20px", fontWeight: "700" }}>Distance</th>
                    <th style={{ padding: "16px 20px", fontWeight: "700" }}>Typical Transit Time</th>
                    <th style={{ padding: "16px 20px", fontWeight: "700" }}>Route Status</th>
                  </tr>
                </thead>
                <tbody>
                  {intercityRoutes.map((route, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < intercityRoutes.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <td style={{ padding: "16px 20px", fontWeight: "600", color: "#0F172A" }}>{route.from}</td>
                      <td style={{ padding: "16px 20px", fontWeight: "700", color: "#7C3AED" }}>{route.to}</td>
                      <td style={{ padding: "16px 20px", color: "#64748B" }}>{route.distance}</td>
                      <td style={{ padding: "16px 20px", color: "#334155" }}>{route.transitTime}</td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#EDE9FE", color: "#6D28D9", fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px" }}>
                          ● {route.frequency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: "18px", fontSize: "13.5px", color: "#64748B", textAlign: "center" }}>
              *Transit times are subject to route permissions, traffic, loading conditions, and seasonal guidelines. Custom industrial corridors available on request.
            </p>
          </div>
        </section>

        {/* How It Works (Real Process) */}
        <section className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>TRANSPARENT PROCESS</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>How Intercity Booking Works</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                We maintain an honest, reliable coordination process. Here is how your intercity shipment moves from enquiry to safe delivery.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
              <div style={{ background: "#FFFFFF", padding: "30px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>1</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>Submit Requirement</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  Share your route (origin &amp; destination), goods category, estimated payload, and preferred schedule via our enquiry form or WhatsApp.
                </p>
              </div>

              <div style={{ background: "#FFFFFF", padding: "30px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>2</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>Vehicle &amp; Rate Confirmation</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  Our logistics team verifies vehicle availability with our partner network and provides a transparent quote based on vehicle size and route distance.
                </p>
              </div>

              <div style={{ background: "#FFFFFF", padding: "30px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>3</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>Loading &amp; Dispatch</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  The verified transport partner arrives at your specified pickup facility. Verification and documentation are completed before departure.
                </p>
              </div>

              <div style={{ background: "#FFFFFF", padding: "30px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7C3AED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "16px" }}>4</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>Transit Updates &amp; Delivery</h3>
                <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  Receive periodic milestone updates through coordination support until the truck reaches the destination and completes unloading.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Business Requirements & Real Enquiry Form */}
        <section id="enquiry-form" className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ background: "#F8FAFC", borderRadius: "24px", padding: "48px", border: "1px solid #E2E8F0", boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 36px" }}>
                <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>DIRECT ENQUIRY</span>
                <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0F172A", margin: "8px 0 12px" }}>Enquire For Intercity Goods Transportation</h2>
                <p style={{ color: "#64748B", fontSize: "15px", lineHeight: "1.6" }}>
                  Let us know your goods and route details. Our team will verify partner vehicle availability and get back with accurate rates and timelines.
                </p>
              </div>

              {formSubmitted ? (
                <div style={{ textAlign: "center", padding: "40px", background: "#EDE9FE", borderRadius: "16px" }}>
                  <div style={{ fontSize: "42px", marginBottom: "12px" }}>✅</div>
                  <h3 style={{ color: "#4C1D95", fontSize: "22px", fontWeight: "800", margin: "0 0 8px" }}>Enquiry Prepared</h3>
                  <p style={{ color: "#5B21B6", fontSize: "15px", maxWidth: "540px", margin: "0 auto 20px" }}>
                    Your email client has been prepared with your shipment requirements. You can also reach our intercity desk directly on phone or WhatsApp.
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <a href="tel:+919264926552" className="indiery-cta-btn" style={{ background: "#7C3AED", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>
                      Call +91 92649 26552
                    </a>
                    <a href="https://wa.me/919264926552" target="_blank" rel="noopener noreferrer" className="indiery-cta-btn" style={{ background: "#059669", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>
                      WhatsApp Now
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Business or Entity Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your company or trade name"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Contact Person Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contact person's full name"
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
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Pickup City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lucknow (Transport Nagar)"
                      value={formData.pickupCity}
                      onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Destination City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kanpur, Varanasi, Gorakhpur"
                      value={formData.destinationCity}
                      onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Goods Description &amp; Category *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FMCG cartons, hardware, textiles"
                      value={formData.goodsType}
                      onChange={(e) => setFormData({ ...formData, goodsType: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Approx Weight / Vehicle Required
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 750 kg, 2 Ton, or 14 ft truck"
                      value={formData.approxWeight}
                      onChange={(e) => setFormData({ ...formData, approxWeight: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Additional Details &amp; Special Handling Requirements
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Any specific delivery timelines, gate passes, or loading requirements..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginTop: "10px" }}>
                    <div style={{ fontSize: "13px", color: "#64748B" }}>
                      Direct Contact: <a href="tel:+919264926552" style={{ color: "#7C3AED", fontWeight: "700" }}>+91 92649 26552</a> · <a href="mailto:contact@indiery.com" style={{ color: "#7C3AED", fontWeight: "700" }}>contact@indiery.com</a>
                    </div>
                    <button
                      type="submit"
                      className="indiery-cta-btn"
                      style={{ background: "#7C3AED", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "15px" }}
                    >
                      Submit Intercity Request
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
