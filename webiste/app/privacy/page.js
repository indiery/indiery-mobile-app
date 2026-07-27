import { LegalPolicyPage } from "../_components/LegalPolicyPage";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Indiery and Indiery Partner access, collect, use, disclose, retain, protect, and delete user data.",
};

export default function PrivacyPage() {
  return <LegalPolicyPage policyId="privacy" />;
}
