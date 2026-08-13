import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site"

// Only public, indexable marketing/legal pages belong here. Authenticated app
// routes (dashboard, events, contacts, settings, billing) and auth screens are
// intentionally omitted — they're gated or low-value for search.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const now = new Date()

  const routes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/how-to", priority: 0.7, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" },
  ]

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
