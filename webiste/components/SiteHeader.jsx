"use client";

import { useState } from "react";
import Logo from "./Logo";

export default function SiteHeader({ active = "" }) {
  const [open, setOpen] = useState(false);
  const nav = [
    ["Home", "/", "home"],
    ["About Us", "/about", "about"],
    ["Services", "/services", "services"],
    ["Pricing", "/plans-eccomerce", "packages"],
    ["Contact", "/contact", "contact"],
  ];

  return (
    <header className="header innerHeader shell">
      <Logo />
      <button className="menuButton" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
        <i /><i />
      </button>
      <nav className={open ? "nav open" : "nav"}>
        {nav.map(([label, href, id]) => (
          <a key={id} className={active === id ? "active" : ""} href={href} onClick={() => setOpen(false)}>
            {label}{id === "services" && <svg className="arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>}
          </a>
        ))}
      </nav>
      <div className="headerActions">
        <a className="headerPhone" href="tel:+919876543210" aria-label="Call Indiery support at +91 98765 43210">
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <small>24/7 Support<strong>+91 98765 43210</strong></small>
        </a>
        <a className="headerCta" href="/contact">Book Vehicle <span aria-hidden="true">→</span></a>
      </div>
    </header>
  );
}
