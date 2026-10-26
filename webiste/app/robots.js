export const dynamic = "force-static";

export default function robots() {
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://www.indiery.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/admin"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
