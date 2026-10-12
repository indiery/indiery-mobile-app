"use client";

import { useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const faqs = [
  ["Which vehicle should I book?", "Choose a bike for parcels up to 20 kg, a mini truck for furniture and stock up to 750 kg, or a truck for larger commercial and household loads."],
  ["Can I schedule a delivery?", "Yes. You can request an immediate pickup or select a later date and time that works for you."],
  ["Is transit protection available?", "Availability and cover depend on the service and goods. Ask the Indiery team to confirm the applicable terms before booking."],
  ["Do you support business accounts?", "Yes. Business customers can request central billing, GST invoices, recurring routes, and priority allocation."],
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(0);

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`Indiery enquiry from ${form.get("name")}`);
    const body = encodeURIComponent(
      `Name: ${form.get("name")}\nEmail: ${form.get("email")}\nPhone: ${form.get("phone") || "Not provided"}\nCompany: ${form.get("company") || "Not provided"}\n\n${form.get("message")}`,
    );
    window.location.href = `mailto:hello@indiery.in?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <main>
      <SiteHeader active="contact" />
      <section className="contactHero innerPageHero">
        <div className="shell contactPanel">
          <div className="contactBlue">
            <div className="tagPill"><i /> Contact us</div>
            <h1>Tell us what you need<br />to <span>move today.</span></h1>
            <p>Share your route, vehicle, or shifting requirement and we&apos;ll help you choose the next step.</p>
            <dl><dt>Email</dt><dd><a href="mailto:hello@indiery.in">hello@indiery.in</a></dd></dl>
          </div>
          <form className="contactForm" onSubmit={handleSubmit}>
            <div className="contactFields">
              <label>Name<input name="name" required autoComplete="name" placeholder="Your name" /></label>
              <label>Email<input name="email" required type="email" autoComplete="email" placeholder="you@example.com" /></label>
              <label>Phone (optional)<input name="phone" autoComplete="tel" placeholder="Your phone number" /></label>
              <label>Company (optional)<input name="company" autoComplete="organization" placeholder="Company name" /></label>
            </div>
            <label>Message<textarea name="message" required placeholder="Pickup, drop, load, and any timing details..." /></label>
            <button type="submit">Email your enquiry</button>
            {sent && <p className="success">Your email app should open with the enquiry details ready to send.</p>}
          </form>
        </div>
      </section>
      <section id="faq" className="section faqSection">
        <div className="shell faqGrid">
          <div><div className="kicker"><i /> FAQ</div><h2>Frequently asked<br /><span>questions.</span></h2></div>
          <div className="faqList">
            {faqs.map(([question, answer], index) => (
              <article key={question} className={open === index ? "open" : ""}>
                <button onClick={() => setOpen(open === index ? -1 : index)}><span>{question}</span><b>{open === index ? "−" : "+"}</b></button>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
