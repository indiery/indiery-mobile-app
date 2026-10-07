import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = { title: "Checkout — Indiery" };
export default function CheckoutPage() {
  return <main><SiteHeader /><section className="emptyCheckout innerPageHero"><div><span>✓</span><h1>Your plan starts with a conversation.</h1><p>Business plans are configured around your routes and volume. Request a quote and our team will prepare the right account.</p><a className="solidButton" href="/contact">Request a quote ↗</a></div></section><SiteFooter /></main>;
}
