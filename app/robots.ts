import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/features", "/pricing", "/faq"],
      disallow: ["/app/", "/admin/", "/api/"],
    },
    sitemap: "http://localhost:3000/sitemap.xml",
  };
}
