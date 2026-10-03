import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Booking Options",
  description: "Choose trip-based delivery, a business delivery account, or managed shifting with Indiery.",
};

const options = [
  {
    name: "Personal Delivery",
    price: "Fare by trip",
    description: "For parcels, purchases, furniture, appliances, and other one-time city deliveries.",
    features: ["Bike, mini truck, or commercial vehicle", "Upfront fare estimate", "Live trip tracking", "Doorstep pickup and drop"],
    action: "Book a delivery",
  },
  {
    name: "Business Account",
    price: "Based on usage",
    description: "For stores and teams that need recurring dispatches and simpler delivery coordination.",
    features: ["Recurring route support", "Priority vehicle allocation", "Multi-user booking", "Consolidated GST-ready billing"],
    action: "Discuss business needs",
    popular: true,
  },
  {
    name: "Managed Shifting",
    price: "Custom estimate",
    description: "For local home or office moves that need packing, handling, and transport support.",
    features: ["Move requirement assessment", "Packing material options", "Loading and unloading support", "Vehicle matched to your move"],
    action: "Plan my move",
  },
];

export default function PackagesPage() {
  return (
    <main>
      <SiteHeader active="packages" />
      <section className="pricingHero innerPageHero"><div className="shell"><h1>Choose how you want<br /><span>to move with Indiery.</span></h1><p>Pay for an individual trip, set up recurring business deliveries, or request a managed shifting estimate.</p></div></section>
      <section className="section pricingSection"><div className="shell pricingGrid">{options.map((option) => <article key={option.name} className={option.popular ? "popularPlan" : ""}>{option.popular && <em>For recurring deliveries</em>}<h2>{option.name}</h2><strong>{option.price}</strong><p>{option.description}</p><hr /><b>What it includes</b><ul>{option.features.map((item) => <li key={item}>✓ {item}</li>)}</ul><a className="solidButton" href="/contact">{option.action} ↗</a></article>)}</div></section>
      <SiteFooter />
    </main>
  );
}
