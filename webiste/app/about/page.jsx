import LegacyPage, { getLegacyMetadata } from "../../components/LegacyPage";

export const metadata = getLegacyMetadata("about.html");

export default function AboutPage() {
  return <LegacyPage source="about.html" />;
}
