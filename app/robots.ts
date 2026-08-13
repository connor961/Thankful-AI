import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site"

// Allow crawling of public pages, but keep authenticated app routes, auth
// screens, and API endpoints out of search indexes.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/billing",
        "/contacts",
        "/settings",
        "/events",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
