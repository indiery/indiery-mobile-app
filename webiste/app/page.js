function FeatureIcon({ type }) {
  const paths = {
    request: (
      <>
        <path d="M7 3.75h8l3 3V20.25H7z" />
        <path d="M15 3.75v3h3M10 11h5M10 15h5" />
      </>
    ),
    connect: (
      <>
        <circle cx="8" cy="9" r="3" />
        <circle cx="17" cy="8" r="2.25" />
        <path d="M3.75 19c.4-3.25 1.9-5 4.25-5s3.85 1.75 4.25 5M14 13c3.45-.3 5.55 1.55 5.9 4.75" />
      </>
    ),
    progress: (
      <>
        <path d="M3.75 16.75 9 11.5l3.25 3.25L20.25 6.5" />
        <path d="M15.25 6.5h5v5" />
      </>
    ),
    privacy: (
      <>
        <path d="M12 3.5 19 6v5.25c0 4.4-2.8 7.45-7 9.25-4.2-1.8-7-4.85-7-9.25V6z" />
        <path d="m8.75 12 2.1 2.1 4.5-4.5" />
      </>
    ),
  };

  return (
    <span className="featureIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {paths[type]}
      </svg>
    </span>
  );
}

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Customer &amp; partner delivery platform</p>
          <h1>Local deliveries, connected from pickup to doorstep.</h1>
          <p className="lead">
            Indiery brings customers and independent delivery partners into one
            clear experience for requesting, managing, and completing local
            deliveries.
          </p>
          <div className="actions">
            <a className="button primary" href="#how-it-works">See how it works</a>
            <a className="button secondary" href="mailto:support@indiery.com">Contact support</a>
          </div>
          <div className="heroHighlights" aria-label="Indiery highlights">
            <span>Clear delivery details</span>
            <span>Progress updates</span>
            <span>Dedicated partner app</span>
          </div>
        </div>

        <figure className="heroMedia">
          <img
            src="/indiery-delivery-hero.webp"
            alt="An Indiery delivery partner handing a parcel to a local business owner"
            width="1536"
            height="1024"
          />
          <figcaption className="mediaBadge">
            <span className="badgeDot" aria-hidden="true" />
            Local delivery made simpler
          </figcaption>
        </figure>
      </section>

      <section className="trustBar" aria-label="Indiery platform">
        <p>Designed for the complete delivery journey</p>
        <div>
          <span>Customer requests</span>
          <span>Partner workflows</span>
          <span>Order progress</span>
          <span>Account support</span>
        </div>
      </section>

      <section className="section centeredSection" id="how-it-works">
        <p className="eyebrow">How Indiery works</p>
        <h2>A clear path from request to completion</h2>
        <p className="sectionIntro">
          Each stage keeps the right delivery information easy to understand
          for both the customer and the assigned partner.
        </p>
        <div className="stepsGrid">
          <article>
            <span className="stepNumber">01</span>
            <FeatureIcon type="request" />
            <h3>Create a request</h3>
            <p>Customers add pickup, destination, and package information in the Indiery app.</p>
          </article>
          <article>
            <span className="stepNumber">02</span>
            <FeatureIcon type="connect" />
            <h3>Connect with a partner</h3>
            <p>An available delivery partner can review and accept the request.</p>
          </article>
          <article>
            <span className="stepNumber">03</span>
            <FeatureIcon type="progress" />
            <h3>Follow the progress</h3>
            <p>Delivery status stays visible as the request moves toward completion.</p>
          </article>
        </div>
      </section>

      <section className="audienceSection">
        <div className="audienceCard customerCard" id="customers">
          <p className="eyebrow">For customers</p>
          <h2>Delivery details in one place</h2>
          <p>
            Create a local delivery request with the information a partner
            needs, then stay informed as the delivery progresses.
          </p>
          <ul>
            <li>Pickup and destination details</li>
            <li>Package and delivery information</li>
            <li>Accessible order status</li>
          </ul>
          <div className="miniRoute" aria-hidden="true">
            <span className="routePoint">A</span>
            <span className="routeLine"><i /></span>
            <span className="routePoint destination">B</span>
          </div>
        </div>

        <div className="audienceCard partnerCard" id="partners">
          <p className="eyebrow">For delivery partners</p>
          <h2>A focused partner workflow</h2>
          <p>
            The Indiery Partner app helps verified partners review available
            work and manage active delivery steps.
          </p>
          <ul>
            <li>Review available requests</li>
            <li>Manage active deliveries</li>
            <li>Complete delivery updates</li>
          </ul>
          <div className="partnerPanel" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="section valuesSection">
        <div className="valuesHeading">
          <div>
            <p className="eyebrow">Built with clarity</p>
            <h2>Useful features without unnecessary complexity</h2>
          </div>
          <p>
            Indiery focuses on the information and controls people need to use
            the delivery platform with confidence.
          </p>
        </div>
        <div className="valuesGrid">
          <article>
            <FeatureIcon type="request" />
            <h3>Clear information</h3>
            <p>Pickup, destination, and package details are organized around the delivery.</p>
          </article>
          <article>
            <FeatureIcon type="progress" />
            <h3>Visible progress</h3>
            <p>Order status helps customers and partners understand what comes next.</p>
          </article>
          <article>
            <FeatureIcon type="privacy" />
            <h3>Account controls</h3>
            <p>Privacy information, support, and account-deletion guidance remain accessible.</p>
          </article>
        </div>
      </section>

      <section className="supportSection">
        <div>
          <p className="eyebrow">Indiery support</p>
          <h2>We&apos;re here when you need help.</h2>
          <p>Contact us for app, account, privacy, or delivery-related questions.</p>
        </div>
        <div className="supportActions">
          <a className="button light" href="mailto:support@indiery.com">Email support</a>
          <a className="textLink" href="/privacy">Read our privacy policy <span aria-hidden="true">→</span></a>
        </div>
      </section>
    </main>
  );
}
