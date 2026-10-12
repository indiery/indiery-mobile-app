"use client";

import { useState } from "react";
import Link from "next/link";

export default function SiteHeader({ active = "home" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  return (
    <header className="indiery-lean-header">
      <div className="indiery-header-inner">
        {/* Brand Logo */}
        <div className="indiery-logo-wrap">
          <Link href="/" aria-label="Indiery Home" className="indiery-logo-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 54" width="168" height="38">
              <g transform="translate(4, 5)">
                <rect x="0" y="0" width="44" height="44" rx="12" fill="#7C3AED" stroke="#EDE9FE" strokeWidth="1.8" />
                <path d="M12 25h4v-5h9v5h5l4 4v5h-3a4 4 0 0 1-8 0h-6a4 4 0 0 1-8 0h-2v-6a3 3 0 0 1 2-3z" fill="#FFFFFF" />
                <circle cx="16" cy="31" r="2.2" fill="#7C3AED" />
                <circle cx="30" cy="31" r="2.2" fill="#7C3AED" />
                <path d="M25 22h4l2.5 3H25z" fill="#FFFFFF" opacity="0.7" />
              </g>
              <text x="56" y="31" fontFamily="'Rubik', 'Poppins', Arial, sans-serif" fontSize="23" fontWeight="900" fill="#0F172A" letterSpacing="1">
                INDIERY
              </text>
              <text x="57" y="44" fontFamily="'Poppins', Arial, sans-serif" fontSize="8.5" fontWeight="700" fill="#7C3AED" letterSpacing="1.5">
                DELIVERY &amp; SHIFTING
              </text>
            </svg>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="indiery-desktop-nav">
          <ul className="indiery-nav-menu">
            <li className={`indiery-nav-item ${active === "home" ? "active" : ""}`}>
              <Link href="/" className="indiery-nav-link">Home</Link>
            </li>
            <li className={`indiery-nav-item ${active === "about" ? "active" : ""}`}>
              <Link href="/about" className="indiery-nav-link">About Us</Link>
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
                  <Link href="/services/bike-delivery" className="indiery-dropdown-link">
                    <span className="indiery-dropdown-icon">🛵</span>
                    <div>
                      <div className="title">Two-Wheeler (Bikes)</div>
                      <div className="sub">Instant parcels &amp; documents</div>
                    </div>
                  </Link>
                </li>
                <li className="indiery-dropdown-item">
                  <Link href="/services/mini-truck" className="indiery-dropdown-link">
                    <span className="indiery-dropdown-icon">🛺</span>
                    <div>
                      <div className="title">Mini Trucks (Tata Ace, 750kg)</div>
                      <div className="sub">Commercial goods &amp; deliveries</div>
                    </div>
                  </Link>
                </li>
                <li className="indiery-dropdown-item">
                  <Link href="/services/commercial-truck" className="indiery-dropdown-link">
                    <span className="indiery-dropdown-icon">🚚</span>
                    <div>
                      <div className="title">Commercial Trucks (8ft, 14ft, 19ft)</div>
                      <div className="sub">Heavy loads &amp; bulk shipment</div>
                    </div>
                  </Link>
                </li>
                <li className="indiery-dropdown-item">
                  <Link href="/services/house-shifting" className="indiery-dropdown-link">
                    <span className="indiery-dropdown-icon">📦</span>
                    <div>
                      <div className="title">House &amp; Office Shifting</div>
                      <div className="sub">Full packing &amp; safe relocation</div>
                    </div>
                  </Link>
                </li>
                <li className="indiery-dropdown-item">
                  <Link href="/services/driver-partners" className="indiery-dropdown-link">
                    <span className="indiery-dropdown-icon">🤝</span>
                    <div>
                      <div className="title">Driver Partner Program</div>
                      <div className="sub">Attach vehicle &amp; earn daily</div>
                    </div>
                  </Link>
                </li>
              </ul>
            </li>
            <li className={`indiery-nav-item ${active === "pricing" ? "active" : ""}`}>
              <Link href="/plans-eccomerce" className="indiery-nav-link">Pricing</Link>
            </li>
            <li className={`indiery-nav-item ${active === "contact" ? "active" : ""}`}>
              <Link href="/contact" className="indiery-nav-link">Contact</Link>
            </li>
          </ul>
        </nav>

        {/* Action Buttons */}
        <div className="indiery-header-actions">
          <a href="tel:919876543210" className="indiery-call-box">
            <div className="indiery-call-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="indiery-call-info">
              <span className="indiery-call-label">24/7 Support</span>
              <span className="indiery-call-num">+91 98765 43210</span>
            </div>
          </a>

          <Link href="/contact" className="indiery-cta-btn">
            <span>Book Vehicle</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          <button
            type="button"
            className="indiery-mobile-toggle"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
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
        onClick={() => setMobileMenuOpen(false)}
      >
        <div className="indiery-mobile-panel" onClick={(e) => e.stopPropagation()}>
          <div className="indiery-mobile-header">
            <span className="indiery-mobile-brand">indiery</span>
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
            <li><Link href="/about" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>About Us</Link></li>
            <li><Link href="/services" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Services</Link></li>
            <li className="indiery-mobile-sub">
              <Link href="/services/bike-delivery" onClick={() => setMobileMenuOpen(false)}>🛵 Bike Delivery</Link>
              <Link href="/services/mini-truck" onClick={() => setMobileMenuOpen(false)}>🛺 Mini Trucks</Link>
              <Link href="/services/commercial-truck" onClick={() => setMobileMenuOpen(false)}>🚚 Commercial Trucks</Link>
              <Link href="/services/house-shifting" onClick={() => setMobileMenuOpen(false)}>📦 House Shifting</Link>
              <Link href="/services/driver-partners" onClick={() => setMobileMenuOpen(false)}>🤝 Driver Partners</Link>
            </li>
            <li><Link href="/plans-eccomerce" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</Link></li>
            <li><Link href="/contact" className="indiery-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact</Link></li>
          </ul>

          <div className="indiery-mobile-footer">
            <div className="mobile-support-box">
              <span className="label">24/7 Support Hotline</span>
              <a href="tel:919876543210" className="phone">+91 98765 43210</a>
            </div>
            <Link href="/contact" className="indiery-cta-btn full" onClick={() => setMobileMenuOpen(false)}>
              <span>Book Vehicle</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
