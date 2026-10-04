import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

export const metadata = {
  title: "Indiery | On-demand city delivery",
  description:
    "Book bikes and cargo vehicles, see your fare, pay securely, and track every Indiery delivery from pickup to drop-off.",
};

const services = [
  {
    icon: "bike",
    title: "Bike delivery",
    text: "Documents, medicines, food, gifts, and small parcels delivered across the city.",
    href: "/services/bike-delivery",
  },
  {
    icon: "truck",
    title: "Mini truck",
    text: "Furniture, appliances, shop inventory, and heavier local loads moved with ease.",
    href: "/services/mini-truck",
  },
  {
    icon: "home",
    title: "House shifting",
    text: "A guided booking flow for household moves, with pickup and delivery details in one place.",
    href: "/services/house-shifting",
  },
  {
    icon: "business",
    title: "Business delivery",
    text: "Reliable local dispatch for stores and teams that need repeat delivery support.",
    href: "/services/business-delivery",
  },
];

const steps = [
  ["01", "pin", "Add pickup and drop", "Search locations, use your current position, and add extra stops when needed."],
  ["02", "truck", "Choose a vehicle", "Compare suitable vehicles and review the fare estimate before confirming."],
  ["03", "wallet", "Pay your way", "Use UPI, card, net banking, wallet balance, Indiery Coins, or cash when available."],
  ["04", "route", "Track to delivery", "Follow the assigned partner and verify pickup and drop with secure delivery steps."],
];

function Icon({ name }) {
  const paths = {
    bike: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="m6 17 4-8h4l4 8M9 11h6M12 17 9 11 7 7h3" /></>,
    truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    home: <><path d="m3 11 9-7 9 7M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></>,
    business: <><path d="M4 8h16v12H4zM8 8V5h8v3" /><path d="M4 13h16M10 13v2h4v-2" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    route: <><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1" /></>,
    wallet: <><path d="M4 6.5h14a2 2 0 0 1 2 2V18H4a2 2 0 0 1-2-2V6.5A2.5 2.5 0 0 1 4.5 4H17" /><path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" /></>,
    shield: <><path d="M12 3 20 6v6c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V6z" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></>,
  };

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PhonePreview({ partner = false }) {
  return (
    <div className={`${styles.phone} ${partner ? styles.partnerPhone : ""}`}>
      <div className={styles.phoneTop}><span>9:41</span><i /></div>
      <div className={styles.appHeader}>
        <small>{partner ? "INDIERY PARTNER" : "INDIERY"}</small>
        <strong>{partner ? "Ready to earn?" : "Where are we going?"}</strong>
        <span>{partner ? "Go online to see nearby orders" : "Book a delivery in a few taps"}</span>
      </div>
      {partner ? (
        <div className={styles.partnerUi}>
          <div className={styles.onlinePill}><i /> Available for orders</div>
          <div className={styles.offerCard}>
            <span>NEW DELIVERY</span><b>₹286 estimated earning</b>
            <p>HSR Layout <em /> Indiranagar</p>
            <button>Slide to accept →</button>
          </div>
          <div className={styles.miniStats}><span><b>12</b>Weekly orders</span><span><b>₹4,820</b>Wallet</span></div>
        </div>
      ) : (
        <div className={styles.customerUi}>
          <div className={styles.locationField}><i className={styles.pickupDot} /><span><small>Pickup</small>HSR Layout, Bengaluru</span></div>
          <div className={styles.locationField}><i className={styles.dropDot} /><span><small>Drop</small>Indiranagar, Bengaluru</span></div>
          <p>Choose your vehicle</p>
          <div className={styles.vehicleChoices}><span>Bike<b>₹89</b></span><span className={styles.selectedVehicle}>Mini Truck<b>₹349</b></span></div>
          <button>See fare &amp; book</button>
        </div>
      )}
      <div className={styles.phoneTabs}><span>⌂<small>Home</small></span><span>▣<small>Orders</small></span><span>▰<small>Wallet</small></span><span>●<small>Account</small></span></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Indiery home">
          <Image src="/indiery-brand-logo.png" alt="Indiery" width={847} height={260} priority />
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#services">Services</a><a href="#app">The apps</a><a href="#how-it-works">How it works</a><Link href="/about">About</Link>
        </nav>
        <Link className={styles.headerCta} href="/contact">Book a vehicle <span aria-hidden="true">↗</span></Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> On-demand city delivery</p>
            <h1>Your city<br />moves,<span> made simple.</span></h1>
            <p className={styles.lead}>Book a bike or cargo vehicle, see the fare before you confirm, and follow your delivery live from pickup to drop-off.</p>
            <div className={styles.actions}><Link className={styles.primaryButton} href="/contact">Book your delivery <span aria-hidden="true">→</span></Link><a className={styles.secondaryButton} href="#app">Explore the app</a></div>
            <div className={styles.heroHighlights}><span>Upfront fare estimate</span><span>Live trip tracking</span><span>OTP-secured handover</span></div>
          </div>
          <figure className={styles.heroMedia}>
            <Image src="/assets/indiery-hero-fleet-v2.png" alt="Indiery bike and cargo vehicles for local deliveries" fill sizes="(max-width: 800px) 100vw, 52vw" priority />
            <figcaption className={styles.mediaBadge}><span className={styles.badgeIcon}><Icon name="shield" /></span><span><strong>One app, every local move</strong>Bike, mini truck, cargo &amp; shifting</span></figcaption>
          </figure>
        </section>

        <section className={styles.trustBar} aria-label="Indiery app benefits"><p>Built around the real Indiery booking flow</p><div><span>Multiple stops</span><span>Secure payments</span><span>Wallet &amp; Coins</span><span>Order history</span></div></section>

        <section className={styles.servicesSection} id="services">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>One platform, every local move</p><h2>The right vehicle for what you need today.</h2></div><p>Choose from app-supported delivery options for a parcel, a heavier load, business stock, or a household move.</p></div>
          <div className={styles.serviceGrid}>{services.map((service, index) => <Link className={styles.serviceCard} href={service.href} key={service.title}><span className={styles.serviceIndex}>0{index + 1}</span><span className={styles.serviceIcon}><Icon name={service.icon} /></span><h3>{service.title}</h3><p>{service.text}</p><span className={styles.cardLink}>Explore service →</span></Link>)}</div>
        </section>

        <section className={styles.appShowcase} id="app">
          <div className={styles.appCopy}>
            <p className={styles.eyebrow}>Built for both sides of every delivery</p><h2>Two focused apps. One connected trip.</h2>
            <p>The customer app handles booking, payment, tracking, wallet, and order history. The partner app handles nearby offers, active deliveries, proof, earnings, and payouts.</p>
            <div className={styles.featureList}>
              <span><Icon name="pin" /><b>Precise pickup and drop</b><small>Search places, use current location, and add stops.</small></span>
              <span><Icon name="wallet" /><b>Transparent payment</b><small>Review fare details and use supported payment options.</small></span>
              <span><Icon name="route" /><b>Live delivery progress</b><small>See status, partner details, and the trip timeline.</small></span>
            </div>
          </div>
          <div className={styles.phoneStage} aria-label="Indiery customer and partner app previews"><PhonePreview /><PhonePreview partner /></div>
        </section>

        <section className={styles.processSection} id="how-it-works">
          <div className={styles.processIntro}><p className={styles.eyebrow}>How Indiery works</p><h2>From route to doorstep in four clear steps.</h2><p>No freight jargon or unnecessary forms—only the details needed to complete your local delivery.</p><Link className={styles.lightButton} href="/how-it-works">See the complete process</Link></div>
          <div className={styles.steps}>{steps.map(([number, icon, title, text]) => <article key={number}><span className={styles.stepNumber}>{number}</span><span className={styles.stepIcon}><Icon name={icon} /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
        </section>

        <section className={styles.supportSection}>
          <div className={styles.supportCopy}><p className={styles.eyebrow}>Support from booking to drop-off</p><h2>Indiery stays with the delivery.</h2><p>Get clear status updates, accessible support, secure pickup and drop verification, and a complete record of every order.</p><div className={styles.supportPoints}><span><b>Live tracking</b>Follow active trips</span><span><b>OTP verification</b>Protect each handover</span><span><b>Order timeline</b>See every update</span></div></div>
          <div className={styles.containerVisual}><span aria-hidden="true" className={styles.worldDots} /><Image src="/banner_img02_indiery.png" alt="Purple Indiery container suspended by crane cables" width={1211} height={1299} sizes="(max-width: 800px) 90vw, 48vw" /></div>
        </section>

        <section className={styles.audienceSection}>
          <article className={styles.customerCard}><p className={styles.eyebrow}>For customers</p><h2>Everything about your delivery, in one place.</h2><p>Book the right vehicle, manage payments, use Coins, follow active orders, and return to your delivery history.</p><ul><li>Fare estimate before booking</li><li>Pickup and drop contacts</li><li>Private tracking link</li></ul><div className={styles.routeGraphic} aria-hidden="true"><span>A</span><i><b /></i><span>B</span></div></article>
          <article className={styles.partnerCard}><p className={styles.eyebrow}>For driver partners</p><h2>Delivery work with the tools you need.</h2><p>Go online, review nearby offers, complete OTP and proof steps, and keep track of earnings and payouts.</p><ul><li>KYC and vehicle verification</li><li>Active-order navigation</li><li>Wallet, earnings, and payouts</li></ul><Link className={styles.partnerLink} href="/contact">Become a driver partner →</Link></article>
        </section>

        <section className={styles.safetySection}><div className={styles.safetyMark}><Icon name="shield" /></div><div><p className={styles.eyebrow}>Clarity and control</p><h2>Safety information where you need it.</h2></div><p>Trip details, verification steps, policy information, and support stay easy to reach.</p><Link href="/safety">Explore safety →</Link></section>
        <section className={styles.ctaSection}><div><p className={styles.eyebrow}>Ready when you are</p><h2>What are we moving today?</h2><p>Share the route and load details. Indiery will help you choose the right vehicle.</p></div><Link className={styles.ctaButton} href="/contact">Book a vehicle <span aria-hidden="true">↗</span></Link></section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}><Image src="/indiery-brand-logo.png" alt="Indiery" width={847} height={260} /><p>On-demand city delivery and shifting for customers, partners, and growing businesses.</p></div>
        <div className={styles.footerLinks}><div><strong>Explore</strong><Link href="/about">About</Link><Link href="/services">Services</Link><Link href="/plans-eccomerce">Pricing</Link><Link href="/contact">Contact</Link></div><div><strong>Customer legal</strong><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms &amp; Conditions</Link><Link href="/refunds">Refunds &amp; Cancellations</Link></div><div><strong>Partner &amp; account</strong><Link href="/partner-privacy">Partner Privacy</Link><Link href="/partner-terms">Partner Terms</Link><Link href="/account-deletion">Account Deletion</Link></div></div>
        <div className={styles.copyright}><span>© {new Date().getFullYear()} Indiery. All rights reserved.</span><span>Made for city moves across India.</span></div>
      </footer>
    </div>
  );
}
