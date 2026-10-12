"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "./home.module.css";

const vehicleOptions = [
  { id: "bike", name: "Two-Wheeler", emoji: "🛵", base: 45, ratePerKm: 12, capacity: "Up to 20 kg", eta: "10-15 min" },
  { id: "mini", name: "Mini Truck (Ace)", emoji: "🛺", base: 220, ratePerKm: 28, capacity: "Up to 750 kg", eta: "20-25 min" },
  { id: "commercial", name: "Commercial Truck", emoji: "🚚", base: 550, ratePerKm: 45, capacity: "Up to 2.5 Tons", eta: "30-45 min" },
  { id: "shifting", name: "House Shifting", emoji: "📦", base: 1800, ratePerKm: 65, capacity: "Full Move + Helpers", eta: "Scheduled" },
];

const popularLocations = [
  "Hazratganj",
  "Gomti Nagar",
  "Alambagh",
  "Indira Nagar",
  "Charbagh",
  "Chowk"
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("estimate"); // "estimate" or "track"
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleOptions[0]);
  const [pickup, setPickup] = useState("Hazratganj, Lucknow");
  const [dropoff, setDropoff] = useState("Gomti Nagar, Lucknow");
  const [estimatedKm, setEstimatedKm] = useState(8.5);
  const [trackingNumber, setTrackingNumber] = useState("IND-88219");
  const [hasSearchedTrack, setHasSearchedTrack] = useState(true);

  // Dynamic fare calculation
  const calculatedFare = Math.round(selectedVehicle.base + (estimatedKm * selectedVehicle.ratePerKm));
  const gstAmount = Math.round(calculatedFare * 0.05);
  const totalFare = calculatedFare + gstAmount;

  return (
    <div className={styles.page}>
      {/* Official Top Navigation */}
      <SiteHeader active="home" />

      <main>
        {/* =================================================================
            HERO SECTION
            ================================================================= */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <div className={styles.eyebrowBadge}>
                <span className={styles.pulseDot} />
                ON-DEMAND DELIVERY ACROSS YOUR CITY
              </div>

              <h1 className={styles.heroTitle}>
                Move Anything Across Your City,{" "}
                <span className={styles.heroTitleHighlight}>On Demand.</span>
              </h1>

              <p className={styles.heroDescription}>
                Book verified bikes, mini trucks, and professional movers in minutes—with upfront fares, live tracking, and dependable doorstep delivery.
              </p>

              <div className={styles.heroActions}>
                <Link href="/services" className={styles.primaryBtn}>
                  <span>Our Services</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </Link>

                <Link href="/contact" className={styles.secondaryBtn}>
                  <span>Book Vehicle</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className={styles.heroTrustBar}>
                <span className={styles.trustItem}>
                  <span className={styles.trustIcon}>✓</span> 4 Ways To Move
                </span>
                <span className={styles.trustItem}>
                  <span className={styles.trustIcon}>✓</span> Verified Delivery Partners
                </span>
                <span className={styles.trustItem}>
                  <span className={styles.trustIcon}>✓</span> Upfront Fare Estimates
                </span>
                <span className={styles.trustItem}>
                  <span className={styles.trustIcon}>✓</span> Live Trip Tracking
                </span>
              </div>
            </div>

            {/* Right Hero Visuals with Animated Suspended Container */}
            <div className={styles.heroMediaWrapper}>
              <div className={styles.heroMainImgWrapper}>
                <Image
                  src="/banner_img01_indiery.png"
                  alt="Indiery courier partner holding delivery boxes"
                  fill
                  priority
                  className={styles.heroCourierImg}
                  sizes="(max-width: 768px) 100vw, 520px"
                />
              </div>

              {/* Floating Suspended Container */}
              <div className={styles.floatingContainerWrapper}>
                <Image
                  src="/banner_img02_indiery.png"
                  alt="Indiery purple cargo container suspended by crane cables"
                  fill
                  className={styles.floatingContainerImg}
                  sizes="220px"
                />
              </div>

              {/* Floating Status Card */}
              <div className={styles.floatingTripBadge}>
                <div className={styles.tripBadgeIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.4 7.6 12a.6.6 0 0 0 .8 0c.6-.6 7.6-6.6 7.6-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className={styles.tripBadgeText}>
                  <span className={styles.tripBadgeTitle}>Trip in progress</span>
                  <span className={styles.tripBadgeSub}>Partner Assigned · ETA 14 mins</span>
                </div>
              </div>

              {/* Rating Badge */}
              <div className={styles.floatingRatingBadge}>
                <span>⭐ 4.9/5 Rating</span>
                <span style={{ color: "#94a3b8" }}>·</span>
                <span style={{ color: "#7c3aed" }}>50,000+ Moves</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ABOUT / CAPABILITIES SECTION ("ONE APP FOR EVERY LOCAL MOVE")
            ================================================================= */}
        <section className={styles.aboutSection} id="about">
          <div className={styles.aboutInner}>
            <div className={styles.aboutMediaCol}>
              <div className={styles.aboutImageCard}>
                <Image
                  src="/about_img01_purple.png"
                  alt="Indiery logistics team ready for city deliveries"
                  fill
                  className={styles.aboutImage}
                  sizes="(max-width: 768px) 100vw, 550px"
                />
                <div className={styles.aboutOverlayBadge}>
                  <div className={styles.overlayStat}>
                    <span className={styles.overlayNum}>99.4%</span>
                    <span className={styles.overlayLabel}>On-Time Delivery</span>
                  </div>
                  <div className={styles.overlayStat}>
                    <span className={styles.overlayNum}>15 Min</span>
                    <span className={styles.overlayLabel}>Avg. Pickup Time</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.aboutContentCol}>
              <p className={styles.sectionEyebrow}>ONE APP FOR EVERY LOCAL MOVE</p>
              <h2 className={styles.sectionTitle}>From Small Parcels To Complete House Shifting</h2>
              <p className={styles.sectionText}>
                Indiery connects customers and businesses with verified delivery partners for quick bike deliveries, mini-truck transport, store dispatches, and carefully managed relocations.
              </p>

              <div className={styles.checklistGrid}>
                <div className={styles.checklistItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Verified Delivery Partners</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Upfront Fare Estimates</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Live Trip Tracking</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Support From Pickup To Drop</span>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <Link href="/contact" className={styles.primaryBtn}>
                  <span>Get in Touch</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            SERVICES SECTION ("THE RIGHT VEHICLE FOR EVERY CITY DELIVERY")
            ================================================================= */}
        <section className={styles.servicesSection} id="services">
          <div className={styles.servicesInner}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <p className={styles.sectionEyebrow}>OUR BEST SERVICES</p>
                <h2 className={styles.sectionTitle}>The Right Vehicle For Every City Delivery</h2>
              </div>
              <Link href="/services" className={styles.viewAllLink}>
                <span>All Services</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className={styles.serviceGrid}>
              {/* Bike Delivery Card */}
              <Link href="/services/bike-delivery" className={styles.serviceCard}>
                <div className={styles.serviceIconTop}>🛵</div>
                <div className={styles.serviceImgWrap}>
                  <Image
                    src="/assets/service-bike-cutout.png"
                    alt="Two wheeler bike courier"
                    fill
                    className={styles.serviceCutoutImg}
                    sizes="260px"
                  />
                </div>
                <span className={styles.serviceTag}>Instant 15-min pickup</span>
                <h3 className={styles.serviceCardTitle}>Bike Delivery</h3>
                <p className={styles.serviceCardText}>
                  Fast pickup for documents, food, medicines, gifts, and small parcels across the city.
                </p>
                <div className={styles.serviceCardFooter}>
                  <span>Read More</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* Mini Truck Card */}
              <Link href="/services/mini-truck" className={styles.serviceCard}>
                <div className={styles.serviceIconTop}>🛺</div>
                <div className={styles.serviceImgWrap}>
                  <Image
                    src="/assets/service-tempo-cutout.png"
                    alt="Tata Ace mini truck"
                    fill
                    className={styles.serviceCutoutImg}
                    sizes="260px"
                  />
                </div>
                <span className={styles.serviceTag}>Tata Ace · 750kg Load</span>
                <h3 className={styles.serviceCardTitle}>Mini Truck</h3>
                <p className={styles.serviceCardText}>
                  Book a Tata Ace or mini truck for furniture, appliances, stock, and bulky local loads.
                </p>
                <div className={styles.serviceCardFooter}>
                  <span>Read More</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* Commercial Trucks */}
              <Link href="/services/commercial-truck" className={styles.serviceCard}>
                <div className={styles.serviceIconTop}>🚚</div>
                <div className={styles.serviceImgWrap}>
                  <Image
                    src="/assets/service-business-truck-cutout.png"
                    alt="Commercial delivery truck"
                    fill
                    className={styles.serviceCutoutImg}
                    sizes="260px"
                  />
                </div>
                <span className={styles.serviceTag}>8ft, 14ft, 19ft Trucks</span>
                <h3 className={styles.serviceCardTitle}>Commercial Trucks</h3>
                <p className={styles.serviceCardText}>
                  Reliable scheduled and on-demand dispatch support for shops, offices, and growing businesses.
                </p>
                <div className={styles.serviceCardFooter}>
                  <span>Read More</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* House Shifting */}
              <Link href="/services/house-shifting" className={styles.serviceCard}>
                <div className={styles.serviceIconTop}>📦</div>
                <div className={styles.serviceImgWrap}>
                  <Image
                    src="/assets/service-moving-truck-cutout.png"
                    alt="House moving truck"
                    fill
                    className={styles.serviceCutoutImg}
                    sizes="260px"
                  />
                </div>
                <span className={styles.serviceTag}>Packing + Transport</span>
                <h3 className={styles.serviceCardTitle}>House Shifting</h3>
                <p className={styles.serviceCardText}>
                  Professional packing, loading, transport, and unloading for a smoother local move.
                </p>
                <div className={styles.serviceCardFooter}>
                  <span>Read More</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* =================================================================
            INTERACTIVE INSTANT FARE CALCULATOR & LIVE TRACKER
            ("BOOK IN A FEW SIMPLE STEPS")
            ================================================================= */}
        <section className={styles.bookingWidgetSection}>
          <div className={styles.bookingWidgetInner}>
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <p className={styles.sectionEyebrow}>BOOK IN A FEW SIMPLE STEPS</p>
              <h2 className={styles.sectionTitle}>Choose A Vehicle, See Your Fare, And Track The Trip Live</h2>
            </div>

            <div className={styles.bookingWidgetCard}>
              <div className={styles.widgetHeaderTabs}>
                <button
                  type="button"
                  className={`${styles.widgetTab} ${activeTab === "estimate" ? styles.active : ""}`}
                  onClick={() => setActiveTab("estimate")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>Book a Vehicle</span>
                </button>
                <button
                  type="button"
                  className={`${styles.widgetTab} ${activeTab === "track" ? styles.active : ""}`}
                  onClick={() => setActiveTab("track")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 14 14" />
                  </svg>
                  <span>Track &amp; Trace</span>
                </button>
              </div>

              <div className={styles.widgetBody}>
                {activeTab === "estimate" ? (
                  <div>
                    {/* Vehicle Selector */}
                    <div className={styles.vehiclePills}>
                      {vehicleOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`${styles.vehiclePillBtn} ${selectedVehicle.id === opt.id ? styles.selected : ""}`}
                          onClick={() => setSelectedVehicle(opt)}
                        >
                          <span className={styles.vehiclePillEmoji}>{opt.emoji}</span>
                          <span className={styles.vehiclePillName}>{opt.name}</span>
                          <span className={styles.vehiclePillBase}>From ₹{opt.base}</span>
                        </button>
                      ))}
                    </div>

                    {/* Inputs */}
                    <div className={styles.inputLocationsGrid}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          <span>📍 Pickup Location</span>
                        </label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          placeholder="Enter pickup address..."
                        />
                        <div className={styles.quickLandmarks}>
                          {popularLocations.slice(0, 3).map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              className={styles.quickLandmarkPill}
                              onClick={() => setPickup(`${loc}, Lucknow`)}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          <span>🏁 Drop-off Destination</span>
                        </label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={dropoff}
                          onChange={(e) => setDropoff(e.target.value)}
                          placeholder="Enter drop location..."
                        />
                        <div className={styles.quickLandmarks}>
                          {popularLocations.slice(3, 6).map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              className={styles.quickLandmarkPill}
                              onClick={() => setDropoff(`${loc}, Lucknow`)}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Distance slider */}
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                        <span>Distance Estimation:</span>
                        <span style={{ color: "#7c3aed" }}>{estimatedKm} km</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="35"
                        step="0.5"
                        value={estimatedKm}
                        onChange={(e) => setEstimatedKm(parseFloat(e.target.value))}
                        style={{ width: "100%", accentColor: "#7c3aed" }}
                      />
                    </div>

                    {/* Fare Result Output */}
                    <div className={styles.fareEstimateBox}>
                      <div className={styles.fareDetailsCol}>
                        <span className={styles.fareLabel}>Estimated Upfront Fare</span>
                        <span className={styles.fareAmount}>₹{totalFare}</span>
                        <span className={styles.fareBreakdownMeta}>
                          Base ₹{selectedVehicle.base} + ₹{Math.round(estimatedKm * selectedVehicle.ratePerKm)} ({estimatedKm}km) + GST ₹{gstAmount} · ETA: {selectedVehicle.eta}
                        </span>
                      </div>

                      <Link href={`/contact?vehicle=${selectedVehicle.id}&pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(dropoff)}`} className={styles.primaryBtn}>
                        <span>Book This Vehicle</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className={styles.trackingViewBox}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <input
                        type="text"
                        className={styles.formInput}
                        style={{ flexGrow: 1 }}
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter Order ID (e.g. IND-88219)"
                      />
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => setHasSearchedTrack(true)}
                      >
                        Track Order
                      </button>
                    </div>

                    {hasSearchedTrack && (
                      <div style={{ marginTop: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <div>
                            <span style={{ fontSize: "12px", color: "#7c3aed", fontWeight: "700" }}>ORDER #{trackingNumber}</span>
                            <h4 style={{ margin: "2px 0 0", color: "#0f172a", fontSize: "17px" }}>Mini Truck (Tata Ace) In Transit</h4>
                          </div>
                          <span style={{ background: "#d1fae5", color: "#065f46", fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px" }}>
                            Active Trip
                          </span>
                        </div>

                        <div className={styles.trackingTimeline}>
                          <div className={`${styles.trackingStep} ${styles.completed}`}>
                            <span style={{ fontSize: "16px" }}>✓</span>
                            <span className={styles.stepStatusTitle}>Order Placed</span>
                            <span className={styles.stepStatusDesc}>Hazratganj · 10:15 AM</span>
                          </div>
                          <div className={`${styles.trackingStep} ${styles.completed}`}>
                            <span style={{ fontSize: "16px" }}>✓</span>
                            <span className={styles.stepStatusTitle}>Partner Assigned</span>
                            <span className={styles.stepStatusDesc}>Rajesh K. (UP-32-AB-9811)</span>
                          </div>
                          <div className={`${styles.trackingStep} ${styles.active}`}>
                            <span style={{ fontSize: "16px" }}>🚚</span>
                            <span className={styles.stepStatusTitle}>On The Way</span>
                            <span className={styles.stepStatusDesc}>Polytechnic Crossing (Live)</span>
                          </div>
                          <div className={styles.trackingStep}>
                            <span style={{ fontSize: "16px" }}>📍</span>
                            <span className={styles.stepStatusTitle}>Doorstep Drop</span>
                            <span className={styles.stepStatusDesc}>Gomti Nagar · Est. 10:45 AM</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            WHY CHOOSE US SECTION
            ================================================================= */}
        <section className={styles.whyChooseSection}>
          <div className={styles.whyChooseInner}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto" }}>
              <p className={styles.sectionEyebrow}>WHY CHOOSE US</p>
              <h2 className={styles.sectionTitle}>Built For Fast, Simple And Reliable City Moves</h2>
              <p className={styles.sectionText}>
                See your fare before booking, get matched with a verified delivery partner, and follow the trip live from pickup to successful drop-off.
              </p>
            </div>

            <div className={styles.featureCardsGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🛡️</div>
                <h3 className={styles.featureTitle}>Verified Partners</h3>
                <p className={styles.featureDesc}>
                  Every driver is verified with KYC, valid commercial license, and vehicle inspection before accepting orders.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>💳</div>
                <h3 className={styles.featureTitle}>Upfront Pricing</h3>
                <p className={styles.featureDesc}>
                  Transparent rates based strictly on distance and vehicle type. No sudden surge prices or hidden booking fees.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🛰️</div>
                <h3 className={styles.featureTitle}>Live Trip Tracking</h3>
                <p className={styles.featureDesc}>
                  Follow the assigned delivery partner in real time from pickup to doorstep and share ETA links with recipients.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📞</div>
                <h3 className={styles.featureTitle}>24/7 Dedicated Support</h3>
                <p className={styles.featureDesc}>
                  Our city operations team is always reachable by direct phone call to assist your packages and shifting needs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            HOW IT WORKS (4 EASY STEPS)
            ================================================================= */}
        <section className={styles.howItWorksSection} id="how-it-works">
          <div className={styles.howItWorksInner}>
            <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto" }}>
              <p className={styles.sectionEyebrow}>HOW IT WORKS</p>
              <h2 className={styles.sectionTitle}>Book Your Indiery Delivery In Four Easy Steps</h2>
            </div>

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <span className={styles.stepNumberBadge}>01</span>
                <h3 className={styles.stepTitle}>Choose A Service</h3>
                <p className={styles.stepText}>
                  Select bike delivery, mini truck, commercial vehicle, or professional house shifting.
                </p>
              </div>

              <div className={styles.stepCard}>
                <span className={styles.stepNumberBadge}>02</span>
                <h3 className={styles.stepTitle}>Add Pickup &amp; Drop</h3>
                <p className={styles.stepText}>
                  Enter accurate locations and tell us what items you need to transport across town.
                </p>
              </div>

              <div className={styles.stepCard}>
                <span className={styles.stepNumberBadge}>03</span>
                <h3 className={styles.stepTitle}>Confirm Upfront Fare</h3>
                <p className={styles.stepText}>
                  Review transparent pricing before you book—no surprise charges or hidden extras.
                </p>
              </div>

              <div className={styles.stepCard}>
                <span className={styles.stepNumberBadge}>04</span>
                <h3 className={styles.stepTitle}>Track To Delivery</h3>
                <p className={styles.stepText}>
                  Follow your assigned driver live on the map until the doorstep drop is complete.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            WHAT YOU CAN BOOK (EVERYDAY DELIVERIES SHOWCASE)
            ================================================================= */}
        <section className={styles.showcaseSection}>
          <div className={styles.showcaseInner}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <p className={styles.sectionEyebrow}>WHAT YOU CAN BOOK</p>
                <h2 className={styles.sectionTitle}>Everyday Deliveries And Moves, Made Simple</h2>
              </div>
              <Link href="/services" className={styles.viewAllLink}>
                <span>See All Services</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className={styles.showcaseGrid}>
              <Link href="/services/bike-delivery" className={styles.showcaseCard}>
                <div className={styles.showcaseImgWrap}>
                  <Image
                    src="/assets/service-bike.jpg"
                    alt="Same-Day Parcel Delivery"
                    fill
                    className={styles.showcaseImg}
                    sizes="300px"
                  />
                </div>
                <div className={styles.showcaseBody}>
                  <h3 className={styles.showcaseTitle}>Same-Day Parcel Delivery</h3>
                  <p className={styles.showcaseSub}>Documents, medicines, keys, food, and daily essentials.</p>
                </div>
              </Link>

              <Link href="/services" className={styles.showcaseCard}>
                <div className={styles.showcaseImgWrap}>
                  <Image
                    src="/assets/warehouse.jpg"
                    alt="Store and business dispatch"
                    fill
                    className={styles.showcaseImg}
                    sizes="300px"
                  />
                </div>
                <div className={styles.showcaseBody}>
                  <h3 className={styles.showcaseTitle}>Store &amp; Business Dispatch</h3>
                  <p className={styles.showcaseSub}>Wholesale restocking, retail shipments, and supplier runs.</p>
                </div>
              </Link>

              <Link href="/services/mini-truck" className={styles.showcaseCard}>
                <div className={styles.showcaseImgWrap}>
                  <Image
                    src="/assets/service-mini.jpg"
                    alt="Mini-Truck Transport"
                    fill
                    className={styles.showcaseImg}
                    sizes="300px"
                  />
                </div>
                <div className={styles.showcaseBody}>
                  <h3 className={styles.showcaseTitle}>Mini-Truck Transport</h3>
                  <p className={styles.showcaseSub}>Bulky appliances, electronics, furniture, and heavy boxes.</p>
                </div>
              </Link>

              <Link href="/services/house-shifting" className={styles.showcaseCard}>
                <div className={styles.showcaseImgWrap}>
                  <Image
                    src="/assets/service-truck.jpg"
                    alt="Packing and house shifting"
                    fill
                    className={styles.showcaseImg}
                    sizes="300px"
                  />
                </div>
                <div className={styles.showcaseBody}>
                  <h3 className={styles.showcaseTitle}>Packing &amp; House Shifting</h3>
                  <p className={styles.showcaseSub}>Trained helpers, secure packaging, and complete relocations.</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* =================================================================
            INDIERY GUIDES & HELPFUL TIPS (BLOG)
            ================================================================= */}
        <section className={styles.guidesSection}>
          <div className={styles.guidesInner}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <p className={styles.sectionEyebrow}>INDIERY GUIDES</p>
                <h2 className={styles.sectionTitle}>Helpful Tips For Better City Deliveries</h2>
              </div>
              <Link href="/news" className={styles.viewAllLink}>
                <span>See All Articles</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className={styles.guidesGrid}>
              <Link href="/news" className={styles.guideCard}>
                <div className={styles.guideImgWrap}>
                  <Image
                    src="/assets/blog-1.jpg"
                    alt="Choosing delivery vehicle"
                    fill
                    className={styles.guideImg}
                    sizes="400px"
                  />
                </div>
                <div className={styles.guideBody}>
                  <span className={styles.guideDate}>October 2026 · Guide</span>
                  <h3 className={styles.guideTitle}>How To Choose The Right Vehicle For Your Load</h3>
                  <p className={styles.guideExcerpt}>
                    Match parcel size, weight, and handling needs to a bike, mini truck, or commercial vehicle to save costs.
                  </p>
                  <span className={styles.guideReadMore}>
                    Read Article →
                  </span>
                </div>
              </Link>

              <Link href="/news" className={styles.guideCard}>
                <div className={styles.guideImgWrap}>
                  <Image
                    src="/assets/blog-2.jpg"
                    alt="Checklist for stress free shifting"
                    fill
                    className={styles.guideImg}
                    sizes="400px"
                  />
                </div>
                <div className={styles.guideBody}>
                  <span className={styles.guideDate}>October 2026 · Relocation</span>
                  <h3 className={styles.guideTitle}>A Simple Checklist For Stress-Free House Shifting</h3>
                  <p className={styles.guideExcerpt}>
                    Prepare essentials, label fragile items, and share building access details before your moving team arrives.
                  </p>
                  <span className={styles.guideReadMore}>
                    Read Article →
                  </span>
                </div>
              </Link>

              <Link href="/news" className={styles.guideCard}>
                <div className={styles.guideImgWrap}>
                  <Image
                    src="/assets/blog-3.jpg"
                    alt="Live tracking benefits"
                    fill
                    className={styles.guideImg}
                    sizes="400px"
                  />
                </div>
                <div className={styles.guideBody}>
                  <span className={styles.guideDate}>October 2026 · Safety</span>
                  <h3 className={styles.guideTitle}>How Live Tracking Makes Local Deliveries Safer</h3>
                  <p className={styles.guideExcerpt}>
                    Follow the assigned partner from pickup to drop and share trip visibility with the recipient seamlessly.
                  </p>
                  <span className={styles.guideReadMore}>
                    Read Article →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Official Pre-Footer CTA Banner and Footer */}
      <SiteFooter showCta={true} />
    </div>
  );
}
