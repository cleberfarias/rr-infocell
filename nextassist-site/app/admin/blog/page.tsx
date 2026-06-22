"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

interface BlogPost {
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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://rr-infocell-api-1016213438985.southamerica-east1.run.app";

function AdminBlogPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const tokenRef = useRef("");

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    slug: "",
    resumo: "",
    conteudo: "",
    imagemCapa: "",
    tags: "",
    publicado: false,
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        tokenRef.current = await firebaseUser.getIdToken();
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRef.current}`,
    }),
    [],
  );

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/blog/admin/posts`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error("Falha ao carregar posts");
      const json = await res.json();
      setPosts(json.data ?? []);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar artigos.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (user) loadPosts();
  }, [user, loadPosts]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch {
      setLoginError("Email ou senha incorretos.");
    } finally {
      setAuthLoading(false);
    }
  }

  function resetForm() {
    setForm({
      titulo: "",
      slug: "",
      resumo: "",
      conteudo: "",
      imagemCapa: "",
      tags: "",
      publicado: false,
      metaTitle: "",
      metaDescription: "",
    });
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(post: BlogPost) {
    setForm({
      titulo: post.titulo,
      slug: post.slug,
      resumo: post.resumo,
      conteudo: post.conteudo,
      imagemCapa: post.imagemCapa || "",
      tags: post.tags.join(", "),
      publicado: post.publicado,
      metaTitle: post.metaTitle || "",
      metaDescription: post.metaDescription || "",
    });
    setEditing(post);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = {
      titulo: form.titulo,
      slug: form.slug,
      resumo: form.resumo,
      conteudo: form.conteudo,
      imagemCapa: form.imagemCapa || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      publicado: form.publicado,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
    };

    try {
      const url = editing
        ? `${API_URL}/blog/admin/posts/${editing.id}`
        : `${API_URL}/blog/admin/posts`;

      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Erro ao salvar");
      }

      resetForm();
      await loadPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar artigo");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este artigo?")) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/blog/admin/posts/${id}`, {
        method: "DELETE",
        headers: headers(),
      });

      if (!res.ok) throw new Error("Erro ao excluir");
      await loadPosts();
    } catch {
      alert("Erro ao excluir artigo");
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(post: BlogPost) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/blog/admin/posts/${post.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ publicado: !post.publicado }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar");
      await loadPosts();
    } catch {
      alert("Erro ao alterar publicação");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading && !user) {
    return (
      <div className="admin-page">
        <div className="admin-login-card">
          <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div className="admin-login-card">
          <Link href="/" className="blog-back">
            ← Voltar ao site
          </Link>
          <h1>Admin Blog</h1>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            Entre com seu email e senha para gerenciar o blog.
          </p>
          {loginError && (
            <div className="demo-error" style={{ marginBottom: "1rem" }}>
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={authLoading} style={{ width: "100%" }}>
              {authLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <Link href="/" className="blog-back">
              ← Voltar ao site
            </Link>
            <h1>Gerenciar Blog</h1>
          </div>
          <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
            <button
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              + Novo artigo
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: ".8rem", padding: ".5rem 1rem" }}
              onClick={() => signOut(getFirebaseAuth())}
            >
              Sair
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="admin-form">
            <h2>{editing ? "Editar artigo" : "Novo artigo"}</h2>

            <div className="admin-form-grid">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Título *</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Slug (gerado automaticamente se vazio)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="como-organizar-ordens-de-servico"
                />
              </div>

              <div className="form-group">
                <label>Tags (separadas por vírgula)</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="gestão, estoque, dicas"
                />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Resumo</label>
                <textarea
                  value={form.resumo}
                  onChange={(e) => setForm({ ...form, resumo: e.target.value })}
                  rows={2}
                  placeholder="Breve descrição do artigo para listagem e SEO"
                />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Conteúdo (HTML) *</label>
                <textarea
                  value={form.conteudo}
                  onChange={(e) =>
                    setForm({ ...form, conteudo: e.target.value })
                  }
                  rows={15}
                  required
                  placeholder="<h2>Subtítulo</h2><p>Conteúdo do artigo...</p>"
                />
              </div>

              <div className="form-group">
                <label>URL da imagem de capa</label>
                <input
                  value={form.imagemCapa}
                  onChange={(e) =>
                    setForm({ ...form, imagemCapa: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label>Meta Title (SEO)</label>
                <input
                  value={form.metaTitle}
                  onChange={(e) =>
                    setForm({ ...form, metaTitle: e.target.value })
                  }
                  placeholder="Título customizado para Google"
                />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Meta Description (SEO)</label>
                <input
                  value={form.metaDescription}
                  onChange={(e) =>
                    setForm({ ...form, metaDescription: e.target.value })
                  }
                  placeholder="Descrição customizada para Google (até 160 caracteres)"
                />
              </div>

              <div className="form-group">
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={form.publicado}
                    onChange={(e) =>
                      setForm({ ...form, publicado: e.target.checked })
                    }
                  />
                  <span>Publicar imediatamente</span>
                </label>
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Salvando..." : editing ? "Salvar alterações" : "Criar artigo"}
              </button>
            </div>
          </form>
        )}

        {loading && !showForm && (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
            Carregando...
          </p>
        )}

        {!loading && posts.length === 0 && !showForm && (
          <div className="blog-empty">
            <p>Nenhum artigo criado. Clique em &quot;+ Novo artigo&quot; para começar.</p>
          </div>
        )}

        {posts.length > 0 && (
          <div className="admin-posts-list">
            {posts.map((post) => (
              <div key={post.id} className="admin-post-item">
                <div className="admin-post-info">
                  <div className="admin-post-status">
                    <span
                      className={`admin-status-dot ${post.publicado ? "published" : "draft"}`}
                    />
                    <span className="admin-status-text">
                      {post.publicado ? "Publicado" : "Rascunho"}
                    </span>
                  </div>
                  <h3>{post.titulo}</h3>
                  <p>{post.resumo}</p>
                  {post.tags.length > 0 && (
                    <div className="blog-card-tags" style={{ marginTop: ".5rem" }}>
                      {post.tags.map((tag) => (
                        <span key={tag} className="blog-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-post-actions">
                  {post.publicado && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: ".8rem", padding: ".4rem .8rem" }}
                    >
                      Ver
                    </a>
                  )}
                  <button
                    className="btn-secondary"
                    style={{ fontSize: ".8rem", padding: ".4rem .8rem" }}
                    onClick={() => togglePublish(post)}
                  >
                    {post.publicado ? "Despublicar" : "Publicar"}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: ".8rem", padding: ".4rem .8rem" }}
                    onClick={() => startEdit(post)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-secondary"
                    style={{
                      fontSize: ".8rem",
                      padding: ".4rem .8rem",
                      borderColor: "#ef4444",
                      color: "#ef4444",
                    }}
                    onClick={() => handleDelete(post.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminBlogPage;
