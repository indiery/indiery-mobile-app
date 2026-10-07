import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "How It Works",
  description: "See how to book and track an Indiery delivery or shifting service.",
};

const steps = [
  ["01", "Choose a service", "Select bike delivery, mini truck, commercial truck, business delivery, or a managed move."],
  ["02", "Add your trip details", "Enter the pickup and drop addresses, schedule, item details, and any handling instructions."],
  ["03", "Review your fare", "Check the vehicle or service details and fare estimate before confirming the booking."],
  ["04", "Track until completion", "Follow the assigned partner and receive confirmation when your delivery or move is complete."],
];

export default function HowItWorksPage() {
  return (
    <main>
      <SiteHeader />
      <section className="textHero innerPageHero"><div className="shell"><h1>Book with Indiery in four simple steps</h1><p>From a small parcel to a complete local move, the booking flow stays clear.</p></div></section>
      <section className="section valuesSection"><div className="shell"><div className="valueGrid">{steps.map(([number, title, body]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
      <SiteFooter />
    </main>
  );
}
