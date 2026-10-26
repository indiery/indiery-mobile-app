import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "How It Works | Indiery Logistics",
  description: "See how to book and track an Indiery delivery or goods transport service in Lucknow and on intercity corridors.",
};

const steps = [
  ["01", "Choose a Service & Vehicle", "Select bike delivery (20 kg), loader (90 kg), mini truck (500 kg or 750 kg), or commercial intercity freight."],
  ["02", "Add Pickup & Drop Details", "Enter accurate addresses in Lucknow or select intercity destinations, schedule, and cargo description."],
  ["03", "Review Upfront Fare", "Check the vehicle capacity and transparent distance-based fare before confirming your order in the Customer App."],
  ["04", "Live Track To Doorstep Drop", "Follow the verified independent partner in real time with live GPS tracking and secure OTP delivery."],
];

export default function HowItWorksPage() {
  return (
    <div className="innerHeader">
      <SiteHeader active="home" />
      <main>
        <section className="textHero innerPageHero" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)", color: "#FFFFFF", padding: "64px 0 80px" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <h1 style={{ fontSize: "44px", fontWeight: "800", color: "#FFFFFF" }}>Book With Indiery In Four Simple Steps</h1>
            <p style={{ color: "#E2E8F0", fontSize: "17px", maxWidth: "680px" }}>
              From a small urgent document to a commercial mini truck or full truck load intercity run, our booking and tracking flow is transparent and dependable.
            </p>
          </div>
        </section>
        <section className="section valuesSection" style={{ padding: "80px 0", background: "#FFFFFF" }}>
          <div className="shell" style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
            <div className="valueGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
              {steps.map(([number, title, body]) => (
                <article key={number} style={{ background: "#F8FAFC", padding: "30px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <b style={{ color: "#7C3AED", fontSize: "28px", fontWeight: "900", display: "block", marginBottom: "12px" }}>{number}</b>
                  <h3 style={{ fontSize: "19px", fontWeight: "800", color: "#0F172A", marginBottom: "10px" }}>{title}</h3>
                  <p style={{ color: "#475569", fontSize: "14.5px", lineHeight: "1.65", margin: 0 }}>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
