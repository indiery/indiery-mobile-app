import LegacyPage, { getLegacyMetadata } from "../../components/LegacyPage";

export const metadata = getLegacyMetadata("services.html");

export default function ServicesPage() {
  return <LegacyPage source="services.html" />;
}
