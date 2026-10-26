import Link from "next/link";

export default function SiteFooter({ showCta = true }) {
  return (
    <>
      {showCta && (
        <section className="indiery-prefooter-cta">
          <div className="indiery-prefooter-inner">
            <div className="indiery-prefooter-text">
              <span className="indiery-prefooter-tag">STARTING IN LUCKNOW</span>
              <h2>A technology-driven logistics platform for your goods</h2>
              <p>
                Connecting individuals and businesses with independent drivers and transport partners for dependable local delivery and intercity logistics.
              </p>
            </div>
            <div className="indiery-prefooter-actions">
              <Link href="/download-apps" className="indiery-cta-btn prefooter-btn">
                <span>Download Indiery App</span>
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
                  LOGISTICS PLATFORM
                </text>
              </svg>
            </Link>
            <p className="footer-desc">
              Indiery is a technology-driven logistics platform starting in Lucknow, serving individuals and businesses through a network of independent transport partners.
            </p>
            <div className="footer-social-links">
              <a href="https://wa.me/919264926552" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Support" className="social-icon" title="Chat on WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </a>
              <a href="mailto:contact@indiery.com" aria-label="Email Support" className="social-icon" title="Email contact@indiery.com">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
              <a href="tel:+919264926552" aria-label="Phone Support" className="social-icon" title="Call +91 9264926552">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Services Column */}
          <div className="indiery-footer-col">
            <h4 className="footer-title">Our Services</h4>
            <ul className="footer-menu">
              <li><Link href="/services#local">Bike Delivery (Up to 20 kg)</Link></li>
              <li><Link href="/services#local">Loader Delivery (Up to 90 kg)</Link></li>
              <li><Link href="/services#goods">500 kg Mini Truck</Link></li>
              <li><Link href="/services#goods">750 kg Mini Truck</Link></li>
              <li><Link href="/services/commercial-truck">Larger-Capacity Trucks</Link></li>
              <li><Link href="/intercity">Intercity Logistics (FTL)</Link></li>
            </ul>
          </div>

          {/* Solutions & Apps Column */}
          <div className="indiery-footer-col">
            <h4 className="footer-title">Solutions &amp; Apps</h4>
            <ul className="footer-menu">
              <li><Link href="/for-business">For Businesses</Link></li>
              <li><Link href="/for-business#enquiry">Business Enquiries</Link></li>
              <li><Link href="/driver-partner">Become a Driver Partner</Link></li>
              <li><Link href="/download-apps">Indiery Customer App</Link></li>
              <li><Link href="/download-apps">Indiery Driver App</Link></li>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/faq">Frequently Asked Questions</Link></li>
            </ul>
          </div>

          {/* Company & Contact Column */}
          <div className="indiery-footer-col">
            <h4 className="footer-title">Contact &amp; Coverage</h4>
            <div className="footer-info-block">
              <div className="info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span>Devpur, Rajajipuram, Lucknow, Uttar Pradesh, India</span>
              </div>
              <div className="info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <a href="tel:+919264926552">+91 92649 26552</a>
              </div>
              <div className="info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <a href="mailto:contact@indiery.com">contact@indiery.com</a>
              </div>
              <div className="info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Operating Hub: Lucknow Local Delivery &amp; Intercity Corridors</span>
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
              <Link href="/terms">Terms &amp; Conditions</Link>
              <Link href="/refunds">Cancellation &amp; Refund Policy</Link>
              <Link href="/partner-privacy">Partner Privacy</Link>
              <Link href="/partner-terms">Partner Terms</Link>
              <Link href="/account-deletion">Account Deletion</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
