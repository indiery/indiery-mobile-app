"use client";

import { useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(0);
  const faqs = [
    ["Which vehicle should I book?", "Choose a bike for parcels up to 20 kg, a mini truck for furniture and stock up to 750 kg, or a truck for larger commercial and household loads."],
    ["Can I schedule a delivery?", "Yes. You can request an immediate pickup or select a later date and time that works for you."],
    ["Are my goods insured?", "Eligible bookings include transit protection. Our team will confirm the applicable cover before your trip begins."],
    ["Do you support business accounts?", "Yes. Business customers can request central billing, GST invoices, recurring routes and priority allocation."],
  ];
  return (
    <main><SiteHeader />
      <section className="contactHero innerPageHero"><div className="shell contactPanel"><div className="contactBlue"><div className="tagPill"><i /> Contact us</div><h1>Contact us to request<br />a <span>quote today.</span></h1><dl><dt>Email</dt><dd><a href="mailto:hello@indiery.in">hello@indiery.in</a></dd><dt>Phone</dt><dd><a href="tel:+919876543210">+91 98765 43210</a></dd></dl></div><form className="contactForm" onSubmit={(e) => { e.preventDefault(); setSent(true); }}><div className="contactFields"><label>Name<input required placeholder="John Doe" /></label><label>Email<input required type="email" placeholder="contact@email.com" /></label><label>Phone<input required placeholder="+91 98765 43210" /></label><label>Company<input placeholder="Add company" /></label></div><label>Message<textarea required placeholder="Please type your message here..." /></label><button type="submit">Get in Touch</button>{sent && <p className="success">Thanks for reaching out. We will get back to you soon.</p>}</form></div></section>
      <section id="faq" className="section faqSection"><div className="shell faqGrid"><div><div className="kicker"><i /> FAQ</div><h2>Frequently asked<br /><span>questions.</span></h2></div><div className="faqList">{faqs.map(([q, a], i) => <article key={q} className={open === i ? "open" : ""}><button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><b>{open === i ? "−" : "+"}</b></button><p>{a}</p></article>)}</div></div></section>
      <SiteFooter />
    </main>
  );
}
