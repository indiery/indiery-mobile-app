import { partnerPrivacyPolicy } from "../../../packages/shared/src/legal";
import { LegalPolicyPage } from "../_components/LegalPolicyPage";

export const metadata = {
  title: "Driver Partner Privacy Policy",
  description:
    "How Indiery handles personal data when Driver Partners register, complete KYC, go online, deliver orders, receive earnings, and request payouts.",
};

export default function PartnerPrivacyPage() {
  return <LegalPolicyPage policy={partnerPrivacyPolicy} eyebrow="Driver Partner Legal" />;
}
