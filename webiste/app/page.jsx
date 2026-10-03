import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

export const metadata = {
  title: "Indiery | Local delivery made simple",
  description:
    "Book bikes and mini trucks, connect with verified delivery partners, and follow every local delivery from pickup to doorstep.",
};

const highlights = [
  "Clear delivery details",
  "Live progress updates",
  "Dedicated partner app",
];

const services = [
  {
    icon: "bike",
    title: "Bike delivery",
    text: "Documents, parcels, and everyday essentials moved quickly across the city.",
    href: "/services/bike-delivery",
  },
  {
    icon: "truck",
    title: "Mini truck",
    text: "A practical choice for furniture, appliances, stock, and heavier local loads.",
    href: "/services/mini-truck",
  },
  {
    icon: "home",
    title: "House shifting",
    text: "Vehicle support for smooth neighbourhood moves, with room for your instructions.",
    href: "/services/house-shifting",
  },
  {
    icon: "business",
    title: "Business delivery",
    text: "Repeat routes and local dispatch support for shops and growing businesses.",
    href: "/services/business-delivery",
  },
];

const steps = [
  {
    number: "01",
    icon: "pin",
    title: "Add your route",
    text: "Enter the pickup, destination, and the details of what you need to move.",
  },
  {
    number: "02",
    icon: "users",
    title: "Connect with a partner",
    text: "An available delivery partner reviews and accepts your request.",
  },
  {
    number: "03",
    icon: "route",
    title: "Follow the delivery",
    text: "Stay informed as your order moves from pickup through to completion.",
  },
];

function Icon({ name }) {
  const paths = {
    bike: (
      <>
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="17" r="3" />
        <path d="m6 17 4-8h4l4 8M9 11h6M12 17 9 11 7 7h3" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-7 9 7M5.5 9.5V20h13V9.5" />
        <path d="M9.5 20v-6h5v6" />
      </>
    ),
    business: (
      <>
        <path d="M4 8h16v12H4zM8 8V5h8v3" />
        <path d="M4 13h16M10 13v2h4v-2" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    users: (
      <>
        <circle cx="8" cy="9" r="3" />
        <circle cx="17" cy="8" r="2.25" />
        <path d="M3.5 20c.4-4 1.9-6 4.5-6s4.1 2 4.5 6M14 13c3.6-.3 5.8 1.7 6.2 5" />
      </>
    ),
    route: (
      <>
        <circle cx="5" cy="18" r="2" />
        <circle cx="19" cy="6" r="2" />
        <path d="M7 18h3a3 3 0 0 0 3-3v-6a3 3 0 0 1 3-3h1" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v6c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V6z" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Indiery home">
          <Image
            src="/indiery-brand-logo.png"
            alt="Indiery"
            width={847}
            height={260}
            priority
          />
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#how-it-works">How it works</a>
          <a href="#partners">Partners</a>
          <Link href="/about">About</Link>
        </nav>
        <Link className={styles.headerCta} href="/contact">
          Book a vehicle <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span /> On-demand city delivery
            </p>
            <h1>
              Your city moves,
              <span> made simple.</span>
            </h1>
            <p className={styles.lead}>
              From a small parcel to a mini-truck load, Indiery connects you
              with the right delivery partner and keeps every step clear.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} href="/contact">
                Book your delivery <span aria-hidden="true">→</span>
              </Link>
              <a className={styles.secondaryButton} href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className={styles.heroHighlights}>
              {highlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <figure className={styles.heroMedia}>
            <Image
              src="/indiery-delivery-hero.webp"
              alt="An Indiery delivery partner handing a parcel to a local business owner"
              fill
              sizes="(max-width: 800px) 100vw, 52vw"
              priority
            />
            <figcaption className={styles.mediaBadge}>
              <span className={styles.badgeIcon}>
                <Icon name="shield" />
              </span>
              <span>
                <strong>Delivery in progress</strong>
                Pickup confirmed · Partner assigned
              </span>
            </figcaption>
          </figure>
        </section>

        <section className={styles.trustBar} aria-label="Indiery benefits">
          <p>Built for everyday moves across your city</p>
          <div>
            <span>Upfront details</span>
            <span>Verified partners</span>
            <span>Order progress</span>
            <span>Dedicated support</span>
          </div>
        </section>

        <section className={styles.servicesSection} id="services">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>One platform, every local move</p>
              <h2>The right vehicle for what you need today.</h2>
            </div>
            <p>
              Choose a service that fits the size of your delivery, from a
              quick bike run to moving business stock across town.
            </p>
          </div>
          <div className={styles.serviceGrid}>
            {services.map((service, index) => (
              <Link className={styles.serviceCard} href={service.href} key={service.title}>
                <span className={styles.serviceIndex}>0{index + 1}</span>
                <span className={styles.serviceIcon}><Icon name={service.icon} /></span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <span className={styles.cardLink}>Explore service →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.processSection} id="how-it-works">
          <div className={styles.processIntro}>
            <p className={styles.eyebrow}>How Indiery works</p>
            <h2>Pickup to doorstep in three clear steps.</h2>
            <p>
              The customer and partner apps keep the details that matter in
              one place, without adding unnecessary complexity.
            </p>
            <Link className={styles.lightButton} href="/how-it-works">
              Learn more about the process
            </Link>
          </div>
          <div className={styles.steps}>
            {steps.map((step) => (
              <article key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <span className={styles.stepIcon}><Icon name={step.icon} /></span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.audienceSection}>
          <article className={styles.customerCard}>
            <p className={styles.eyebrow}>For customers</p>
            <h2>Everything about your delivery, in one place.</h2>
            <p>
              Add the route and package details, choose the suitable vehicle,
              and stay informed from booking to drop-off.
            </p>
            <ul>
              <li>Simple pickup and destination details</li>
              <li>Vehicles for parcels and heavier loads</li>
              <li>Accessible delivery status and support</li>
            </ul>
            <div className={styles.routeGraphic} aria-hidden="true">
              <span>A</span><i><b /></i><span>B</span>
            </div>
          </article>

          <article className={styles.partnerCard} id="partners">
            <p className={styles.eyebrow}>For driver partners</p>
            <h2>Flexible work with a focused partner app.</h2>
            <p>
              Review available requests, manage active trips, and complete
              delivery updates through a workflow built for the road.
            </p>
            <ul>
              <li>Review nearby delivery opportunities</li>
              <li>Manage active delivery steps</li>
              <li>Build earnings on your schedule</li>
            </ul>
            <Link className={styles.partnerLink} href="/contact">
              Become a driver partner →
            </Link>
          </article>
        </section>

        <section className={styles.safetySection}>
          <div className={styles.safetyMark}><Icon name="shield" /></div>
          <div>
            <p className={styles.eyebrow}>Clarity at every step</p>
            <h2>Delivery information you can understand and control.</h2>
          </div>
          <p>
            Route details, status updates, privacy information, and support
            stay accessible whenever you need them.
          </p>
          <Link href="/safety">Explore safety →</Link>
        </section>

        <section className={styles.ctaSection}>
          <div>
            <p className={styles.eyebrow}>Ready when you are</p>
            <h2>What are we moving today?</h2>
            <p>Tell us where it needs to go. We&apos;ll help with the rest.</p>
          </div>
          <Link className={styles.ctaButton} href="/contact">
            Book a vehicle <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image
            src="/indiery-brand-logo.png"
            alt="Indiery"
            width={847}
            height={260}
          />
          <p>Simple, reliable local delivery for people and businesses.</p>
        </div>
        <div className={styles.footerLinks}>
          <div>
            <strong>Explore</strong>
            <Link href="/about">About</Link>
            <Link href="/services">Services</Link>
            <Link href="/plans-eccomerce">Pricing</Link>
          </div>
          <div>
            <strong>Support</strong>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/safety">Safety</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div>
            <strong>Legal</strong>
            <Link href="/legal">Privacy &amp; terms</Link>
            <a href="mailto:support@indiery.com">support@indiery.com</a>
          </div>
        </div>
        <div className={styles.copyright}>
          <span>© {new Date().getFullYear()} Indiery. All rights reserved.</span>
          <span>Made for city moves across India.</span>
        </div>
      </footer>
    </div>
  );
}
