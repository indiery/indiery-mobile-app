import LegacyPage, { getLegacyMetadata } from "../../components/LegacyPage";

export const metadata = getLegacyMetadata("pricing.html");

export default function PricingCompatibilityPage() {
  return <LegacyPage source="pricing.html" />;
}
