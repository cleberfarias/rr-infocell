export interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  imagemCapa?: string;
  autor: string;
  tags: string[];
  publicado: boolean;
  publicadoEm?: string;
  criadoEm: string;
  atualizadoEm: string;
  metaTitle?: string;
  metaDescription?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "https://rr-infocell-api-91248386036.southamerica-east1.run.app";
const LEGACY_REDIRECTED_SLUGS = new Set([
  "erros-gestao-estoque-pecas-celular",
]);

export async function getPublishedPosts(options?: { fresh?: boolean }): Promise<BlogPost[]> {
  const res = await fetch(
    `${API_URL}/blog/posts`,
    options?.fresh ? { cache: "no-store" } : { next: { revalidate: 60 } },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []).filter(
    (post: BlogPost) => !LEGACY_REDIRECTED_SLUGS.has(post.slug),
  );
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`${API_URL}/blog/posts/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}
