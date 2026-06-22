import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/blog-api";

type Props = {
  params: Promise<{ slug: string }>;
};

function getPostKeywords(post: {
  titulo: string;
  slug: string;
  tags: string[];
}): string[] {
  const slugTerms = post.slug
    .split("-")
    .filter((term) => term.length > 2)
    .join(" ");

  return Array.from(
    new Set([
      post.titulo,
      ...post.tags,
      slugTerms,
      `${post.titulo} NextAssist`,
      "sistema para ordem de servico assistencia tecnica",
      "software para assistencia tecnica de celular",
    ]),
  ).filter(Boolean);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Artigo não encontrado — NextAssist" };
  }

  const title = post.metaTitle || `${post.titulo} — NextAssist Blog`;
  const description = post.metaDescription || post.resumo;
  const keywords = getPostKeywords(post);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `https://www.nextassist-app.com.br/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publicadoEm,
      authors: [post.autor],
      tags: post.tags,
      ...(post.imagemCapa && {
        images: [{ url: post.imagemCapa, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.imagemCapa && { images: [post.imagemCapa] }),
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.titulo,
    description: post.resumo,
    author: { "@type": "Person", name: post.autor },
    datePublished: post.publicadoEm,
    dateModified: post.atualizadoEm,
    publisher: {
      "@type": "Organization",
      name: "NextAssist",
      logo: {
        "@type": "ImageObject",
        url: "https://www.nextassist-app.com.br/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.nextassist-app.com.br/blog/${post.slug}`,
    },
    ...(post.imagemCapa && { image: post.imagemCapa }),
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="blog-article">
        <div className="blog-article-header">
          <div className="section-center">
            <Link href="/blog" className="blog-back">
              ← Voltar ao blog
            </Link>

            {post.tags.length > 0 && (
              <div className="blog-card-tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="blog-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1>{post.titulo}</h1>

            <div className="blog-article-meta">
              <span>{post.autor}</span>
              <span>·</span>
              <time dateTime={post.publicadoEm}>
                {formatDate(post.publicadoEm!)}
              </time>
            </div>
          </div>
        </div>

        {post.imagemCapa && (
          <div className="blog-article-cover section-center">
            <img src={post.imagemCapa} alt={post.titulo} />
          </div>
        )}

        <div className="blog-article-content section-center">
          <div dangerouslySetInnerHTML={{ __html: post.conteudo }} />
        </div>

        <div className="blog-article-footer section-center">
          <div className="blog-cta-box">
            <h3>
              Quer organizar sua assistência técnica?
            </h3>
            <p>
              Teste o NextAssist grátis por 7 dias. Sem cartão de crédito.
            </p>
            <Link href="/demo" className="btn-primary">
              Começar teste grátis →
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
