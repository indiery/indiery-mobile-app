"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SiteHeader({ active = "home" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="indiery-lean-header">
      <div className="indiery-header-inner">
        {/* Brand Logo from Inventory */}
        <div className="indiery-logo-wrap">
          <Link href="/" aria-label="Indiery Home" className="indiery-logo-link" style={{ display: "inline-flex", alignItems: "center" }}>
            <Image
              src="/indiery-brand-logo.png"
              alt="Indiery Logistics Platform"
              width={165}
              height={50}
              priority
              style={{ height: "38px", width: "auto", objectFit: "contain" }}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="indiery-desktop-nav">
          <ul className="indiery-nav-menu">
            <li className={`indiery-nav-item ${active === "home" ? "active" : ""}`}>
              <Link href="/" className="indiery-nav-link">Home</Link>
            </li>
            
            <li 
              className={`indiery-nav-item has-dropdown ${active === "services" ? "active" : ""}`}
              onMouseEnter={() => setServicesDropdownOpen(true)}
              onMouseLeave={() => setServicesDropdownOpen(false)}
            >
              <Link href="/services" className="indiery-nav-link">
                <span>Services</span>
                <svg className="arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 1l4 4 4-4" />
                </svg>
              </Link>
              <ul className={`indiery-dropdown ${servicesDropdownOpen ? "open" : ""}`}>
                <li className="indiery-dropdown-item">
                  <Link href="/services#local" className="indiery-dropdown-link" onClick={() => setServicesDropdownOpen(false)}>
                    <span className="indiery-dropdown-icon">🛵</span>
                    <div>
                      <div className="title">Local Deliveries</div>
                      <div className="sub">Bike (20 kg) &amp; Loader (90 kg)</div>
                    </div>
                  </Link>
                </li>
                <li className="indiery-dropdown-item">
                  <Link href="/services#goods" className="indiery-dropdown-link" onClick={() => setServicesDropdownOpen(false)}>
                    <span className="indiery-dropdown-icon">🛺</span>
                    <div>
                      <div className="title">Goods Transport</div>
                      <div className="sub">500 kg, 750 kg &amp; Commercial Trucks</div>
                    </div>
                  </Link>
                </li>
                <li className="indiery-dropdown-item">
                  <Link href="/intercity" className="indiery-dropdown-link" onClick={() => setServicesDropdownOpen(false)}>
                    <span className="indiery-dropdown-icon">🚚</span>
                    <div>
                      <div className="title">Intercity Logistics</div>
                      <div className="sub">Full Truck Load (FTL) between cities</div>
                    </div>
                  </Link>
                </li>
              </ul>
            </li>

            <li className={`indiery-nav-item ${active === "intercity" ? "active" : ""}`}>
              <Link href="/intercity" className="indiery-nav-link">Intercity</Link>
            </li>

            <li className={`indiery-nav-item ${active === "business" ? "active" : ""}`}>
              <Link href="/for-business" className="indiery-nav-link">For Business</Link>
            </li>

            <li className={`indiery-nav-item ${active === "driver-partner" ? "active" : ""}`}>
              <Link href="/driver-partner" className="indiery-nav-link">Driver Partners</Link>
            </li>

            <li className={`indiery-nav-item ${active === "about" ? "active" : ""}`}>
              <Link href="/about" className="indiery-nav-link">About</Link>
            </li>

            <li className={`indiery-nav-item ${active === "contact" ? "active" : ""}`}>
              <Link href="/contact" className="indiery-nav-link">Contact</Link>
            </li>
          </ul>
        </nav>

        {/* Action Buttons */}
        <div className="indiery-header-actions">
          <a href="tel:+919264926552" className="indiery-call-box" title="Call Indiery Support">
            <div className="indiery-call-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="indiery-call-info">
              <span className="indiery-call-label">Lucknow Support</span>
              <span className="indiery-call-num">+91 92649 26552</span>
            </div>
          </a>

          {/* Prominent Download App Button */}
          <Link href="/download-apps" className="indiery-cta-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            <span>Download App</span>
          </Link>

          <button
            type="button"
            className="indiery-mobile-toggle"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="indiery-mobile-menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div 
        className={`indiery-mobile-drawer ${mobileMenuOpen ? "open" : ""}`}
        aria-hidden={!mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          id="indiery-mobile-menu"
          className="indiery-mobile-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="indiery-mobile-header">
            <Image
              src="/indiery-brand-logo.png"
              alt="Indiery"
              width={120}
              height={36}
              style={{ height: "30px", width: "auto", objectFit: "contain" }}
            />
            <button
              className="indiery-mobile-close"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <ul className="indiery-mobile-nav">
            <li><Link href="/" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/services" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li className="indiery-mobile-sub">
              <Link href="/services#local" onClick={() => setMobileMenuOpen(false)}>🛵 Local Deliveries (Bike &amp; Loader)</Link>
              <Link href="/services#goods" onClick={() => setMobileMenuOpen(false)}>🛺 Goods Transport (500kg &amp; 750kg)</Link>
              <Link href="/intercity" onClick={() => setMobileMenuOpen(false)}>🚚 Intercity Logistics (FTL)</Link>
            </li>
            <li><Link href="/intercity" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Intercity</Link></li>
            <li><Link href="/for-business" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>For Business</Link></li>
            <li><Link href="/driver-partner" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Become a Driver Partner</Link></li>
            <li><Link href="/about" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>About Us</Link></li>
            <li><Link href="/faq" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>FAQs</Link></li>
            <li><Link href="/contact" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
          </ul>

          <div className="indiery-mobile-footer">
            <div className="mobile-support-box">
              <span className="label">Lucknow Support Hotline</span>
              <a href="tel:+919264926552" className="phone">+91 92649 26552</a>
            </div>
            <Link href="/download-apps" className="indiery-cta-btn full" onClick={() => setMobileMenuOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Download Indiery App</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
