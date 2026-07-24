export const metadata = {
  title: "Privacy Policy",
  description: "Privacy information for the Indiery customer and partner applications.",
};

export default function PrivacyPage() {
  return (
    <main className="legalPage">
      <p className="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: July 24, 2026</p>

      <section>
        <h2>Overview</h2>
        <p>
          This policy explains how Indiery handles information when customers
          and delivery partners use our applications and services.
        </p>
      </section>
      <section>
        <h2>Information we collect</h2>
        <p>
          We may collect account details such as your name, phone number, and
          email address; delivery details including pickup and destination
          information; device and app diagnostics; and location information
          when needed to provide delivery and tracking features.
        </p>
      </section>
      <section>
        <h2>How information is used</h2>
        <p>
          Information is used to create and secure accounts, provide delivery
          services, connect customers and delivery partners, show delivery
          progress, provide support, prevent misuse, and meet legal obligations.
        </p>
      </section>
      <section>
        <h2>Sharing and retention</h2>
        <p>
          Information is shared only as needed to operate the service, such as
          sharing relevant delivery details between a customer and the assigned
          delivery partner or with service providers that support app
          operations. We retain information only for as long as reasonably
          necessary for these purposes and applicable legal requirements.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You may request access, correction, or deletion of your information.
          See our <a href="/account-deletion">account deletion page</a> or
          contact us using the email below.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions or requests, email{" "}
          <a href="mailto:support@indiery.in">support@indiery.in</a>.
        </p>
      </section>
    </main>
  );
}
