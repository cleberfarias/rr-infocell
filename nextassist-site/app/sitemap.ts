import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog-api";

const BASE_URL = "https://www.nextassist-app.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublishedPosts();
    blogPages = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.atualizadoEm || post.publicadoEm || post.criadoEm),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    // API indisponível — retorna apenas páginas estáticas
  }

  return [...staticPages, ...blogPages];
}
