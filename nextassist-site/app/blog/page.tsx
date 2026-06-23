import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog-api";

export const metadata: Metadata = {
  title: "Blog — NextAssist | Dicas para Assistência Técnica de Celular",
  description:
    "Artigos, dicas e tutoriais sobre gestão de assistência técnica de celular. Aprenda a organizar ordens de serviço, controlar estoque e vender mais.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — NextAssist",
    description:
      "Dicas e tutoriais para donos de assistência técnica de celular.",
    url: "https://www.nextassist-app.com.br/blog",
    type: "website",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <section className="blog-hero">
        <div className="section-center">
          <div className="blog-hero-actions">
            <Link href="/" className="blog-back">
              ← Voltar ao site
            </Link>
            <Link href="/admin/blog" className="blog-admin-link">
              Admin blog
            </Link>
          </div>
          <span className="section-tag">Blog</span>
          <h1>
            Dicas para sua <em>assistência técnica</em>
          </h1>
          <p className="section-sub">
            Artigos práticos sobre gestão, estoque, atendimento e tecnologia
            para lojas de celular.
          </p>
        </div>
      </section>

      <section className="blog-list-section">
        <div className="section-center">
          {posts.length === 0 ? (
            <div className="blog-empty">
              <p>Nenhum artigo publicado ainda. Volte em breve!</p>
            </div>
          ) : (
            <div className="blog-grid">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="blog-card"
                >
                  {post.imagemCapa && (
                    <div className="blog-card-img">
                      <img src={post.imagemCapa} alt={post.titulo} />
                    </div>
                  )}
                  <div className="blog-card-body">
                    {post.tags.length > 0 && (
                      <div className="blog-card-tags">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="blog-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2>{post.titulo}</h2>
                    <p>{post.resumo}</p>
                    <div className="blog-card-meta">
                      <span>{post.autor}</span>
                      <span>·</span>
                      <time dateTime={post.publicadoEm}>
                        {formatDate(post.publicadoEm!)}
                      </time>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
