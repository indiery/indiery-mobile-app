import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Safety & Responsible Booking",
  description: "Learn how Indiery customers and partners can prepare for safer, smoother deliveries and moves.",
};

export default function SafetyPage() {
  return (
    <main>
      <SiteHeader />
      <section className="textHero innerPageHero"><div className="shell"><h1>Safer deliveries start with clear details</h1><p>Accurate information helps Indiery match the right vehicle, partner, and handling support to every booking.</p></div></section>
      <article className="legalBody">
        <h2>Prepare items for transport</h2><p>Pack items securely, label fragile goods, and share accurate dimensions and weight. Tell us before booking if an item needs special handling, stairs, loading help, or restricted access.</p>
        <h3>Choose the right service</h3><p>Use bike delivery for small parcels, a mini truck for medium loads, a commercial vehicle for larger goods, and managed shifting when packing or handling support is required.</p>
        <h3>Share complete pickup and drop details</h3><p>Provide working contact numbers, clear addresses, access instructions, and the correct delivery window. Follow the assigned partner in the live trip view and keep the receiving contact informed.</p>
        <h3>Restricted items</h3><p>Do not book illegal, hazardous, explosive, or prohibited goods. Contact Indiery support before booking if you are unsure whether an item can be carried safely.</p>
        <h3>Need help?</h3><p>Contact hello@indiery.in before confirming a booking if the load or access requirements are unusual.</p>
      </article>
      <SiteFooter />
    </main>
  );
}
