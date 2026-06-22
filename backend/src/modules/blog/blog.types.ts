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

export type CreateBlogPostInput = Omit<BlogPost, "id" | "criadoEm" | "atualizadoEm">;
export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;
