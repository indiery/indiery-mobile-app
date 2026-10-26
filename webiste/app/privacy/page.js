import { LegalPolicyPage } from "../_components/LegalPolicyPage";

export const metadata = {
  title: "Customer Privacy Policy",
  description:
    "How Indiery handles personal data in the customer app, website, delivery, payment, tracking, and support services.",
};

export default function PrivacyPage() {
  return <LegalPolicyPage policyId="privacy" />;
}
