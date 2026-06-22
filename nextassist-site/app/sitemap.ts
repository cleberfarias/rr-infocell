import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog-api";

const BASE_URL = "https://www.nextassist-app.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
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
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // API indisponível — retorna apenas páginas estáticas
  }

  return [...staticPages, ...blogPages];
}
