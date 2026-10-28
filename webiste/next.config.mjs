import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const backendOrigin = (
  process.env.INDIERY_BACKEND_ORIGIN
  || (process.env.NODE_ENV === "production"
    ? "https://indiery-mobile-app-1.onrender.com"
    : "http://127.0.0.1:4000")
).replace(/\/+$/, "");

const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/adnin/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
      { source: "/services.html", destination: "/services", permanent: true },
      { source: "/pricing.html", destination: "/plans-eccomerce", permanent: true },
      { source: "/contact.html", destination: "/contact", permanent: true },
      { source: "/blog.html", destination: "/news", permanent: true },
      { source: "/faq.html", destination: "/contact#faq", permanent: true },
      { source: "/team.html", destination: "/about", permanent: true },
      { source: "/tanspot_index.html", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
