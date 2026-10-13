import LegacyPage, { getLegacyMetadata } from "../../components/LegacyPage";

export const metadata = getLegacyMetadata("services.html");

export default function TransportPage() {
  return <LegacyPage source="services.html" />;
}
