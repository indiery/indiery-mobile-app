import LegacyPage, { getLegacyMetadata } from "../../components/LegacyPage";

export const metadata = getLegacyMetadata("tanspot_index.html");

export default function TransportPage() {
  return <LegacyPage source="tanspot_index.html" />;
}
