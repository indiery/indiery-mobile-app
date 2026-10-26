import { LegalPolicyPage } from "../_components/LegalPolicyPage";

export const metadata = {
  title: "Refund and Cancellation Rules",
  description:
    "How Indiery cancellations, refunds, coins, waiting charges, and delivery disputes are handled.",
};

export default function RefundsPage() {
  return <LegalPolicyPage policyId="refunds" />;
}
