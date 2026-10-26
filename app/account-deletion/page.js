import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const deletionFormUrl =
  "https://indiery-mobile-app-1.onrender.com/account-deletion";

export const metadata = {
  title: "Account Deletion | Indiery",
  description:
    "Request deletion of an Indiery customer or partner account and learn what data is deleted or retained.",
};

export default function AccountDeletionPage() {
  return (
    <div className="innerHeader">
      <SiteHeader active="home" />

      <main style={{ background: "#FFFFFF", padding: "60px 0 90px" }}>
        <div className="shell" style={{ maxWidth: "860px", margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "36px", paddingBottom: "20px", borderBottom: "1px solid #E2E8F0" }}>
            <Link href="/privacy" style={{ fontSize: "13px", fontWeight: "600", color: "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: "#F8FAFC" }}>
              Customer Privacy Policy
            </Link>
            <Link href="/terms" style={{ fontSize: "13px", fontWeight: "600", color: "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: "#F8FAFC" }}>
              Customer Terms &amp; Conditions
            </Link>
            <Link href="/partner-privacy" style={{ fontSize: "13px", fontWeight: "600", color: "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: "#F8FAFC" }}>
              Partner Privacy Policy
            </Link>
            <Link href="/account-deletion" style={{ fontSize: "13px", fontWeight: "600", color: "#7C3AED", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: "#EDE9FE" }}>
              Account Deletion
            </Link>
          </div>

          <p style={{ color: "#7C3AED", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            ACCOUNT SUPPORT
          </p>
          <h1 style={{ fontSize: "38px", fontWeight: "800", color: "#0F172A", margin: "0 0 12px" }}>
            Delete Your Indiery Account
          </h1>
          <p style={{ color: "#64748B", fontSize: "14px", margin: "0 0 32px" }}>
            Customers and independent delivery partners can request deletion of their account and associated personal data at any time.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <section style={{ borderBottom: "1px solid #F1F5F9", paddingBottom: "20px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>How to Request Deletion</h2>
              <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", margin: "0 0 10px" }}>
                1. <strong>Inside the Mobile App:</strong> Open the Indiery Customer App or Driver App, go to <strong>Account</strong> &gt; <strong>Delete Account</strong>, review the terms, and confirm.
              </p>
              <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", margin: "0 0 10px" }}>
                2. <strong>Via Email:</strong> Send an email from your registered address to <a href="mailto:contact@indiery.com?subject=Indiery%20Account%20Deletion%20Request" style={{ color: "#7C3AED", fontWeight: "700" }}>contact@indiery.com</a> stating your registered mobile number and account type (Customer or Driver Partner). Never share OTPs, passwords, or payment PINs.
              </p>
            </section>

            <section style={{ borderBottom: "1px solid #F1F5F9", paddingBottom: "20px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>What Data is Deleted</h2>
              <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", margin: 0 }}>
                Following ownership verification, we permanently delete or de-identify personal profile data, authentication secrets, saved addresses, device tokens, and uploaded documents not required for legal or financial accounting.
              </p>
            </section>

            <section style={{ borderBottom: "1px solid #F1F5F9", paddingBottom: "20px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>What May Be Retained</h2>
              <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", margin: 0 }}>
                Limited transaction records, tax invoices, completed order logs, dispute resolutions, and accounting ledgers may be retained for the minimum period mandated by Indian tax and commercial laws.
              </p>
            </section>
          </div>

          <div style={{ marginTop: "36px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <a
              href="mailto:contact@indiery.com?subject=Indiery%20Account%20Deletion%20Request"
              className="indiery-cta-btn"
              style={{ background: "#DC2626", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}
            >
              Email Deletion Request
            </a>
            <Link
              href="/privacy"
              className="indiery-cta-btn"
              style={{ background: "#F1F5F9", color: "#0F172A", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", textDecoration: "none" }}
            >
              Read Customer Privacy Policy
            </Link>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
