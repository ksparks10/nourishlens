import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/features",
    "/pricing",
    "/faq",
    "/privacy",
    "/terms",
    "/contact",
    "/disclaimer",
  ].map((path) => ({
    url: `${env.NEXT_PUBLIC_APP_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.6,
  }));
}
