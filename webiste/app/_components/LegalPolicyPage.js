import { legalPolicies } from "../../../packages/shared/src/legal";

export function LegalPolicyPage({ policyId, eyebrow = "Legal" }) {
  const policy = legalPolicies.find((item) => item.id === policyId);

  if (!policy) {
    throw new Error(`Unknown legal policy: ${policyId}`);
  }

  return (
    <main className="legalPage">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{policy.title}</h1>
      <p className="updated">Last updated: {policy.updatedAt}</p>
      <p className="legalSummary">{policy.summary}</p>

      {policy.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
