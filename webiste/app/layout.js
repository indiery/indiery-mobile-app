import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://indiery.in";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Indiery — Local delivery made simple",
    template: "%s | Indiery",
  },
  description:
    "Indiery connects customers with delivery partners for simple, reliable local deliveries.",
  applicationName: "Indiery",
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <a className="brand" href="/" aria-label="Indiery home">
            <img
              className="brandLogo"
              src="/indiery-logo.png"
              alt="Indiery"
              width="786"
              height="247"
            />
          </a>
          <nav aria-label="Main navigation">
            <a href="/#how-it-works">How it works</a>
            <a href="/#customers">Customers</a>
            <a href="/#partners">Partners</a>
            <a className="headerCta" href="mailto:support@indiery.in">Get support</a>
          </nav>
        </header>
        {children}
        <footer>
          <div>
            <a className="brand footerBrand" href="/">
              <img
                className="brandLogo"
                src="/indiery-logo.png"
                alt="Indiery"
                width="786"
                height="247"
              />
            </a>
            <p>Simple, reliable local delivery.</p>
          </div>
          <div className="footerLinks">
            <a href="/privacy">Privacy policy</a>
            <a href="/account-deletion">Account deletion</a>
            <a href="mailto:support@indiery.in">support@indiery.in</a>
          </div>
          <p className="copyright">© {new Date().getFullYear()} Indiery. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
