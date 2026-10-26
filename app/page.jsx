"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "./home.module.css";

const vehicleOptions = [
  { id: "bike", name: "Bike (2 Wheeler)", emoji: "🛵", base: 40, ratePerKm: 10, capacity: "Up to 20 kg", eta: "5-10 min", desc: "Small parcels & lightweight goods" },
  { id: "loader", name: "Mini Loader", emoji: "🛺", base: 75, ratePerKm: 13, capacity: "Up to 90 kg", eta: "10-15 min", desc: "Cartons, boxes & medium loads" },
  { id: "mini500", name: "Mini Truck 500 kg", emoji: "🚚", base: 200, ratePerKm: 20, capacity: "Up to 500 kg", eta: "15-20 min", desc: "Appliances, inventory & shop stock" },
  { id: "mini750", name: "Mini Truck 750 kg (Ace)", emoji: "🚛", base: 300, ratePerKm: 30, capacity: "Up to 750 kg", eta: "15-25 min", desc: "Heavy commercial goods & bulk trade" },
];

const lucknowAreas = [
  "Hazratganj",
  "Gomti Nagar",
  "Alambagh",
  "Indira Nagar",
  "Charbagh",
  "Rajajipuram",
  "Transport Nagar",
  "Chowk",
];

export default function Home() {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleOptions[0]);
  const [pickup, setPickup] = useState("Hazratganj, Lucknow");
  const [dropoff, setDropoff] = useState("Gomti Nagar, Lucknow");
  const [estimatedKm, setEstimatedKm] = useState(8.5);

  const calculatedFare = Math.round(selectedVehicle.base + (estimatedKm * selectedVehicle.ratePerKm));
  const gstAmount = Math.round(calculatedFare * 0.05);
  const totalFare = calculatedFare + gstAmount;

  return (
    <div className={styles.page}>
      {/* 01 - Header */}
      <SiteHeader active="home" />

      <main>
        {/* =================================================================
            HERO SECTION: ABOUT INDIERY & 3 CLEAR VISITOR PATHWAYS
            ================================================================= */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <div className={styles.eyebrowBadge}>
                <span className={styles.pulseDot} />
                LOGISTICS PLATFORM · STARTING IN LUCKNOW
              </div>

              <h1 className={styles.heroTitle}>
                Technology-Driven Logistics For <br />
                <span className={styles.heroTitleHighlight}>Individuals &amp; Businesses</span>
              </h1>

              <p className={styles.heroDescription}>
                Indiery connects individuals and businesses with independent drivers and transport partners for goods transportation—starting in Lucknow with dependable local deliveries and intercity logistics.
              </p>

              {/* 3 Clear Pathways Banner */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "10px 0 20px" }}>
                <Link href="#for-individuals" style={{ background: "#F5F3FF", border: "1px solid #EDE9FE", borderRadius: "12px", padding: "14px 16px", textDecoration: "none", display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "20px", marginBottom: "4px" }}>👤</span>
                  <span style={{ color: "#7C3AED", fontWeight: "700", fontSize: "14px" }}>For Individuals</span>
                  <span style={{ color: "#64748B", fontSize: "12px", marginTop: "2px" }}>Book on-demand via app</span>
                </Link>

                <Link href="#for-businesses" style={{ background: "#F5F3FF", border: "1px solid #EDE9FE", borderRadius: "12px", padding: "14px 16px", textDecoration: "none", display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "20px", marginBottom: "4px" }}>🏢</span>
                  <span style={{ color: "#7C3AED", fontWeight: "700", fontSize: "14px" }}>For Businesses</span>
                  <span style={{ color: "#64748B", fontSize: "12px", marginTop: "2px" }}>Local &amp; intercity transport</span>
                </Link>

                <Link href="#driver-partners" style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: "12px", padding: "14px 16px", textDecoration: "none", display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "20px", marginBottom: "4px" }}>🚚</span>
                  <span style={{ color: "#059669", fontWeight: "700", fontSize: "14px" }}>Driver Partners</span>
                  <span style={{ color: "#065F46", fontSize: "12px", marginTop: "2px" }}>Join independent network</span>
                </Link>
              </div>

              <div className={styles.heroActions}>
                <Link href="/download-apps" className={styles.primaryBtn}>
                  <span>Download Customer App</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </Link>

                <Link href="/for-business" className={styles.secondaryBtn}>
                  <span>Become a Business Partner</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className={styles.heroTrustBar}>
                <span className={styles.trustItem}>
                  <span className={styles.trustIcon}>✓</span> Local Delivery (Bike &amp; Loader)
                </span>
                <span className={styles.trustItem}>
                  <span className={styles.trustIcon}>✓</span> Goods Transport (500kg &amp; 750kg)
                </span>
                <span className={styles.trustItem}>
                  <span className={styles.trustIcon}>✓</span> Intercity Logistics (FTL)
                </span>
              </div>
            </div>

            {/* Right: Hero PNG Visual Showcase */}
            <div style={{ position: "relative" }}>
              <div style={{
                position: "relative",
                background: "linear-gradient(145deg, #F5F3FF 0%, #FFFFFF 100%)",
                borderRadius: "28px",
                border: "1px solid #EDE9FE",
                padding: "20px",
                boxShadow: "0 24px 60px rgba(124, 58, 237, 0.12)",
                overflow: "hidden"
              }}>
                {/* Floating Top Badge */}
                <div style={{
                  position: "absolute",
                  top: "32px",
                  left: "32px",
                  zIndex: 3,
                  background: "rgba(15, 23, 42, 0.88)",
                  backdropFilter: "blur(10px)",
                  color: "#FFFFFF",
                  padding: "8px 16px",
                  borderRadius: "30px",
                  fontSize: "12px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
                }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
                  <span>On-Demand Lucknow Logistics · 15-20 Min Pickup</span>
                </div>

                {/* Main Hero PNG Fleet Image */}
                <div style={{ position: "relative", width: "100%", height: "360px", borderRadius: "20px", overflow: "hidden", background: "#FAF5FF" }}>
                  <Image
                    src="/banner_img01_indiery.png"
                    alt="Indiery On-Demand Goods Delivery Fleet in Lucknow"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 600px"
                    style={{ objectFit: "cover" }}
                  />
                </div>

                {/* Floating Bottom Left Badge */}
                <div style={{
                  position: "absolute",
                  bottom: "100px",
                  left: "32px",
                  zIndex: 3,
                  background: "#FFFFFF",
                  border: "1px solid #EDE9FE",
                  padding: "10px 16px",
                  borderRadius: "14px",
                  boxShadow: "0 12px 30px rgba(124, 58, 237, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    🛡️
                  </div>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#0F172A" }}>Verified Driver Partners</div>
                    <div style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>KYC &amp; Commercial Fleet</div>
                  </div>
                </div>

                {/* Floating Bottom Right Badge */}
                <div style={{
                  position: "absolute",
                  bottom: "100px",
                  right: "32px",
                  zIndex: 3,
                  background: "#FFFFFF",
                  border: "1px solid #EDE9FE",
                  padding: "10px 16px",
                  borderRadius: "14px",
                  boxShadow: "0 12px 30px rgba(124, 58, 237, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    📍
                  </div>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#0F172A" }}>Starting in Lucknow</div>
                    <div style={{ fontSize: "11px", color: "#7C3AED", fontWeight: "700" }}>Devpur, Rajajipuram Hub</div>
                  </div>
                </div>

                {/* Micro Highlights Pill Bar */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid #F1F5F9"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "18px" }}>🛵</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#0F172A" }}>Bike &amp; Loader</div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>20 kg to 90 kg</div>
                  </div>
                  <div style={{ textAlign: "center", borderLeft: "1px solid #F1F5F9", borderRight: "1px solid #F1F5F9" }}>
                    <div style={{ fontSize: "18px" }}>🚚</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#0F172A" }}>Mini Trucks</div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>500 kg &amp; 750 kg</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "18px" }}>🛣️</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#0F172A" }}>Intercity FTL</div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>Full Truck Load</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            02 - OUR SERVICES
            Show three service categories: Local Deliveries, Goods Transport,
            and Intercity Logistics. Include link to Explore Intercity Services.
            ================================================================= */}
        <section className={styles.servicesSection} id="services">
          <div className={styles.servicesInner}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <p className={styles.sectionEyebrow}>02 · OUR SERVICES</p>
                <h2 className={styles.sectionTitle}>Three Logistics Categories Built For Your Goods</h2>
              </div>
              <Link href="/services" className={styles.viewAllLink}>
                <span>View All Services</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className={styles.serviceGrid}>
              {/* Category 1: Local Deliveries */}
              <div className={styles.serviceCard} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div className={styles.serviceIconTop}>🛵</div>
                  <span className={styles.serviceTag}>Category 1 · Intra-City</span>
                </div>
                <div style={{ position: "relative", height: "140px", margin: "6px 0 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image
                    src="/assets/service-bike-cutout.png"
                    alt="Indiery Local Bike and Loader Delivery"
                    width={220}
                    height={130}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(124, 58, 237, 0.16))" }}
                  />
                </div>
                <h3 className={styles.serviceCardTitle}>Local Deliveries</h3>
                <p className={styles.serviceCardText}>
                  On-demand intra-city delivery across Lucknow for documents, small parcels, retail packages, and daily goods.
                </p>
                <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "12px", margin: "10px 0 16px", fontSize: "13px", color: "#334155" }}>
                  <div style={{ marginBottom: "6px" }}>• <strong>Bike Delivery:</strong> Up to 20 kg lightweight goods</div>
                  <div>• <strong>Loader Delivery:</strong> Up to 90 kg carton loads</div>
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #F1F5F9", paddingTop: "14px" }}>
                  <Link href="/services#local" style={{ color: "#7C3AED", fontWeight: "700", fontSize: "13.5px", textDecoration: "none" }}>
                    Explore Local Deliveries →
                  </Link>
                </div>
              </div>

              {/* Category 2: Goods Transport */}
              <div className={styles.serviceCard} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div className={styles.serviceIconTop}>🛺</div>
                  <span className={styles.serviceTag}>Category 2 · Commercial Cargo</span>
                </div>
                <div style={{ position: "relative", height: "140px", margin: "6px 0 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image
                    src="/assets/service-tempo-cutout.png"
                    alt="Indiery 500kg and 750kg Mini Truck Goods Transport"
                    width={220}
                    height={130}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(15, 23, 42, 0.16))" }}
                  />
                </div>
                <h3 className={styles.serviceCardTitle}>Goods Transport</h3>
                <p className={styles.serviceCardText}>
                  Reliable transport for heavy cargo, shop inventory, appliances, and commercial shipments across town.
                </p>
                <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "12px", margin: "10px 0 16px", fontSize: "13px", color: "#334155" }}>
                  <div style={{ marginBottom: "6px" }}>• <strong>500 kg Mini Truck:</strong> Compact market delivery</div>
                  <div style={{ marginBottom: "6px" }}>• <strong>750 kg Mini Truck:</strong> Tata Ace &amp; commercial payload</div>
                  <div>• <strong>Larger Trucks:</strong> Through partner network</div>
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #F1F5F9", paddingTop: "14px" }}>
                  <Link href="/services#goods" style={{ color: "#7C3AED", fontWeight: "700", fontSize: "13.5px", textDecoration: "none" }}>
                    Explore Goods Transport →
                  </Link>
                </div>
              </div>

              {/* Category 3: Intercity Logistics */}
              <div className={styles.serviceCard} style={{ display: "flex", flexDirection: "column", background: "#FAF5FF", borderColor: "#EDE9FE" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div className={styles.serviceIconTop}>🚚</div>
                  <span className={styles.serviceTag} style={{ background: "#EDE9FE", color: "#6D28D9" }}>Category 3 · Full Truck Load</span>
                </div>
                <div style={{ position: "relative", height: "140px", margin: "6px 0 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image
                    src="/assets/service-moving-truck-cutout.png"
                    alt="Indiery Intercity Logistics Commercial Trucks"
                    width={230}
                    height={130}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(124, 58, 237, 0.18))" }}
                  />
                </div>
                <h3 className={styles.serviceCardTitle}>Intercity Logistics</h3>
                <p className={styles.serviceCardText}>
                  Goods transportation between cities through Indiery’s network of verified independent transport partners.
                </p>
                <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "12px", margin: "10px 0 16px", fontSize: "13px", color: "#334155", border: "1px solid #EDE9FE" }}>
                  <div style={{ marginBottom: "6px" }}>• <strong>Full Truck Load (FTL):</strong> Dedicated vehicles</div>
                  <div style={{ marginBottom: "6px" }}>• <strong>Active Corridors:</strong> Lucknow to Kanpur, Ayodhya, Varanasi &amp; more</div>
                  <div>• <strong>Transparent Process:</strong> Verified partner matching</div>
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #EDE9FE", paddingTop: "14px" }}>
                  <Link href="/intercity" style={{ color: "#7C3AED", fontWeight: "800", fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>Explore Intercity Services</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            INSTANT FARE ESTIMATE & LUCKNOW BOOKING (BOOK OPTION MOVED DOWN)
            ================================================================= */}
        <section id="fare-estimator" className="section" style={{ padding: "80px 0", background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FF 50%, #FFFFFF 100%)", borderTop: "1px solid #EDE9FE", borderBottom: "1px solid #EDE9FE" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: "48px", alignItems: "center" }}>
              <div>
                <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                  UPFRONT TRANSPARENT PRICING
                </span>
                <h2 style={{ fontSize: "38px", fontWeight: "800", color: "#0F172A", margin: "8px 0 18px", lineHeight: "1.2" }}>
                  Estimate Lucknow Delivery Fare &amp; Book Instantly
                </h2>
                <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.75", marginBottom: "24px" }}>
                  Check your estimated intra-city goods transportation rate before confirming. With Indiery, you get clear upfront pricing based strictly on vehicle type and trip distance—no surge pricing, no haggling, and verified independent driver partners.
                </p>

                <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px", border: "1px solid #E2E8F0", marginBottom: "24px", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "120px", flexShrink: 0 }}>
                      <Image
                        src="/assets/service-business-truck-cutout.png"
                        alt="Indiery Transport Network"
                        width={120}
                        height={80}
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A" }}>100% Upfront Distance Fares</div>
                      <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                        Base fare + per-km rate + 5% GST. No sudden rate hikes at destination.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#334155" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#059669", fontWeight: "800", fontSize: "16px" }}>✓</span>
                    <span>Doorstep pickup anywhere across Lucknow (Hazratganj, Gomti Nagar, Alambagh &amp; 13+ areas)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#059669", fontWeight: "800", fontSize: "16px" }}>✓</span>
                    <span>Live GPS route tracking &amp; secure delivery OTP verification on recipient&apos;s phone</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#059669", fontWeight: "800", fontSize: "16px" }}>✓</span>
                    <span>Instant booking through the Indiery Customer App on Google Play</span>
                  </div>
                </div>
              </div>

              {/* Right: The Interactive Fare Calculator */}
              <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E2E8F0", padding: "32px", boxShadow: "0 20px 48px rgba(124, 58, 237, 0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <span style={{ color: "#7C3AED", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>LUCKNOW FARE CALCULATOR</span>
                    <h3 style={{ margin: "2px 0 0", color: "#0F172A", fontSize: "20px", fontWeight: "800" }}>Calculate Delivery Fare</h3>
                  </div>
                  <span style={{ background: "#EDE9FE", color: "#7C3AED", fontSize: "12px", fontWeight: "700", padding: "5px 12px", borderRadius: "14px" }}>
                    Lucknow Active
                  </span>
                </div>

                {/* Vehicle Pills */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
                  {vehicleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedVehicle(opt)}
                      style={{
                        background: selectedVehicle.id === opt.id ? "#7C3AED" : "#F8FAFC",
                        color: selectedVehicle.id === opt.id ? "#FFFFFF" : "#1E293B",
                        border: selectedVehicle.id === opt.id ? "1px solid #7C3AED" : "1px solid #E2E8F0",
                        borderRadius: "12px",
                        padding: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontSize: "20px", marginBottom: "3px" }}>{opt.emoji}</div>
                      <div style={{ fontSize: "13.5px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opt.name}</div>
                      <div style={{ fontSize: "11.5px", opacity: selectedVehicle.id === opt.id ? 0.9 : 0.7 }}>{opt.capacity}</div>
                    </button>
                  ))}
                </div>

                {/* Locations */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748B", marginBottom: "4px" }}>PICKUP POINT (LUCKNOW)</label>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748B", marginBottom: "4px" }}>DROP-OFF POINT (LUCKNOW)</label>
                    <input
                      type="text"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                    />
                  </div>
                </div>

                {/* Quick Area Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
                  {lucknowAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setDropoff(`${area}, Lucknow`)}
                      style={{ background: "#F1F5F9", border: "none", borderRadius: "14px", padding: "5px 10px", fontSize: "11.5px", color: "#475569", cursor: "pointer", fontWeight: "600" }}
                    >
                      {area}
                    </button>
                  ))}
                </div>

                {/* Distance Slider */}
                <div style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                    <span>Estimated Distance:</span>
                    <span style={{ color: "#7C3AED", fontWeight: "800", fontSize: "14px" }}>{estimatedKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    step="0.5"
                    value={estimatedKm}
                    onChange={(e) => setEstimatedKm(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
                  />
                </div>

                {/* Fare Result */}
                <div style={{ background: "#F8FAFC", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0", marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "12px", color: "#64748B", textTransform: "uppercase", fontWeight: "800" }}>Estimated Total Fare</span>
                    <span style={{ fontSize: "28px", fontWeight: "900", color: "#0F172A" }}>₹{totalFare}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "6px" }}>
                    Base rate ₹{selectedVehicle.base} + ₹{Math.round(estimatedKm * selectedVehicle.ratePerKm)} ({estimatedKm} km @ ₹{selectedVehicle.ratePerKm}/km) + GST ₹{gstAmount}
                  </div>
                </div>

                <Link
                  href="/download-apps"
                  className="indiery-cta-btn"
                  style={{ width: "100%", justifyContent: "center", background: "#7C3AED", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: "800", textDecoration: "none", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span>Book On Customer App</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            03 - FOR INDIVIDUALS
            Customers discover services, understand vehicle options, book via app.
            ================================================================= */}
        <section id="for-individuals" className="section" style={{ padding: "80px 0", background: "#FFFFFF", borderTop: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "48px", alignItems: "center" }}>
              <div>
                <p className={styles.sectionEyebrow}>03 · FOR INDIVIDUALS</p>
                <h2 className={styles.sectionTitle}>
                  Discover Services, Pick A Vehicle &amp; Book In Minutes
                </h2>
                <p className={styles.sectionText}>
                  Whether you are sending an urgent parcel to a friend, transporting a new household appliance, or shifting items across Lucknow, the <strong>Indiery Customer App</strong> gives you transparent upfront rates, live GPS tracking, and verified independent driver partners.
                </p>

                <div className={styles.checklistGrid} style={{ margin: "24px 0 32px" }}>
                  <div className={styles.checklistItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Bike &amp; Loader Options (20 kg - 90 kg)</span>
                  </div>
                  <div className={styles.checklistItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>500 kg &amp; 750 kg Mini Trucks On-Demand</span>
                  </div>
                  <div className={styles.checklistItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>100% Upfront Distance-Based Fares</span>
                  </div>
                  <div className={styles.checklistItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Live Trip Tracking &amp; Secure OTP Delivery</span>
                  </div>
                </div>

                <Link
                  href="/download-apps"
                  className={styles.primaryBtn}
                  style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <span>Download Customer App</span>
                </Link>
              </div>

              <div style={{ position: "relative", minHeight: "440px", borderRadius: "24px", overflow: "hidden", background: "linear-gradient(145deg, #F5F3FF 0%, #EDE9FE 100%)", border: "1px solid #DDD6FE", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
                <Image
                  src="/mobile-final.png"
                  alt="Indiery Customer App On-Demand Booking Screen"
                  width={320}
                  height={420}
                  style={{ objectFit: "contain", filter: "drop-shadow(0 20px 40px rgba(124, 58, 237, 0.25))" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            04 - FOR BUSINESSES
            Local and intercity transport options, discuss requirements.
            ================================================================= */}
        <section id="for-businesses" className="section" style={{ padding: "80px 0", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "48px", alignItems: "center" }}>
              <div style={{ position: "relative", minHeight: "380px", borderRadius: "24px", overflow: "hidden", background: "#EDE9FE" }}>
                <Image
                  src="/assets/service-business-v2.png"
                  alt="Indiery Business Logistics Partnerships"
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 768px) 100vw, 550px"
                />
              </div>

              <div>
                <p className={styles.sectionEyebrow}>04 · FOR BUSINESSES</p>
                <h2 className={styles.sectionTitle}>
                  Local &amp; Intercity Transportation For Business Needs
                </h2>
                <p className={styles.sectionText}>
                  Retailers, wholesalers, distributors, e-commerce brands, and manufacturers can explore flexible goods transportation with Indiery. We connect your dispatch operations with dependable independent drivers and transport providers across Lucknow and regional trade routes.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "24px 0 32px" }}>
                  <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#7C3AED", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>Intra-City Distribution</div>
                    <div style={{ color: "#64748B", fontSize: "13px" }}>Bikes, loaders, and mini trucks for same-day store replenishment.</div>
                  </div>
                  <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#7C3AED", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>Intercity Full Truck Load</div>
                    <div style={{ color: "#64748B", fontSize: "13px" }}>Dedicated commercial trucks connecting key UP trade corridors.</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <Link href="/for-business" className={styles.primaryBtn}>
                    <span>Become a Business Partner</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <a href="https://wa.me/919264926552?text=Hello%20Indiery,%20I%20want%20to%20discuss%20logistics%20for%20my%20business" target="_blank" rel="noopener noreferrer" className={styles.secondaryBtn}>
                    <span>Discuss Requirements</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            06 - WHY INDIERY
            4 Required Pillars:
            - Multiple Vehicle Options
            - Technology-Driven
            - Business Partnerships
            - Coordination & Support
            ================================================================= */}
        <section className={styles.whyChooseSection}>
          <div className={styles.whyChooseInner}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 48px" }}>
              <p className={styles.sectionEyebrow}>06 · WHY INDIERY</p>
              <h2 className={styles.sectionTitle}>Built For Organized, Technology-Driven Logistics</h2>
              <p className={styles.sectionText}>
                We aim to make goods movement accessible, organized, and convenient while building trusted relationships with customers, businesses, and transport providers.
              </p>
            </div>

            <div className={styles.featureCardsGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🚚</div>
                <h3 className={styles.featureTitle}>Multiple Vehicle Options</h3>
                <p className={styles.featureDesc}>
                  Suitable transport for different goods—from 20 kg bike parcels and 90 kg loaders to 500 kg/750 kg mini trucks and intercity full truck loads.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📱</div>
                <h3 className={styles.featureTitle}>Technology-Driven</h3>
                <p className={styles.featureDesc}>
                  Dedicated Customer and Driver applications for upfront fare transparency, seamless order placement, OTP security, and live route tracking.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🤝</div>
                <h3 className={styles.featureTitle}>Business Partnerships</h3>
                <p className={styles.featureDesc}>
                  Tailored logistics options for commercial needs, recurring dispatch schedules, godown-to-retail stock transfers, and regional trade routes.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📞</div>
                <h3 className={styles.featureTitle}>Coordination &amp; Support</h3>
                <p className={styles.featureDesc}>
                  Responsive local support for delivery-related enquiries, trip coordination, partner assistance, and clear communication throughout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            07 - DRIVER PARTNERS
            Independent drivers and transport providers join network.
            App link: Become a Driver Partner.
            ================================================================= */}
        <section id="driver-partners" className="section" style={{ padding: "80px 0", background: "#0F172A", color: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "48px", alignItems: "center" }}>
              <div>
                <span style={{ color: "#34D399", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>07 · DRIVER PARTNERS</span>
                <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#FFFFFF", margin: "10px 0 16px" }}>
                  Join Indiery&apos;s Independent Transport Network
                </h2>
                <p style={{ color: "#94A3B8", fontSize: "16px", lineHeight: "1.75", marginBottom: "20px" }}>
                  Independent drivers and transport providers can attach their two-wheelers, loaders, mini trucks (Tata Ace), and commercial vehicles to Indiery’s network in Lucknow.
                </p>
                <p style={{ color: "#94A3B8", fontSize: "16px", lineHeight: "1.75", marginBottom: "28px" }}>
                  Enjoy the flexibility to go online whenever you choose, accept nearby customer and business trips, and receive transparent platform payouts through the Indiery Driver App.
                </p>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    href="/driver-partner"
                    className="indiery-cta-btn"
                    style={{ background: "#059669", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}
                  >
                    <span>Become a Driver Partner</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <a
                    href="https://play.google.com/store/apps/details?id=com.indeiry.driver"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="indiery-cta-btn"
                    style={{ background: "rgba(255,255,255,0.12)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", padding: "14px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}
                  >
                    <span>Download Driver App</span>
                  </a>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "32px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ position: "relative", height: "140px", marginBottom: "16px", borderRadius: "14px", overflow: "hidden", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image
                    src="/about_img01_purple.png"
                    alt="Indiery Independent Driver Partners Network"
                    width={320}
                    height={130}
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#FFFFFF", marginBottom: "16px" }}>Why Drive With Indiery:</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "14px", fontSize: "14.5px", color: "#CBD5E1" }}>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ color: "#34D399", fontWeight: "800" }}>✓</span>
                    <span>100% Independent working: Choose your daily hours and routes.</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ color: "#34D399", fontWeight: "800" }}>✓</span>
                    <span>Direct trip offers on the Driver App with upfront pickup and drop points.</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ color: "#34D399", fontWeight: "800" }}>✓</span>
                    <span>Straightforward document onboarding and transparent platform settlements.</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ color: "#34D399", fontWeight: "800" }}>✓</span>
                    <span>Dedicated local operations support based in Lucknow.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            08 - SERVICE COVERAGE
            Heading: "Starting in Lucknow".
            Explain local area and accurate information on intercity services.
            ================================================================= */}
        <section className="section" style={{ padding: "80px 0", background: "#FFFFFF", borderTop: "1px solid #E2E8F0" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 40px" }}>
              <span style={{ color: "#7C3AED", fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>08 · SERVICE COVERAGE</span>
              <h2 style={{ fontSize: "38px", fontWeight: "800", color: "#0F172A", margin: "10px 0 16px" }}>Starting in Lucknow</h2>
              <p style={{ color: "#475569", fontSize: "16px", lineHeight: "1.7" }}>
                Indiery’s initial local operating area covers all major residential, commercial, and industrial zones across Lucknow, complemented by active intercity trade corridors.
              </p>
            </div>

            {/* Visual Coverage Map Banner */}
            <div style={{ position: "relative", height: "180px", borderRadius: "20px", overflow: "hidden", marginBottom: "36px", border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}>
              <Image
                src="/assets/indiery-real-map.jpg"
                alt="Indiery Lucknow Operating Area Map"
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 1240px) 100vw, 1200px"
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.88) 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", color: "#fff" }}>
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#34D399", textTransform: "uppercase", letterSpacing: "1px" }}>CENTRAL UTTAR PRADESH LOGISTICS</div>
                  <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "4px" }}>Lucknow Metro + Active Regional Trade Corridors</div>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(255,255,255,0.18)", padding: "8px 16px", borderRadius: "20px", fontSize: "12.5px", fontWeight: "700" }}>📍 16+ Local Hubs</span>
                  <span style={{ background: "rgba(124,58,237,0.8)", padding: "8px 16px", borderRadius: "20px", fontSize: "12.5px", fontWeight: "700" }}>🛣️ Daily Kanpur / Ayodhya FTL</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
              {/* Local Lucknow Coverage */}
              <div style={{ background: "#F8FAFC", borderRadius: "20px", padding: "34px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "24px" }}>📍</span>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", margin: 0 }}>Local Operating Area: Lucknow</h3>
                </div>
                <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.65", marginBottom: "18px" }}>
                  On-demand bikes, loaders, and mini trucks operate across Lucknow municipality, covering key commercial centers, transit points, and residential neighborhoods:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {[
                    "Hazratganj", "Gomti Nagar", "Alambagh", "Indira Nagar",
                    "Charbagh", "Rajajipuram", "Transport Nagar", "Chowk",
                    "Aminabad", "Mahanagar", "Vikas Nagar", "Ashiyana",
                    "Sarojini Nagar", "Chinhat", "Jankipuram", "Dubagga"
                  ].map((zone) => (
                    <span key={zone} style={{ background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "8px", padding: "6px 12px", fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>
                      {zone}
                    </span>
                  ))}
                </div>
              </div>

              {/* Intercity Services Coverage */}
              <div style={{ background: "#F8FAFC", borderRadius: "20px", padding: "34px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "24px" }}>🛣️</span>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", margin: 0 }}>Available Intercity Logistics</h3>
                </div>
                <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.65", marginBottom: "18px" }}>
                  Accurate full truck load (FTL) transportation coordinated between Lucknow and major commercial trade destinations through our transport partner network:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <span><strong>Lucknow ↔ Kanpur</strong> (~80 km)</span>
                    <span style={{ color: "#7C3AED", fontWeight: "700" }}>Daily Active Route</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <span><strong>Lucknow ↔ Ayodhya</strong> (~135 km)</span>
                    <span style={{ color: "#7C3AED", fontWeight: "700" }}>Daily Active Route</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <span><strong>Lucknow ↔ Prayagraj / Varanasi</strong></span>
                    <span style={{ color: "#7C3AED", fontWeight: "700" }}>Regular Scheduled</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <span><strong>Lucknow ↔ Gorakhpur / Bareilly / Delhi NCR</strong></span>
                    <span style={{ color: "#7C3AED", fontWeight: "700" }}>Express Corridors</span>
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <Link href="/intercity" style={{ color: "#7C3AED", fontWeight: "700", fontSize: "13.5px", textDecoration: "none" }}>
                    View Complete Intercity Routes &amp; Enquiry Process →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 09 - Footer */}
      <SiteFooter showCta={true} />
    </div>
  );
}
