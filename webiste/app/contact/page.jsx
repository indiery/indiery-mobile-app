import LegacyPage, { getLegacyMetadata } from "../../components/LegacyPage";

export const metadata = getLegacyMetadata("contact.html");

export default function ContactPage() {
  return <LegacyPage source="contact.html" />;
}
