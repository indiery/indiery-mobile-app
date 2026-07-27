const deletionFormUrl =
  "https://indiery-mobile-app-bp9h.onrender.com/account-deletion";

export const metadata = {
  title: "Account Deletion",
  description:
    "Request deletion of an Indiery customer or partner account and learn what data is deleted or retained.",
};

export default function AccountDeletionPage() {
  return (
    <main className="legalPage">
      <p className="eyebrow">Account support</p>
      <h1>Delete your Indiery account</h1>
      <p className="updated">
        Customers and delivery partners can request deletion of their account
        and associated personal information.
      </p>

      <section>
        <h2>Request deletion</h2>
        <p>
          In either app, open <strong>Account</strong>, choose{" "}
          <strong>Delete account</strong>, review the information shown, and
          confirm the request.
        </p>
        <p>
          If you cannot sign in, use our secure public request form. Enter the
          mobile number connected to the account and state whether it is a
          customer or partner account. We may contact you to verify ownership.
        </p>
        <p>
          You can also email{" "}
          <a href="mailto:support@indiery.in?subject=Indiery%20Account%20Deletion%20Request">
            support@indiery.in
          </a>{" "}
          with the same details. Never send an OTP, PIN, password, CVV, or full
          card number.
        </p>
      </section>

      <section>
        <h2>What is deleted</h2>
        <p>
          After ownership verification, we process eligible requests without
          unreasonable delay. We delete or irreversibly de-identify account,
          profile, contact, device-token, and other personal data that is no
          longer required to operate the service or meet a legal obligation.
        </p>
        <p>
          Partner KYC and bank details, uploaded media, and operational location
          data are deleted or de-identified when they are no longer required
          for verification, payment, safety, dispute, fraud-prevention, or legal
          purposes.
        </p>
      </section>

      <section>
        <h2>What may be retained</h2>
        <p>
          Limited order, payment, refund, wallet, payout, tax, accounting,
          safety, fraud-prevention, audit, and dispute records may be retained
          for the period required by law or a documented operational need.
          Access is restricted to that purpose, and the data is deleted or
          de-identified when the need ends.
        </p>
        <p>
          Deleting the app from your phone does not delete your account. A
          submitted request is not completed until ownership is verified and
          the eligible deletion process finishes.
        </p>
      </section>

      <div className="legalActions">
        <a
          className="button primary"
          href={deletionFormUrl}
          rel="noopener noreferrer"
        >
          Open account-deletion form
        </a>
        <a className="button secondary" href="/privacy">
          Read the Privacy Policy
        </a>
      </div>
    </main>
  );
}
