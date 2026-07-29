export const dynamic = "force-static";

export default function sitemap() {
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://www.indiery.com";

  return [
    { url: baseUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/partner-privacy`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/partner-terms`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/refunds`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/account-deletion`, changeFrequency: "yearly", priority: 0.6 },
  ];
}
