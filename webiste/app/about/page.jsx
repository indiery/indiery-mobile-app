import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = { title: "About Indiery", description: "Indiery makes local delivery and shifting easier for households, businesses, and driver partners." };

export default function AboutPage() {
  return (
    <main><SiteHeader active="about" />
      <section className="aboutHero innerPageHero"><div className="aboutHeroWaves" /><div className="shell aboutHeroCard"><div className="aboutHeroCopy"><div className="tagPill"><i /> About us</div><h1>Local logistics&apos; future<br /><span>begins with us.</span></h1><p>Indiery is building a simpler way to move goods through India&apos;s cities—one reliable ride, clear price and verified partner at a time.</p></div><div className="aboutHeroMedia"><Image src="/assets/service-mini.jpg" alt="Cargo transport supported by Indiery" fill priority sizes="(max-width: 820px) 100vw, 50vw" /><button aria-label="Play our story">▶</button></div></div></section>
      <section className="section storySection"><div className="shell storyGrid"><div><div className="kicker"><i /> Our story</div><h2>Built for the way<br />India <span>really moves.</span></h2></div><div><p>Logistics should feel as easy as booking a ride. Indiery connects customers with bikes, mini trucks and trucks without confusing calls, uncertain rates or missing updates.</p><p>Every booking is backed by a verified driver partner, real-time tracking and support from pickup to delivery.</p></div></div></section>
      <section className="numbers"><div className="shell numberGrid"><div><strong>Bike</strong><span>Small parcel delivery</span></div><div><strong>Truck</strong><span>Goods transport</span></div><div><strong>Move</strong><span>Home and office shifting</span></div></div></section>
      <section className="section valuesSection"><div className="shell"><div className="sectionIntro centered"><div className="kicker"><i /> What guides us</div><h2>Reliable by default.<br /><span>Human at every step.</span></h2></div><div className="valueGrid"><article><b>01</b><h3>Clarity</h3><p>Upfront pricing and honest updates keep every delivery predictable.</p></article><article><b>02</b><h3>Care</h3><p>Your package, furniture or business stock is handled like it matters—because it does.</p></article><article><b>03</b><h3>Momentum</h3><p>We use technology to reduce waiting and keep cities and businesses moving.</p></article></div></div></section>
      <SiteFooter />
    </main>
  );
}
