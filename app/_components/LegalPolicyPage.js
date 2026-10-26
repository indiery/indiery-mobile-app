import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { legalPolicies } from "../../packages/shared/src/legal";

export function LegalPolicyPage({ policyId, policy: providedPolicy, eyebrow = "Legal Policy" }) {
  const policy = providedPolicy ?? legalPolicies.find((item) => item.id === policyId);

  if (!policy) {
    throw new Error(`Unknown legal policy: ${policyId}`);
  }

  return (
    <div className="innerHeader">
      <SiteHeader active="home" />

      <main style={{ background: "#FFFFFF", padding: "60px 0 90px" }}>
        <div className="shell" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
          
          {/* Quick Legal Sub-Navigation */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "36px", paddingBottom: "20px", borderBottom: "1px solid #E2E8F0" }}>
            <Link href="/privacy" style={{ fontSize: "13px", fontWeight: "600", color: policyId === "privacy" ? "#7C3AED" : "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: policyId === "privacy" ? "#EDE9FE" : "#F8FAFC" }}>
              Customer Privacy Policy
            </Link>
            <Link href="/terms" style={{ fontSize: "13px", fontWeight: "600", color: policyId === "terms" ? "#7C3AED" : "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: policyId === "terms" ? "#EDE9FE" : "#F8FAFC" }}>
              Customer Terms &amp; Conditions
            </Link>
            <Link href="/refunds" style={{ fontSize: "13px", fontWeight: "600", color: policyId === "refunds" ? "#7C3AED" : "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: policyId === "refunds" ? "#EDE9FE" : "#F8FAFC" }}>
              Cancellation &amp; Refund Policy
            </Link>
            <Link href="/partner-privacy" style={{ fontSize: "13px", fontWeight: "600", color: eyebrow.includes("Partner") && policy.title.includes("Privacy") ? "#7C3AED" : "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: eyebrow.includes("Partner") && policy.title.includes("Privacy") ? "#EDE9FE" : "#F8FAFC" }}>
              Partner Privacy Policy
            </Link>
            <Link href="/partner-terms" style={{ fontSize: "13px", fontWeight: "600", color: eyebrow.includes("Partner") && policy.title.includes("Terms") ? "#7C3AED" : "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: eyebrow.includes("Partner") && policy.title.includes("Terms") ? "#EDE9FE" : "#F8FAFC" }}>
              Partner Terms
            </Link>
            <Link href="/account-deletion" style={{ fontSize: "13px", fontWeight: "600", color: "#64748B", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: "#F8FAFC" }}>
              Account Deletion
            </Link>
          </div>

          <p style={{ color: "#7C3AED", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            {eyebrow}
          </p>
          <h1 style={{ fontSize: "38px", fontWeight: "800", color: "#0F172A", margin: "0 0 12px", lineHeight: "1.2" }}>
            {policy.title}
          </h1>
          <p style={{ color: "#64748B", fontSize: "13.5px", margin: "0 0 20px" }}>
            Last updated: {policy.updatedAt} · Headquarters: Devpur, Rajajipuram, Lucknow
          </p>

          <div style={{ background: "#F8FAFC", borderLeft: "4px solid #7C3AED", padding: "16px 20px", borderRadius: "0 10px 10px 0", marginBottom: "40px", color: "#334155", fontSize: "15px", lineHeight: "1.7" }}>
            {policy.summary}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {policy.sections.map((section) => (
              <section key={section.heading} style={{ borderBottom: "1px solid #F1F5F9", paddingBottom: "24px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0F172A", margin: "0 0 14px" }}>
                  {section.heading}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {section.body.map((paragraph, pIdx) => (
                    <p key={pIdx} style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", margin: 0 }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Contact Support for Legal Questions */}
          <div style={{ marginTop: "48px", padding: "24px", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0F172A", margin: "0 0 8px" }}>Questions about these policies?</h3>
            <p style={{ color: "#64748B", fontSize: "14px", lineHeight: "1.6", margin: "0 0 12px" }}>
              For privacy requests, legal clarifications, or grievances, contact our compliance team:
            </p>
            <div style={{ fontSize: "13.5px", color: "#334155" }}>
              Email: <a href="mailto:contact@indiery.com" style={{ color: "#7C3AED", fontWeight: "700" }}>contact@indiery.com</a> · Phone: <a href="tel:+919264926552" style={{ color: "#7C3AED", fontWeight: "700" }}>+91 92649 26552</a>
            </div>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
