import LegacyPage, { getLegacyMetadata } from "../components/LegacyPage";

export const metadata = getLegacyMetadata("index.html");

export default function HomePage() {
  return <LegacyPage source="index.html" />;
}
