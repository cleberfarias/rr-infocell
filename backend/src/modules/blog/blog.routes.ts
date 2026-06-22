import { Router } from "express";
import cors from "cors";

import { requireAuth, requireRole, type AuthenticatedRequest } from "../../middlewares/auth.js";
import { blogRepository } from "./blog.repository.js";

export const blogRoutes = Router();

blogRoutes.use(cors({ origin: "*" }));
blogRoutes.options("*", cors({ origin: "*" }));

// ── Rotas PÚBLICAS (sem auth) ──

blogRoutes.get("/posts", async (_req, res, next) => {
  try {
    const posts = await blogRepository.listPublished();
    res.json({ data: posts });
  } catch (error) {
    next(error);
  }
});

blogRoutes.get("/posts/:slug", async (req, res, next) => {
  try {
    const post = await blogRepository.findBySlug(req.params.slug);
    if (!post || !post.publicado) {
      res.status(404).json({ error: { message: "Artigo não encontrado." } });
      return;
    }
    res.json({ data: post });
  } catch (error) {
    next(error);
  }
});

// ── Rotas ADMIN (auth + role admin) ──

blogRoutes.use(requireAuth);
blogRoutes.use(requireRole("admin"));

blogRoutes.get("/admin/posts", async (_req, res, next) => {
  try {
    const posts = await blogRepository.listAll();
    res.json({ data: posts });
  } catch (error) {
    next(error);
  }
});

blogRoutes.get("/admin/posts/:id", async (req, res, next) => {
  try {
    const post = await blogRepository.findById(req.params.id);
    if (!post) {
      res.status(404).json({ error: { message: "Artigo não encontrado." } });
      return;
    }
    res.json({ data: post });
  } catch (error) {
    next(error);
  }
});

blogRoutes.post("/admin/posts", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { titulo, resumo, conteudo, imagemCapa, tags, publicado, slug, metaTitle, metaDescription } = req.body;

    if (!titulo?.trim() || !conteudo?.trim()) {
      res.status(400).json({ error: { message: "Título e conteúdo são obrigatórios." } });
      return;
    }

    const post = await blogRepository.create({
      titulo: titulo.trim(),
      slug: slug?.trim() || "",
      resumo: resumo?.trim() || "",
      conteudo: conteudo.trim(),
      imagemCapa: imagemCapa?.trim() || undefined,
      autor: req.user?.name || "NextAssist",
      tags: tags || [],
      publicado: publicado ?? false,
      metaTitle: metaTitle?.trim() || undefined,
      metaDescription: metaDescription?.trim() || undefined,
    });

    res.status(201).json({ data: post });
  } catch (error) {
    next(error);
  }
});

blogRoutes.put("/admin/posts/:id", async (req, res, next) => {
  try {
    const post = await blogRepository.update(req.params.id, req.body);
    if (!post) {
      res.status(404).json({ error: { message: "Artigo não encontrado." } });
      return;
    }
    res.json({ data: post });
  } catch (error) {
    next(error);
  }
});

blogRoutes.delete("/admin/posts/:id", async (req, res, next) => {
  try {
    const removed = await blogRepository.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: { message: "Artigo não encontrado." } });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
