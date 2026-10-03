import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: path.resolve(projectRoot, ".."),
  },
  async redirects() {
    return [
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
