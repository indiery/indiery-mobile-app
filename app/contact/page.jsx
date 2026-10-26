"use client";

import { useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState("business"); // "business" or "driver"
  const [businessForm, setBusinessForm] = useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    email: "",
    businessType: "Retailer / Merchant",
    requirements: "",
  });
  const [driverForm, setDriverForm] = useState({
    name: "",
    phone: "",
    city: "Lucknow",
    vehicleCategory: "Mini Truck 750 kg (Tata Ace)",
    notes: "",
  });
  const [submittedMessage, setSubmittedMessage] = useState("");

  const handleBusinessSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Indiery Business Enquiry: ${businessForm.businessName}`);
    const body = encodeURIComponent(
      `Business Name: ${businessForm.businessName}\n` +
      `Contact Person: ${businessForm.contactPerson}\n` +
      `Phone: ${businessForm.phone}\n` +
      `Email: ${businessForm.email}\n` +
      `Business Type: ${businessForm.businessType}\n\n` +
      `Requirements & Details:\n${businessForm.requirements}`
    );
    window.location.href = `mailto:contact@indiery.com?subject=${subject}&body=${body}`;
    setSubmittedMessage("Your business enquiry has been prepared. Our Lucknow desk will connect with you promptly.");
  };

  const handleDriverSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Indiery Driver Partner Enquiry: ${driverForm.name} (${driverForm.vehicleCategory})`);
    const body = encodeURIComponent(
      `Driver Name: ${driverForm.name}\n` +
      `Phone: ${driverForm.phone}\n` +
      `City: ${driverForm.city}\n` +
      `Vehicle Category: ${driverForm.vehicleCategory}\n\n` +
      `Notes / Questions:\n${driverForm.notes}`
    );
    window.location.href = `mailto:contact@indiery.com?subject=${subject}&body=${body}`;
    setSubmittedMessage("Your driver partner enquiry has been prepared. Our onboarding team will connect with you.");
  };

  return (
    <div className="innerHeader">
      <SiteHeader active="contact" />

      <main>
        {/* Hero Section */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ maxWidth: "800px" }}>
              <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "20px" }}>
                <i></i> CONTACT &amp; SUPPORT
              </div>
              <h1 style={{ fontSize: "50px", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", color: "#FFFFFF" }}>
                Connect With <span style={{ color: "#A78BFA" }}>Indiery</span>
              </h1>
              <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 32px" }}>
                Have questions about our logistics services, business partnerships, or driver onboarding? Reach our official operations team in Lucknow.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info & Forms Grid */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "48px", alignItems: "flex-start" }}>
              
              {/* Contact Information Cards */}
              <div>
                <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>DIRECT CONTACT CHANNELS</span>
                <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0F172A", margin: "8px 0 24px" }}>We Are Here To Help</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Phone */}
                  <div style={{ background: "#F8FAFC", borderRadius: "16px", padding: "24px", border: "1px solid #E2E8F0", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                      📞
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>Business Phone Number</div>
                      <a href="tel:+919264926552" style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A", textDecoration: "none", display: "inline-block", marginTop: "2px" }}>
                        +91 92649 26552
                      </a>
                      <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Mon – Sat: 8:00 AM – 9:00 PM (Lucknow Hub)</div>
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ background: "#F8FAFC", borderRadius: "16px", padding: "24px", border: "1px solid #E2E8F0", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                      ✉️
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>Official Company Email</div>
                      <a href="mailto:contact@indiery.com" style={{ fontSize: "17px", fontWeight: "800", color: "#7C3AED", textDecoration: "none", display: "inline-block", marginTop: "2px" }}>
                        contact@indiery.com
                      </a>
                      <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>For general enquiries, support &amp; partnerships</div>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div style={{ background: "#ECFDF5", borderRadius: "16px", padding: "24px", border: "1px solid #D1FAE5", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#059669", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                      💬
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#065F46", textTransform: "uppercase" }}>WhatsApp Support Desk</div>
                      <a href="https://wa.me/919264926552" target="_blank" rel="noopener noreferrer" style={{ fontSize: "17px", fontWeight: "800", color: "#059669", textDecoration: "none", display: "inline-block", marginTop: "2px" }}>
                        Chat on WhatsApp (+91 92649 26552)
                      </a>
                      <div style={{ fontSize: "13px", color: "#047857", marginTop: "4px" }}>Instant responses for booking &amp; driver queries</div>
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ background: "#F8FAFC", borderRadius: "16px", padding: "24px", border: "1px solid #E2E8F0", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                      📍
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>Registered Office Address</div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#0F172A", marginTop: "2px" }}>
                        Devpur, Rajajipuram, Lucknow, Uttar Pradesh, India
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Local operations &amp; regional fleet management hub</div>
                    </div>
                  </div>
                </div>

                {/* Service Coverage Information */}
                <div style={{ marginTop: "28px", padding: "20px", borderRadius: "14px", background: "#F5F3FF", border: "1px solid #EDE9FE" }}>
                  <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#1E1B4B", margin: "0 0 6px" }}>Service Coverage</h4>
                  <p style={{ fontSize: "13.5px", color: "#475569", margin: 0, lineHeight: "1.6" }}>
                    Operating across Lucknow municipality (Hazratganj, Gomti Nagar, Alambagh, Indira Nagar, Rajajipuram, Transport Nagar, Chowk, and all sectors) and active intercity corridors (Lucknow to Kanpur, Ayodhya, Prayagraj, Varanasi, Gorakhpur, Bareilly, Delhi NCR).
                  </p>
                </div>
              </div>

              {/* Enquiry Forms with Tabs */}
              <div style={{ background: "#F8FAFC", borderRadius: "24px", padding: "36px", border: "1px solid #E2E8F0", boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)" }}>
                {/* Form Tabs */}
                <div style={{ display: "flex", gap: "8px", background: "#E2E8F0", padding: "4px", borderRadius: "12px", marginBottom: "28px" }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("business"); setSubmittedMessage(""); }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "14px",
                      background: activeTab === "business" ? "#FFFFFF" : "transparent",
                      color: activeTab === "business" ? "#7C3AED" : "#64748B",
                      boxShadow: activeTab === "business" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    🏢 Business Enquiry Form
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("driver"); setSubmittedMessage(""); }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "14px",
                      background: activeTab === "driver" ? "#FFFFFF" : "transparent",
                      color: activeTab === "driver" ? "#059669" : "#64748B",
                      boxShadow: activeTab === "driver" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    🚚 Driver Partner Route
                  </button>
                </div>

                {submittedMessage && (
                  <div style={{ padding: "16px 20px", background: "#D1FAE5", color: "#065F46", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", fontWeight: "600" }}>
                    ✓ {submittedMessage}
                  </div>
                )}

                {/* Business Enquiry Form */}
                {activeTab === "business" ? (
                  <form onSubmit={handleBusinessSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                        Business / Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Your business or trade name"
                        value={businessForm.businessName}
                        onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Your name"
                          value={businessForm.contactPerson}
                          onChange={(e) => setBusinessForm({ ...businessForm, contactPerson: e.target.value })}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile number"
                          value={businessForm.phone}
                          onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="business@example.com"
                          value={businessForm.email}
                          onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                          Business Type *
                        </label>
                        <select
                          value={businessForm.businessType}
                          onChange={(e) => setBusinessForm({ ...businessForm, businessType: e.target.value })}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", background: "#fff" }}
                        >
                          <option value="Retailer / Merchant">Retailer / Merchant</option>
                          <option value="Wholesaler / Distributor">Wholesaler / Distributor</option>
                          <option value="E-Commerce / D2C Brand">E-Commerce / D2C Brand</option>
                          <option value="Manufacturing / Industrial">Manufacturing / Industrial</option>
                          <option value="Other Commercial Entity">Other Commercial Entity</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                        Transport Requirements &amp; Routes *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Tell us what you need to move, vehicle preferences (bikes, mini trucks, intercity FTL), and typical frequency..."
                        value={businessForm.requirements}
                        onChange={(e) => setBusinessForm({ ...businessForm, requirements: e.target.value })}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", resize: "vertical" }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="indiery-cta-btn"
                      style={{ background: "#7C3AED", color: "#fff", padding: "14px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "15px", marginTop: "8px" }}
                    >
                      Email Business Enquiry
                    </button>
                  </form>
                ) : (
                  /* Driver Partner Enquiry Route */
                  <form onSubmit={handleDriverSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Driver / partner name"
                        value={driverForm.name}
                        onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit phone number"
                          value={driverForm.phone}
                          onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                          Operating City *
                        </label>
                        <input
                          type="text"
                          required
                          value={driverForm.city}
                          onChange={(e) => setDriverForm({ ...driverForm, city: e.target.value })}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                        Vehicle Category *
                      </label>
                      <select
                        value={driverForm.vehicleCategory}
                        onChange={(e) => setDriverForm({ ...driverForm, vehicleCategory: e.target.value })}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", background: "#fff" }}
                      >
                        <option value="Two-Wheeler (Bike - up to 20 kg)">Two-Wheeler (Bike - up to 20 kg)</option>
                        <option value="Mini Loader (up to 90 kg)">Mini Loader (up to 90 kg)</option>
                        <option value="Mini Truck 500 kg">Mini Truck 500 kg</option>
                        <option value="Mini Truck 750 kg (Tata Ace)">Mini Truck 750 kg (Tata Ace)</option>
                        <option value="Commercial Truck (1 Ton - 3 Ton)">Commercial Truck (1 Ton - 3 Ton)</option>
                        <option value="Intercity Commercial Transport">Intercity Commercial Transport</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1E293B", marginBottom: "4px" }}>
                        Questions / Application Notes
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Any queries regarding documents, vehicle attachment, or onboarding in Lucknow..."
                        value={driverForm.notes}
                        onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", resize: "vertical" }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="indiery-cta-btn"
                      style={{ background: "#059669", color: "#fff", padding: "14px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "15px", marginTop: "8px" }}
                    >
                      Email Driver Partner Enquiry
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
