"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const partnerBenefits = [
  {
    icon: "📱",
    title: "Dedicated Driver Partner App",
    description: "Receive nearby delivery offers directly on your phone with clear pickup, drop, distance, and upfront payout details before accepting.",
  },
  {
    icon: "⏱️",
    title: "Flexible Working Hours",
    description: "Go online when you are ready to work and offline whenever you choose. You remain in control of your daily schedule.",
  },
  {
    icon: "💰",
    title: "Transparent Platform Payouts",
    description: "Track trip earnings and settled balances inside the Indiery Driver App with clear digital ledger visibility.",
  },
  {
    icon: "🤝",
    title: "Local Operations Support",
    description: "Access dedicated support from our Lucknow operations team for app assistance, trip coordination, and account queries.",
  },
];

const partnerRequirements = [
  {
    category: "Identity & Verification",
    items: [
      "Valid Government Identity Proof (Aadhaar Card)",
      "Permanent Account Number (PAN Card)",
      "Recent passport-style photograph / selfie",
      "Active bank account details in driver's name for trip settlements",
    ],
  },
  {
    category: "Driver & Driving Credentials",
    items: [
      "Valid Driving Licence (Commercial / Transport endorsement where applicable)",
      "Minimum 18 years of age with clean driving record",
      "Active Android smartphone with GPS capabilities",
      "Working mobile number for OTP verification and customer calls",
    ],
  },
  {
    category: "Vehicle Documentation",
    items: [
      "Vehicle Registration Certificate (RC) for commercial goods transport",
      "Valid vehicle insurance policy",
      "Pollution Under Control (PUC) certificate",
      "Vehicle fitness certificate and state permit (for trucks / commercial loaders)",
    ],
  },
];

export default function DriverPartnerPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "Lucknow",
    vehicleCategory: "Mini Truck 750 kg (Tata Ace)",
    vehicleRegNumber: "",
    licenceNumber: "",
    yearsExperience: "1-3 years",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Indiery Driver Partner Application: ${formData.name} (${formData.vehicleCategory})`);
    const body = encodeURIComponent(
      `Applicant Name: ${formData.name}\n` +
      `Phone Number: ${formData.phone}\n` +
      `City: ${formData.city}\n` +
      `Vehicle Category: ${formData.vehicleCategory}\n` +
      `Vehicle Registration Number: ${formData.vehicleRegNumber}\n` +
      `Driving Licence Number: ${formData.licenceNumber}\n` +
      `Driving Experience: ${formData.yearsExperience}\n\n` +
      `Additional Notes:\n${formData.notes || "None"}`
    );
    window.location.href = `mailto:contact@indiery.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="innerHeader">
      <SiteHeader active="driver-partner" />

      <main>
        {/* Hero Section */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #064E3B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "center" }}>
              <div>
                <div className="tagPill" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#6EE7B7", border: "1px solid rgba(16, 185, 129, 0.4)", marginBottom: "20px" }}>
                  <i></i> DRIVER PARTNER PROGRAM · LUCKNOW
                </div>
                <h1 style={{ fontSize: "50px", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", color: "#FFFFFF" }}>
                  Drive With Indiery. <br />
                  <span style={{ color: "#34D399" }}>Grow Your Independent Transport Work</span>
                </h1>
                <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 32px", maxWidth: "680px" }}>
                  Join Indiery&apos;s network of verified independent drivers and transport providers in Lucknow. Attach your two-wheeler, loader, mini truck, or commercial vehicle and connect with customer and business orders.
                </p>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <a href="#apply" className="indiery-cta-btn" style={{ background: "#059669", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}>
                    Apply As Driver Partner
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.indeiry.driver"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="indiery-cta-btn"
                    style={{ background: "rgba(255,255,255,0.12)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.25)", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.6 1.7L15 13.1 3.6 24.5C3.2 24.1 3 23.5 3 22.8V3.4C3 2.7 3.2 2.1 3.6 1.7zM16.4 14.5L19.2 11.7C19.7 11.2 19.7 10.4 19.2 9.9L16.4 7.1 15 8.5 15 13.1 16.4 14.5zM4.3 0.6L16.1 7.4 13.8 9.7 4.3 0.6zM4.3 25.6L13.8 16.5 16.1 18.8 4.3 25.6z" />
                    </svg>
                    <span>Get Driver App on Play Store</span>
                  </a>
                </div>
              </div>

              {/* Driver Partner Vehicle Visual - Borderless Cutout */}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {/* Ambient Soft Emerald Glow */}
                <div style={{
                  position: "absolute",
                  width: "440px",
                  height: "360px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.05) 60%, transparent 80%)",
                  filter: "blur(40px)",
                  zIndex: 0,
                  pointerEvents: "none"
                }} />

                {/* Floating Top Badge */}
                <div style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  zIndex: 4,
                  background: "rgba(15, 23, 42, 0.88)",
                  backdropFilter: "blur(12px)",
                  color: "#FFFFFF",
                  padding: "8px 16px",
                  borderRadius: "30px",
                  fontSize: "12px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
                }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
                  <span>Attach 2-Wheeler, Loader or Mini Truck</span>
                </div>

                {/* Commercial Goods Carrier Cutout */}
                <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "480px", height: "320px" }}>
                  <Image
                    src="/assets/service-tempo-cutout.png"
                    alt="Indiery Independent Driver Partner Mini Truck"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 480px"
                    style={{ objectFit: "contain", filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.45))" }}
                  />
                </div>

                {/* Floating Bottom Left Badge */}
                <div style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "0",
                  zIndex: 4,
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid #D1FAE5",
                  padding: "9px 15px",
                  borderRadius: "14px",
                  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                    💰
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#0F172A" }}>Direct App Payouts</div>
                    <div style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>Zero Hidden Platform Cuts</div>
                  </div>
                </div>

                {/* Floating Bottom Right Badge */}
                <div style={{
                  position: "absolute",
                  bottom: "10px",
                  right: "0",
                  zIndex: 4,
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid #D1FAE5",
                  padding: "9px 15px",
                  borderRadius: "14px",
                  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                    📍
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#0F172A" }}>Lucknow Trade Orders</div>
                    <div style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>Devpur Rajajipuram Hub</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits of Joining */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#059669", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>GENUINE OPPORTUNITIES</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>Genuine Benefits For Partner Drivers</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                We believe in an honest partnership. Indiery offers platform access and trip opportunities without making exaggerated or guaranteed earnings claims.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              {partnerBenefits.map((benefit, idx) => (
                <div key={idx} style={{ background: "#F8FAFC", borderRadius: "16px", padding: "28px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "32px", marginBottom: "16px" }}>{benefit.icon}</div>
                  <h3 style={{ fontSize: "19px", fontWeight: "700", color: "#0F172A", margin: "0 0 10px" }}>{benefit.title}</h3>
                  <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.65", margin: 0 }}>
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#059669", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>ELIGIBILITY CHECKS</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>Partner Requirements &amp; Documents</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                To maintain trust and road safety, all driver partners and transport providers must fulfill verification requirements before receiving orders.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {partnerRequirements.map((req, idx) => (
                <div key={idx} style={{ background: "#FFFFFF", borderRadius: "16px", padding: "30px", border: "1px solid #E2E8F0" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A", margin: "0 0 18px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#059669" }}>✓</span> {req.category}
                  </h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                    {req.items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                        <span style={{ color: "#059669", fontWeight: "700", flexShrink: 0 }}>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Onboarding Process */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
              <span style={{ color: "#059669", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>ONBOARDING WORKFLOW</span>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>How The Onboarding Process Works</h2>
              <p style={{ color: "#64748B", fontSize: "16px", lineHeight: "1.6" }}>
                A structured 4-step process ensures legal compliance, document security, and proper training before you start driving.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
              <div style={{ padding: "26px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "14px" }}>1</div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>1. Submit Application</h3>
                <p style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.6", margin: 0 }}>
                  Fill out the form below or download the Driver App from Google Play Store to initiate your profile.
                </p>
              </div>

              <div style={{ padding: "26px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "14px" }}>2</div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>2. Document Upload &amp; KYC</h3>
                <p style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.6", margin: 0 }}>
                  Upload clear photos of your Driving Licence, Aadhaar, PAN, vehicle RC, and commercial insurance securely through the app.
                </p>
              </div>

              <div style={{ padding: "26px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "14px" }}>3</div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>3. Verification &amp; Review</h3>
                <p style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.6", margin: 0 }}>
                  Our team reviews document authenticity, vehicle fitness, and background information within 24 to 48 business hours.
                </p>
              </div>

              <div style={{ padding: "26px", borderRadius: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", marginBottom: "14px" }}>4</div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>4. Approval &amp; Go Online</h3>
                <p style={{ color: "#64748B", fontSize: "13.5px", lineHeight: "1.6", margin: 0 }}>
                  Once approved, your account is activated. Go online in Lucknow to begin receiving delivery requests and managing trips.
                </p>
              </div>
            </div>

            <div style={{ marginTop: "24px", padding: "16px 20px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "12px", color: "#92400E", fontSize: "14px", lineHeight: "1.6" }}>
              <strong>Notice Regarding Approvals:</strong> Submitting an application does not automatically guarantee onboarding or approval. Indiery reviews all documents in accordance with safety standards and regulatory guidelines. Documents are handled through our encrypted, secure onboarding protocol.
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section id="apply" className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "48px", border: "1px solid #E2E8F0", boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 36px" }}>
                <span style={{ color: "#059669", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>PARTNER APPLICATION</span>
                <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0F172A", margin: "8px 0 12px" }}>Apply To Join Indiery Network</h2>
                <p style={{ color: "#64748B", fontSize: "15px", lineHeight: "1.6" }}>
                  Provide your initial information below. Our partner onboarding desk in Lucknow will connect with you to complete verification.
                </p>
              </div>

              {submitted ? (
                <div style={{ textAlign: "center", padding: "40px", background: "#D1FAE5", borderRadius: "16px" }}>
                  <div style={{ fontSize: "42px", marginBottom: "12px" }}>✅</div>
                  <h3 style={{ color: "#065F46", fontSize: "22px", fontWeight: "800", margin: "0 0 8px" }}>Application Received</h3>
                  <p style={{ color: "#047857", fontSize: "15px", maxWidth: "540px", margin: "0 auto 20px" }}>
                    Thank you, {formData.name}. Your details have been drafted for submission to contact@indiery.com. You can also download the driver app directly to begin document upload.
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.indeiry.driver"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="indiery-cta-btn"
                      style={{ background: "#059669", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}
                    >
                      Download Driver App
                    </a>
                    <a href="tel:+919264926552" className="indiery-cta-btn" style={{ background: "#0F172A", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>
                      Partner Helpline: +91 92649 26552
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Driver / Partner Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="As per Aadhaar / Driving Licence"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Mobile Number (WhatsApp &amp; Calling) *
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
                      Operating City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Vehicle Category *
                    </label>
                    <select
                      value={formData.vehicleCategory}
                      onChange={(e) => setFormData({ ...formData, vehicleCategory: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px", background: "#fff" }}
                    >
                      <option value="Two-Wheeler (Bike - up to 20 kg)">Two-Wheeler (Bike - up to 20 kg)</option>
                      <option value="Mini Loader (up to 90 kg)">Mini Loader (up to 90 kg)</option>
                      <option value="Mini Truck 500 kg">Mini Truck 500 kg</option>
                      <option value="Mini Truck 750 kg (Tata Ace)">Mini Truck 750 kg (Tata Ace)</option>
                      <option value="Commercial Truck (1 Ton - 3 Ton)">Commercial Truck (1 Ton - 3 Ton)</option>
                      <option value="Heavy Commercial Truck / FTL Intercity">Heavy Commercial Truck / FTL Intercity</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Vehicle Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UP-32-AB-1234"
                      value={formData.vehicleRegNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleRegNumber: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Driving Licence Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Valid Driving Licence No."
                      value={formData.licenceNumber}
                      onChange={(e) => setFormData({ ...formData, licenceNumber: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#1E293B", marginBottom: "6px" }}>
                      Additional Details / Preferred Routes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Local area preferences in Lucknow, prior transport experience, or intercity availability..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14.5px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginTop: "10px" }}>
                    <div style={{ fontSize: "13px", color: "#64748B" }}>
                      Need Assistance? Call <a href="tel:+919264926552" style={{ color: "#059669", fontWeight: "700" }}>+91 92649 26552</a>
                    </div>
                    <button
                      type="submit"
                      className="indiery-cta-btn"
                      style={{ background: "#059669", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "15px" }}
                    >
                      Submit Application
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Driver App Download Callout */}
        <section className="section" style={{ padding: "60px 0", background: "#0F172A", color: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "30px" }}>
            <div>
              <span style={{ color: "#34D399", fontSize: "12px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>FOR APPROVED DRIVER PARTNERS</span>
              <h2 style={{ fontSize: "28px", fontWeight: "800", margin: "6px 0 10px", color: "#FFFFFF" }}>Download The Indiery Driver App</h2>
              <p style={{ color: "#94A3B8", fontSize: "15px", margin: 0, maxWidth: "560px" }}>
                Already registered or approved? Access the official Indiery Driver App on Google Play Store to accept orders, navigate trips, and manage payouts.
              </p>
            </div>
            <a
              href="https://play.google.com/store/apps/details?id=com.indeiry.driver"
              target="_blank"
              rel="noopener noreferrer"
              className="indiery-cta-btn"
              style={{ background: "#059669", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Get Driver App on Google Play
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
