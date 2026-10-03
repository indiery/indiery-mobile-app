import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <>
      <section className="finalCta">
        <div className="shell">
          <div><small>Ready to move?</small><h2>Tell us what you need.<br /><span>We&apos;ll help you book it.</span></h2></div>
          <a href="/contact">Book a Vehicle ↗</a>
        </div>
      </section>
      <footer>
        <div className="shell footerGrid">
          <div><Logo light /><p>On-demand city delivery and shifting for households, drivers, and growing businesses.</p></div>
          <div><b>Navigation</b><a href="/">Home</a><a href="/about">About</a><a href="/plans-eccomerce">Packages</a><a href="/news">News</a></div>
          <div><b>Services</b><a href="/services/bike-delivery">Bike delivery</a><a href="/services/mini-truck">Mini truck</a><a href="/services/house-shifting">House shifting</a></div>
          <div><b>Help</b><a href="/how-it-works">How it works</a><a href="/safety">Safety</a><a href="/contact">Contact</a><a href="/legal">Terms</a></div>
        </div>
        <div className="shell copyright">© 2026 Indiery Technologies Pvt. Ltd. <span>India · hello@indiery.in</span></div>
      </footer>
    </>
  );
}
