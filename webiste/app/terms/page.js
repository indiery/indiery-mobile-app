import { LegalPolicyPage } from "../_components/LegalPolicyPage";

export const metadata = {
  title: "Customer Terms and Conditions",
  description:
    "The terms for customer accounts, delivery bookings, payments, tracking, cancellations, and use of Indiery.",
};

export default function TermsPage() {
  return <LegalPolicyPage policyId="terms" />;
}
