import "./globals.css";

export const metadata = {
  title: {
    default: "Indiery | On-Demand Delivery & Shifting",
    template: "%s | Indiery",
  },
  description: "Book bikes, mini trucks, commercial vehicles, business deliveries, and local shifting with upfront fare estimates and live trip tracking.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
