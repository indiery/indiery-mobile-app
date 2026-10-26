import "./globals.css";

export const metadata = {
  title: {
    default: "Indiery | Technology-Driven Logistics Platform",
    template: "%s | Indiery",
  },
  description:
    "Indiery is a technology-driven logistics platform starting in Lucknow, connecting individuals and businesses with independent drivers and transport partners for local delivery, goods transport, and intercity logistics.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
