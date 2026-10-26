import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Safety & Responsible Booking | Indiery Logistics",
  description: "Learn how Indiery customers, businesses, and driver partners ensure safe, responsible goods transportation.",
};

export default function SafetyPage() {
  return (
    <div className="innerHeader">
      <SiteHeader active="home" />
      <main>
        <section className="textHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <h1 style={{ fontSize: "44px", fontWeight: "800", color: "#FFFFFF" }}>Safety &amp; Responsible Goods Transport</h1>
            <p style={{ color: "#E2E8F0", fontSize: "17px", maxWidth: "680px" }}>
              Accurate cargo information helps Indiery match the right vehicle and verified transport partner to every booking.
            </p>
          </div>
        </section>
        <article className="legalBody" style={{ maxWidth: "860px", margin: "0 auto", padding: "60px 24px 80px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", marginBottom: "12px" }}>Prepare Goods for Transport</h2>
          <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", marginBottom: "24px" }}>
            Pack items securely in standard cartons or boxes, label fragile goods, and share accurate dimensions and weight. Inform the driver partner or logistics desk if an item requires special securing or forklift access.
          </p>

          <h3 style={{ fontSize: "19px", fontWeight: "800", color: "#0F172A", marginBottom: "12px" }}>Choose the Right Vehicle Category</h3>
          <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", marginBottom: "24px" }}>
            Use bike delivery for lightweight parcels up to 20 kg, a mini loader for up to 90 kg, a mini truck (500 kg or 750 kg Tata Ace) for bulky commercial goods, and commercial trucks for intercity full truck loads.
          </p>

          <h3 style={{ fontSize: "19px", fontWeight: "800", color: "#0F172A", marginBottom: "12px" }}>Share Complete Pickup and Drop Details</h3>
          <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", marginBottom: "24px" }}>
            Provide working phone numbers for both sender and recipient, landmark directions in Lucknow, and gate access information. Follow the assigned partner on the live map in the Customer App.
          </p>

          <h3 style={{ fontSize: "19px", fontWeight: "800", color: "#0F172A", marginBottom: "12px" }}>Restricted and Prohibited Goods</h3>
          <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", marginBottom: "24px" }}>
            Indiery strictly prohibits the transportation of illegal, hazardous, explosive, flammable, contraband, or unregistered chemicals. Any consignment violating motor vehicle or state regulations will be declined immediately.
          </p>

          <h3 style={{ fontSize: "19px", fontWeight: "800", color: "#0F172A", marginBottom: "12px" }}>Need Assistance?</h3>
          <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.75", margin: 0 }}>
            Contact our Lucknow operations desk at <a href="mailto:contact@indiery.com" style={{ color: "#7C3AED", fontWeight: "700" }}>contact@indiery.com</a> or call <a href="tel:+919264926552" style={{ color: "#7C3AED", fontWeight: "700" }}>+91 92649 26552</a> before booking if you have special cargo handling requirements.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
