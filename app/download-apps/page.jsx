"use client";

import Link from "next/link";
import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export default function DownloadAppsPage() {
  return (
    <div className="innerHeader">
      <SiteHeader active="home" />

      <main>
        {/* Hero Section */}
        <section className="aboutHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto" }}>
              <div className="tagPill" style={{ background: "rgba(124, 58, 237, 0.25)", color: "#C4B5FD", border: "1px solid rgba(139, 92, 246, 0.4)", marginBottom: "20px" }}>
                <i></i> OFFICIAL MOBILE APPS · GOOGLE PLAY STORE
              </div>
              <h1 style={{ fontSize: "50px", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", color: "#FFFFFF" }}>
                Download The <span style={{ color: "#A78BFA" }}>Indiery Apps</span>
              </h1>
              <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#E2E8F0", margin: "0 0 32px" }}>
                Whether you need to send goods across Lucknow or operate as a verified independent driver-partner, download our dedicated apps on the Google Play Store.
              </p>
            </div>
          </div>
        </section>

        {/* Two Separate App Download Cards */}
        <section className="section" style={{ padding: "80px 0", background: "#F8FAFC" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
              
              {/* App 1: Customer App */}
              <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "40px", border: "1px solid #E2E8F0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "24px" }}>
                  <div style={{ width: "70px", height: "70px", borderRadius: "18px", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", overflow: "hidden", flexShrink: 0, boxShadow: "0 8px 20px rgba(124, 58, 237, 0.3)" }}>
                    <Image
                      src="/indiery-app-icon.png"
                      alt="Indiery Customer App Icon"
                      width={70}
                      height={70}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <span style={{ display: "inline-block", background: "#EDE9FE", color: "#6D28D9", fontSize: "11.5px", fontWeight: "700", padding: "3px 10px", borderRadius: "12px", textTransform: "uppercase", marginBottom: "4px" }}>
                      For Individuals &amp; Businesses
                    </span>
                    <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#0F172A", margin: 0 }}>
                      Indiery Customer App
                    </h2>
                  </div>
                </div>

                <div style={{ position: "relative", height: "180px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F3FF", borderRadius: "16px", border: "1px solid #EDE9FE" }}>
                  <Image
                    src="/mobile-final.png"
                    alt="Indiery Customer App Interface"
                    width={140}
                    height={170}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 10px 20px rgba(124, 58, 237, 0.25))" }}
                  />
                </div>

                <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.7", marginBottom: "20px" }}>
                  The Indiery Customer App is built for individuals, retailers, and businesses who want to explore available vehicle services, estimate transparent fares, and book on-demand goods deliveries across Lucknow.
                </p>

                <div style={{ background: "#F8FAFC", borderRadius: "14px", padding: "20px", marginBottom: "28px", border: "1px solid #E2E8F0" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    What You Can Do In The Customer App:
                  </h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#334155" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span>
                      <span>Book Two-Wheelers (up to 20 kg) &amp; Loaders (up to 90 kg)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span>
                      <span>Hire 500 kg &amp; 750 kg Mini Trucks (Tata Ace)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span>
                      <span>100% Upfront transparent distance-based fares</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span>
                      <span>Live GPS tracking from pickup to doorstep</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#7C3AED", fontWeight: "800" }}>✓</span>
                      <span>OTP verification &amp; Indiery digital wallet</span>
                    </li>
                  </ul>
                </div>

                <div style={{ marginTop: "auto" }}>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.indeiry"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="indiery-cta-btn"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", background: "#7C3AED", color: "#fff", padding: "16px 24px", borderRadius: "12px", fontWeight: "700", textDecoration: "none", fontSize: "16px", boxShadow: "0 6px 20px rgba(124, 58, 237, 0.35)" }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.6 1.7L15 13.1 3.6 24.5C3.2 24.1 3 23.5 3 22.8V3.4C3 2.7 3.2 2.1 3.6 1.7zM16.4 14.5L19.2 11.7C19.7 11.2 19.7 10.4 19.2 9.9L16.4 7.1 15 8.5 15 13.1 16.4 14.5zM4.3 0.6L16.1 7.4 13.8 9.7 4.3 0.6zM4.3 25.6L13.8 16.5 16.1 18.8 4.3 25.6z" />
                    </svg>
                    <span>Download Indiery Customer App</span>
                  </a>
                  <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "#64748B" }}>
                    Package: <code>com.indeiry</code> · Requires Android 7.0+
                  </div>
                </div>
              </div>

              {/* App 2: Driver App */}
              <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "40px", border: "1px solid #E2E8F0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "24px" }}>
                  <div style={{ width: "70px", height: "70px", borderRadius: "18px", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", overflow: "hidden", flexShrink: 0, boxShadow: "0 8px 20px rgba(5, 150, 105, 0.3)" }}>
                    <Image
                      src="/indiery-app-icon.png"
                      alt="Indiery Driver App Icon"
                      width={70}
                      height={70}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <span style={{ display: "inline-block", background: "#D1FAE5", color: "#065F46", fontSize: "11.5px", fontWeight: "700", padding: "3px 10px", borderRadius: "12px", textTransform: "uppercase", marginBottom: "4px" }}>
                      For Approved Driver Partners
                    </span>
                    <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#0F172A", margin: 0 }}>
                      Indiery Driver App
                    </h2>
                  </div>
                </div>

                <div style={{ position: "relative", height: "180px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", background: "#ECFDF5", borderRadius: "16px", border: "1px solid #D1FAE5" }}>
                  <Image
                    src="/about_img01_purple.png"
                    alt="Indiery Driver App Interface"
                    width={240}
                    height={160}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 10px 20px rgba(5, 150, 105, 0.25))" }}
                  />
                </div>

                <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.7", marginBottom: "20px" }}>
                  The Indiery Driver App is dedicated to approved independent driver-partners and transport operators using Indiery’s platform workflows to receive nearby delivery opportunities and manage trip progress.
                </p>

                <div style={{ background: "#F8FAFC", borderRadius: "14px", padding: "20px", marginBottom: "28px", border: "1px solid #E2E8F0" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    What Approved Partners Can Do In The Driver App:
                  </h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#334155" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#059669", fontWeight: "800" }}>✓</span>
                      <span>Go Online / Offline whenever you want with full flexibility</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#059669", fontWeight: "800" }}>✓</span>
                      <span>Receive real-time trip alerts with transparent route details</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#059669", fontWeight: "800" }}>✓</span>
                      <span>Turn-by-turn pickup and drop navigation via Google Maps</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#059669", fontWeight: "800" }}>✓</span>
                      <span>Secure delivery verification via OTP &amp; photo upload</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#059669", fontWeight: "800" }}>✓</span>
                      <span>Track settled daily and weekly earnings in partner wallet</span>
                    </li>
                  </ul>
                </div>

                <div style={{ marginTop: "auto" }}>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.indeiry.driver"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="indiery-cta-btn"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", background: "#059669", color: "#fff", padding: "16px 24px", borderRadius: "12px", fontWeight: "700", textDecoration: "none", fontSize: "16px", boxShadow: "0 6px 20px rgba(5, 150, 105, 0.35)" }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.6 1.7L15 13.1 3.6 24.5C3.2 24.1 3 23.5 3 22.8V3.4C3 2.7 3.2 2.1 3.6 1.7zM16.4 14.5L19.2 11.7C19.7 11.2 19.7 10.4 19.2 9.9L16.4 7.1 15 8.5 15 13.1 16.4 14.5zM4.3 0.6L16.1 7.4 13.8 9.7 4.3 0.6zM4.3 25.6L13.8 16.5 16.1 18.8 4.3 25.6z" />
                    </svg>
                    <span>Download Indiery Driver App</span>
                  </a>
                  <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "#64748B" }}>
                    Package: <code>com.indeiry.driver</code> · Requires Verified KYC Account
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Operating Notice */}
        <section className="section" style={{ padding: "40px 0 80px", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "860px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", marginBottom: "12px" }}>
              Starting in Lucknow, Uttar Pradesh
            </h3>
            <p style={{ color: "#64748B", fontSize: "15px", lineHeight: "1.7", margin: "0 0 20px" }}>
              Indiery is actively serving individual customers, merchants, and independent drivers across Lucknow. If you have any questions regarding app setup, compatibility, or partner onboarding, contact our support team.
            </p>
            <div style={{ display: "flex", gap: "18px", justifyContent: "center", flexWrap: "wrap", fontSize: "14px" }}>
              <span>Phone: <a href="tel:+919264926552" style={{ color: "#7C3AED", fontWeight: "700" }}>+91 92649 26552</a></span>
              <span>•</span>
              <span>Email: <a href="mailto:contact@indiery.com" style={{ color: "#7C3AED", fontWeight: "700" }}>contact@indiery.com</a></span>
              <span>•</span>
              <span>Address: <span style={{ color: "#0F172A", fontWeight: "600" }}>Devpur, Rajajipuram, Lucknow</span></span>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
