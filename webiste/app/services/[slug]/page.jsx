import LegacyPage, { getLegacyMetadata } from "../../../components/LegacyPage";

export const metadata = getLegacyMetadata("services.html");

export function generateStaticParams() {
  return [
    "bike-delivery",
    "mini-truck",
    "commercial-truck",
    "house-shifting",
    "business-delivery",
    "driver-partners",
  ].map((slug) => ({ slug }));
}

export default function ServicePage() {
  return <LegacyPage source="services.html" />;
}
