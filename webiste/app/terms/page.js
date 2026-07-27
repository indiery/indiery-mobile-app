import { LegalPolicyPage } from "../_components/LegalPolicyPage";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply to customers and delivery partners using Indiery.",
};

export default function TermsPage() {
  return <LegalPolicyPage policyId="terms" />;
}
