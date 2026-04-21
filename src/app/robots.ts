import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ubeparipc.tech";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/wallet", "/orders", "/kyc"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
