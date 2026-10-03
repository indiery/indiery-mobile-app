import LegacyPage, { getLegacyMetadata } from "../../components/LegacyPage";

export const metadata = getLegacyMetadata("pricing.html");

export default function PricingPage() {
  return <LegacyPage source="pricing.html" />;
}
