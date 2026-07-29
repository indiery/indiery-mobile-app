import { partnerTermsPolicy } from "../../../packages/shared/src/legal";
import { LegalPolicyPage } from "../_components/LegalPolicyPage";

export const metadata = {
  title: "Driver Partner Terms and Conditions",
  description:
    "The terms for Driver Partner registration, KYC, deliveries, safety, earnings, wallet settlement, cancellations, and payouts on Indiery.",
};

export default function PartnerTermsPage() {
  return <LegalPolicyPage policy={partnerTermsPolicy} eyebrow="Driver Partner Legal" />;
}
