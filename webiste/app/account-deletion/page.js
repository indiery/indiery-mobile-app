export const metadata = {
  title: "Account Deletion",
  description: "How to request deletion of an Indiery account and associated data.",
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
        <h2>Request by email</h2>
        <ol className="steps">
          <li>Email <a href="mailto:support@indiery.in?subject=Indiery%20Account%20Deletion%20Request">support@indiery.in</a> from the address connected to your account.</li>
          <li>Use the subject “Indiery Account Deletion Request.”</li>
          <li>Include the phone number used for your Indiery account and state whether you use the customer or partner app.</li>
          <li>Complete any reasonable identity-verification step requested to protect your account.</li>
        </ol>
      </section>
      <section>
        <h2>What happens next</h2>
        <p>
          After verification, we will process the deletion request and remove
          or anonymize personal information that is no longer required. Some
          transaction or compliance records may be retained when required by
          law, for fraud prevention, dispute resolution, or legitimate
          accounting purposes.
        </p>
      </section>
      <a className="button primary" href="mailto:support@indiery.in?subject=Indiery%20Account%20Deletion%20Request">
        Request account deletion
      </a>
    </main>
  );
}
