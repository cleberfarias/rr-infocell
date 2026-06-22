import { getFirestore } from "firebase-admin/firestore";

import type { BlogPost, CreateBlogPostInput, UpdateBlogPostInput } from "./blog.types.js";

const COLLECTION = "blog-posts";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const blogRepository = {
  async listPublished(): Promise<BlogPost[]> {
    const db = getFirestore();
    const snap = await db
      .collection(COLLECTION)
      .where("publicado", "==", true)
      .get();

    return snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<BlogPost, "id">) }))
      .sort((a, b) => (b.publicadoEm || "").localeCompare(a.publicadoEm || ""));
  },

  async listAll(): Promise<BlogPost[]> {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).orderBy("criadoEm", "desc").get();

    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<BlogPost, "id">) }));
  },

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).where("slug", "==", slug).limit(1).get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<BlogPost, "id">) };
  },

  async findById(id: string): Promise<BlogPost | null> {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Omit<BlogPost, "id">) };
  },

  async create(input: CreateBlogPostInput): Promise<BlogPost> {
    const db = getFirestore();
    const now = new Date().toISOString();
    const slug = input.slug || toSlug(input.titulo);

    const data = {
      ...input,
      slug,
      publicadoEm: input.publicado ? input.publicadoEm || now : undefined,
      criadoEm: now,
      atualizadoEm: now,
    };

    const ref = await db.collection(COLLECTION).add(data);
    return { id: ref.id, ...data } as BlogPost;
  },

  async update(id: string, input: UpdateBlogPostInput): Promise<BlogPost | null> {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION).doc(id);
    const existing = await docRef.get();

    if (!existing.exists) return null;

    const existingData = existing.data() as Omit<BlogPost, "id">;
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      ...input,
      atualizadoEm: now,
    };

    if (input.slug !== undefined) {
      updates.slug = input.slug || toSlug(input.titulo || existingData.titulo);
    }

    if (input.publicado && !existingData.publicado) {
      updates.publicadoEm = now;
    }

    await docRef.update(updates);

    const updated = await docRef.get();
    return { id: updated.id, ...(updated.data() as Omit<BlogPost, "id">) };
  },

  async remove(id: string): Promise<boolean> {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  },
};
