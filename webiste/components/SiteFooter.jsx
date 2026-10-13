import Link from "next/link";

export default function SiteFooter({ showCta = true }) {
  return (
    <>
      {showCta && (
        <section className="indiery-prefooter-cta">
          <div className="indiery-prefooter-inner">
            <div className="indiery-prefooter-text">
              <span className="indiery-prefooter-tag">READY FOR YOUR NEXT MOVE?</span>
              <h2>A simpler way to send, shift, and deliver across your city</h2>
              <p>
                On-demand bikes, mini trucks, business deliveries, and professional house shifting—booked with transparent fares and live tracking.
              </p>
            </div>
            <div className="indiery-prefooter-actions">
              <Link href="/contact" className="indiery-cta-btn prefooter-btn">
                <span>Book a Vehicle</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      <footer className="indiery-main-footer">
        <div className="indiery-footer-container">
          {/* Brand Info Column */}
          <div className="indiery-footer-col brand-col">
            <Link href="/" className="footer-logo-link" aria-label="Indiery Home">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 54" width="160" height="36">
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
            <p className="footer-desc">
              Indiery is the all-in-one local delivery platform connecting customers and businesses with verified delivery partners for fast, dependable city transport.
            </p>
            <div className="footer-social-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" /></svg>
              </a>
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#fff" /></svg>
              </a>
            </div>
          </div>

          {/* Services Column */}
          <div className="indiery-footer-col">
            <h4 className="footer-title">Our Services</h4>
            <ul className="footer-menu">
              <li><Link href="/services/bike-delivery">Two-Wheeler (Bikes)</Link></li>
              <li><Link href="/services/mini-truck">Mini Trucks (Tata Ace)</Link></li>
              <li><Link href="/services/commercial-truck">Commercial Trucks</Link></li>
              <li><Link href="/services/house-shifting">House &amp; Office Shifting</Link></li>
              <li><Link href="/services">Business Delivery Dispatch</Link></li>
              <li><Link href="/services/driver-partners">Driver Partner Program</Link></li>
            </ul>
          </div>

          {/* Quick Links Column */}
          <div className="indiery-footer-col">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-menu">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/plans-eccomerce">Pricing &amp; Plans</Link></li>
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/contact#faq">Frequently Asked Questions</Link></li>
              <li><Link href="/contact">Contact Support</Link></li>
            </ul>
          </div>

          {/* Contact & Info Column */}
          <div className="indiery-footer-col">
            <h4 className="footer-title">Information</h4>
            <div className="footer-info-block">
              <div className="info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span>HSR Layout, Bengaluru, Karnataka, India</span>
              </div>
              <div className="info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <a href="tel:919876543210">+91 98765 43210</a>
              </div>
              <div className="info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Mon – Sat: 8:00 AM – 9:00 PM<br />Sunday: 9:00 AM – 6:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal & Copyright Bar */}
        <div className="indiery-footer-bottom">
          <div className="indiery-footer-bottom-inner">
            <div className="copyright-text">
              Copyright &copy; {new Date().getFullYear()} <Link href="/">Indiery</Link> | All Rights Reserved
            </div>
            <div className="legal-links">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Customer Terms</Link>
              <Link href="/partner-privacy">Partner Privacy</Link>
              <Link href="/partner-terms">Partner Terms</Link>
              <Link href="/refunds">Refunds &amp; Cancellations</Link>
              <Link href="/account-deletion">Account Deletion</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
